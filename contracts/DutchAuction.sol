// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint64, ebool, externalEuint64 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IERC7984.sol";

/**
 * @title DutchAuction
 * @notice A sealed-bid, single-price Dutch auction using Zama fhEVM (v0.11+)
 *         for confidential bid quantities. Anyone can create an auction for
 *         any ERC-20 token via the AuctionFactory.
 *
 * KEY DESIGN INVARIANT:
 *   `totalSupply`      = wei amount of tokenToSell (used for ERC-20 transfers)
 *   `totalSupplyUnits` = whole-token count (used for FHE euint64 comparisons)
 *   Bid quantities are encrypted as whole tokens to match `totalSupplyUnits`.
 *
 * Lifecycle:
 *   1. Creator deposits `tokenToSell` and sets parameters.
 *   2. Bidders submit bids: price is public (in paymentToken wei), quantity is
 *      encrypted as whole tokens (euint64).
 *   3. After the auction ends, the owner triggers clearing price calculation.
 *   4. Clearing price is revealed via FHE.makePubliclyDecryptable + Gateway.
 *   5. Bidders claim tokens / refunds.
 */
contract DutchAuction is ZamaEthereumConfig, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ---------------------------------------------------------------
    //  Types
    // ---------------------------------------------------------------

    enum Phase {
        Bidding,        // bids accepted
        Calculating,    // clearing price being computed
        Revealing,      // waiting for Gateway decryption callback
        Claiming        // clearing price known, claims open
    }

    struct Bid {
        uint256 price;          // public price per token (in paymentToken wei, e.g. USDC with 6 dec)
        euint64 encQuantity;    // encrypted quantity in WHOLE TOKENS (not wei)
        euint64 encCost;        // encrypted total cost in paymentToken wei
    }

    // ---------------------------------------------------------------
    //  State
    // ---------------------------------------------------------------

    IERC20   public immutable tokenToSell;
    IERC7984 public immutable paymentToken;      // confidential ERC-7984 wrapper
    uint8   public immutable tokenDecimals;     // decimals of tokenToSell (for display)
    uint256 public immutable totalSupply;       // wei amount of tokens available for sale
    uint64  public immutable totalSupplyUnits;  // whole-token count (fits in euint64, used for FHE)
    uint256 public immutable floorPrice;        // minimum bid price (in paymentToken wei)
    uint256 public immutable startTime;
    uint256 public immutable endTime;

    Phase public phase;

    // All unique price points that received at least one bid
    uint256[] public pricePoints;
    mapping(uint256 => bool) public pricePointExists;

    // Aggregate encrypted demand at each price point (in whole tokens)
    mapping(uint256 => euint64) internal _demandAtPrice;

    // Per-user bids
    mapping(address => Bid[]) internal _userBids;

    // Encrypted calculation results
    euint64 public encClearingPrice;
    euint64 public encDemandAboveClearing;
    euint64 public encDemandAtClearing;

    // Clearing price and demand (set after Coprocessor callback)
    uint256 public clearingPrice;
    uint64  public demandAboveClearing;  // whole tokens
    uint64  public demandAtClearing;     // whole tokens

    struct ClaimRequest {
        bool isPending;
        bool isDecrypted;
        euint64 encAllocation; // whole tokens (needs Coprocessor decryption)
        uint256 allocation;   // decrypted whole tokens
        euint64 encRefund;    // paymentToken wei (remains encrypted!)
    }

    mapping(address => ClaimRequest) public claimRequests;
    // Track outstanding claims so creator can't sweep revenue mid-flight
    uint256 public pendingClaimsCount;

    // ---------------------------------------------------------------
    //  Events
    // ---------------------------------------------------------------

    event BidPlaced(address indexed bidder, uint256 price, uint256 bidIndex);
    event BidCancelled(address indexed bidder, uint256 bidIndex);
    event ClearingPriceRequested();
    event ClearingPriceRevealed(uint256 clearingPrice);
    event ClaimRequested(address indexed bidder);
    event TokensClaimed(address indexed bidder, uint256 tokenAmount, uint256 refund);

    // ---------------------------------------------------------------
    //  Errors
    // ---------------------------------------------------------------

    error AuctionNotActive();
    error AuctionNotEnded();
    error PriceBelowFloor();
    error InvalidPhase(Phase expected, Phase actual);
    error AlreadyClaimed();
    error NoBids();

    // ---------------------------------------------------------------
    //  Constructor
    // ---------------------------------------------------------------

    constructor(
        address _tokenToSell,
        address _paymentToken,
        uint8   _tokenDecimals,
        uint256 _totalSupply,
        uint64  _totalSupplyUnits,
        uint256 _floorPrice,
        uint256 _startTime,
        uint256 _endTime,
        address _owner
    ) Ownable(_owner) {
        tokenToSell       = IERC20(_tokenToSell);
        paymentToken      = IERC7984(_paymentToken);
        tokenDecimals     = _tokenDecimals;
        totalSupply       = _totalSupply;
        totalSupplyUnits  = _totalSupplyUnits;
        floorPrice        = _floorPrice;
        startTime         = _startTime;
        endTime           = _endTime;
        phase             = Phase.Bidding;
    }

    // ---------------------------------------------------------------
    //  Modifiers
    // ---------------------------------------------------------------

    modifier onlyPhase(Phase expected) {
        if (phase != expected) revert InvalidPhase(expected, phase);
        _;
    }

    modifier onlyDuringAuction() {
        if (block.timestamp < startTime || block.timestamp > endTime)
            revert AuctionNotActive();
        _;
    }

    modifier onlyAfterAuction() {
        if (block.timestamp <= endTime) revert AuctionNotEnded();
        _;
    }

    // ---------------------------------------------------------------
    //  Bidding
    // ---------------------------------------------------------------

    /**
     * @notice Place a bid with a public price and encrypted quantity.
     * @param price        The price per token (public, in paymentToken wei).
     * @param inputHandle  The encrypted quantity handle (in WHOLE TOKENS).
     * @param inputProof   The ZK proof for the encrypted input.
     */
    function submitBid(
        uint256 price,
        externalEuint64 inputHandle,
        bytes calldata inputProof
    )
        external
        onlyPhase(Phase.Bidding)
        onlyDuringAuction
    {
        if (price < floorPrice) revert PriceBelowFloor();

        // Decode user-encrypted quantity
        euint64 encQty = FHE.fromExternal(inputHandle, inputProof);
        FHE.allowThis(encQty);
        FHE.allow(encQty, msg.sender);

        // Update aggregate demand at this price point
        if (!pricePointExists[price]) {
            pricePoints.push(price);
            pricePointExists[price] = true;
            _demandAtPrice[price] = encQty;
        } else {
            _demandAtPrice[price] = FHE.add(_demandAtPrice[price], encQty);
        }
        FHE.allowThis(_demandAtPrice[price]);

        // Securely calculate total cost and transfer from bidder confidentially
        euint64 encCost = FHE.mul(encQty, uint64(price));
        FHE.allowThis(encCost);
        FHE.allow(encCost, msg.sender);
        FHE.allow(encCost, address(paymentToken));
        
        // Pull payment from bidder into escrow (requires frontend to have called setOperator)
        paymentToken.confidentialTransferFrom(msg.sender, address(this), encCost);

        uint256 bidIndex = _userBids[msg.sender].length;
        _userBids[msg.sender].push(Bid({
            price: price,
            encQuantity: encQty,
            encCost: encCost
        }));

        emit BidPlaced(msg.sender, price, bidIndex);
    }

    /**
     * @notice Cancel an existing bid (only during bidding phase).
     */
    function cancelBid(uint256 bidIndex)
        external
        onlyPhase(Phase.Bidding)
        onlyDuringAuction
    {
        Bid storage bid = _userBids[msg.sender][bidIndex];
        require(FHE.isInitialized(bid.encQuantity), "Bid already cancelled");

        _demandAtPrice[bid.price] = FHE.sub(
            _demandAtPrice[bid.price],
            bid.encQuantity
        );
        FHE.allowThis(_demandAtPrice[bid.price]);

        euint64 refundCost = bid.encCost;

        // Zero out the bid so requestClaim skips it (0 qty → 0 allocation/refund)
        euint64 zeroed = FHE.asEuint64(0);
        FHE.allowThis(zeroed);
        bid.encQuantity = zeroed;
        bid.encCost     = zeroed;

        FHE.allow(refundCost, address(paymentToken));
        paymentToken.confidentialTransfer(msg.sender, refundCost);

        emit BidCancelled(msg.sender, bidIndex);
    }

    // ---------------------------------------------------------------
    //  Clearing Price Calculation
    // ---------------------------------------------------------------

    /**
     * @notice Trigger the clearing price calculation after auction ends.
     *         The owner must provide the price points sorted descending.
     * @param sortedPricesDesc Price points sorted from highest to lowest.
     */
    function calculateClearingPrice(uint256[] calldata sortedPricesDesc)
        external
        onlyOwner
        onlyPhase(Phase.Bidding)
        onlyAfterAuction
    {
        // Allowed to be empty if there are no bids
        // require(sortedPricesDesc.length > 0, "No price points");

        euint64 cumulativeDemand  = FHE.asEuint64(0);
        // Use totalSupplyUnits (whole tokens) — safe for euint64
        euint64 encSupply         = FHE.asEuint64(totalSupplyUnits);
        FHE.allowThis(encSupply);

        encClearingPrice         = FHE.asEuint64(uint64(floorPrice));
        FHE.allowThis(encClearingPrice);
        encDemandAboveClearing   = FHE.asEuint64(0);
        FHE.allowThis(encDemandAboveClearing);
        encDemandAtClearing      = FHE.asEuint64(0);
        FHE.allowThis(encDemandAtClearing);

        ebool found = FHE.asEbool(false);
        FHE.allowThis(found);

        for (uint256 i = 0; i < sortedPricesDesc.length; i++) {
            uint256 p = sortedPricesDesc[i];
            require(pricePointExists[p], "Unknown price point");

            euint64 d_p = _demandAtPrice[p];
            euint64 newCumulativeDemand = FHE.add(cumulativeDemand, d_p);
            FHE.allowThis(newCumulativeDemand);

            ebool exceeds = FHE.ge(newCumulativeDemand, encSupply);
            ebool isNewClearingPoint = FHE.and(exceeds, FHE.not(found));

            encClearingPrice = FHE.select(
                isNewClearingPoint,
                FHE.asEuint64(uint64(p)),
                encClearingPrice
            );
            FHE.allowThis(encClearingPrice);

            encDemandAboveClearing = FHE.select(
                isNewClearingPoint,
                cumulativeDemand,
                encDemandAboveClearing
            );
            FHE.allowThis(encDemandAboveClearing);

            encDemandAtClearing = FHE.select(
                isNewClearingPoint,
                d_p,
                encDemandAtClearing
            );
            FHE.allowThis(encDemandAtClearing);

            found = FHE.or(found, exceeds);
            FHE.allowThis(found);

            cumulativeDemand = newCumulativeDemand;
        }

        FHE.makePubliclyDecryptable(encClearingPrice);
        FHE.makePubliclyDecryptable(encDemandAboveClearing);
        FHE.makePubliclyDecryptable(encDemandAtClearing);

        phase = Phase.Revealing;
        emit ClearingPriceRequested();
    }

    /**
     * @notice Coprocessor callback to set the decrypted clearing price.
     *         Values are verified using KMS decryption proof.
     */
    function onClearingPriceDecrypted(
        bytes calldata abiEncodedCleartexts,
        bytes calldata decryptionProof
    )
        external
        onlyOwner
        onlyPhase(Phase.Revealing)
    {
        bytes32[] memory handles = new bytes32[](3);
        handles[0] = FHE.toBytes32(encClearingPrice);
        handles[1] = FHE.toBytes32(encDemandAboveClearing);
        handles[2] = FHE.toBytes32(encDemandAtClearing);

        FHE.checkSignatures(handles, abiEncodedCleartexts, decryptionProof);

        (uint64 _clearingPrice, uint64 _demandAbove, uint64 _demandAt) = 
            abi.decode(abiEncodedCleartexts, (uint64, uint64, uint64));

        clearingPrice        = _clearingPrice;
        demandAboveClearing  = _demandAbove;
        demandAtClearing     = _demandAt;
        phase = Phase.Claiming;
        emit ClearingPriceRevealed(_clearingPrice);
    }

    // ---------------------------------------------------------------
    //  Claiming
    // ---------------------------------------------------------------

    /**
     * @notice Initiate a claim. Computes pro-rata allocation via FHE.
     *         All quantities are in WHOLE TOKENS.
     */
    function requestClaim() external onlyPhase(Phase.Claiming) nonReentrant {
        if (claimRequests[msg.sender].isPending || claimRequests[msg.sender].isDecrypted)
            revert AlreadyClaimed();

        Bid[] storage bids = _userBids[msg.sender];
        if (bids.length == 0) revert NoBids();

        euint64 totalEncAllocation = FHE.asEuint64(0);
        euint64 totalEncRefund     = FHE.asEuint64(0);

        // sRem = remaining supply at clearing price (whole tokens)
        uint64 sRem;
        if (demandAboveClearing < totalSupplyUnits) {
            sRem = totalSupplyUnits - demandAboveClearing;
        } else {
            sRem = 0;
        }

        uint64  dAt = demandAtClearing;
        uint256 cp  = clearingPrice;

        for (uint i = 0; i < bids.length; i++) {
            uint256 p = bids[i].price;
            euint64 q    = bids[i].encQuantity;  // whole tokens
            euint64 paid = bids[i].encCost;      // what user escrowed (paymentToken wei)
            // Ensure this contract can still use the stored encCost handle
            FHE.allowThis(paid);
            FHE.allow(paid, address(paymentToken));

            if (p > cp) {
                // Above clearing: full allocation
                // refund = paid - (q * clearingPrice)
                totalEncAllocation = FHE.add(totalEncAllocation, q);
                euint64 actualCost = FHE.mul(q, uint64(cp));
                totalEncRefund = FHE.add(totalEncRefund, FHE.sub(paid, actualCost));
            } else if (p == cp) {
                if (dAt > 0 && sRem < dAt) {
                    // Pro-rata partial allocation
                    // alloc = q * sRem / dAt  (whole tokens)
                    euint64 alloc = FHE.div(FHE.mul(q, sRem), dAt);
                    totalEncAllocation = FHE.add(totalEncAllocation, alloc);
                    // refund = paid - (alloc * clearingPrice)
                    euint64 cost = FHE.mul(alloc, uint64(cp));
                    totalEncRefund = FHE.add(totalEncRefund, FHE.sub(paid, cost));
                } else {
                    // Full allocation, no refund
                    totalEncAllocation = FHE.add(totalEncAllocation, q);
                }
            } else {
                // Below clearing: full refund of escrowed amount
                totalEncRefund = FHE.add(totalEncRefund, paid);
            }
        }

        claimRequests[msg.sender].encAllocation = totalEncAllocation;
        claimRequests[msg.sender].encRefund = totalEncRefund;

        FHE.allowThis(totalEncAllocation);
        FHE.allowThis(totalEncRefund);
        FHE.makePubliclyDecryptable(totalEncAllocation);
        // Grant only the claimer permission to user-decrypt their own refund
        FHE.allow(totalEncRefund, msg.sender);

        claimRequests[msg.sender].isPending = true;
        pendingClaimsCount += 1;
        emit ClaimRequested(msg.sender);
    }

    /**
     * @notice Execute transfers after decryption.
     *         `allocation` is in whole tokens, `refund` is in paymentToken wei.
     *         Owner converts allocation whole tokens -> wei for the ERC-20 transfer.
     */
    function executeClaimDecrypted(
        address user,
        bytes calldata abiEncodedCleartexts,
        bytes calldata decryptionProof
    ) external {
        ClaimRequest storage req = claimRequests[user];
        require(req.isPending, "Not pending");

        bytes32[] memory handles = new bytes32[](1);
        handles[0] = FHE.toBytes32(req.encAllocation);

        FHE.checkSignatures(handles, abiEncodedCleartexts, decryptionProof);

        uint64 allocation = abi.decode(abiEncodedCleartexts, (uint64));

        req.isPending    = false;
        req.isDecrypted  = true;
        req.allocation   = allocation;
        if (pendingClaimsCount > 0) pendingClaimsCount -= 1;

        if (allocation > 0) {
            // Convert whole tokens -> wei for ERC-20 transfer
            uint256 allocationWei = uint256(allocation) * (10 ** uint256(tokenDecimals));
            tokenToSell.safeTransfer(user, allocationWei);
        }

        // Send the confidential refund (always — even if 0, it's a no-op)
        FHE.allow(req.encRefund, address(paymentToken));
        paymentToken.confidentialTransfer(user, req.encRefund);

        emit TokensClaimed(user, allocation, 0); // refund amount kept private
    }

    /**
     * @notice Fetch the encrypted allocation handle so the frontend can decrypt it.
     */
    function getClaimEncryptedAllocation(address user) external view returns (bytes32) {
        return FHE.toBytes32(claimRequests[user].encAllocation);
    }

    /**
     * @notice Fetch the encrypted refund handle so the authorized user can privately decrypt it.
     *         Only the user themselves has FHE.allow permission — no public decryption possible.
     */
    function getClaimEncryptedRefund(address user) external view returns (bytes32) {
        return FHE.toBytes32(claimRequests[user].encRefund);
    }

    /**
     * @notice Allows the creator to withdraw their revenue (remaining confidential USDC).
     *         Can only be called once all pending claims have been executed so the
     *         contract does not sweep funds earmarked for user refunds.
     */
    function claimCreatorRevenue() external onlyOwner onlyPhase(Phase.Claiming) {
        require(pendingClaimsCount == 0, "Claims still pending: wait for all users to execute their claims");
        euint64 balance = paymentToken.confidentialBalanceOf(address(this));
        FHE.allow(balance, address(paymentToken));
        paymentToken.confidentialTransfer(owner(), balance);
    }

    // ---------------------------------------------------------------
    //  View helpers
    // ---------------------------------------------------------------

    function getUserBidCount(address user) external view returns (uint256) {
        return _userBids[user].length;
    }

    function getUserBidPrice(address user, uint256 index) external view returns (uint256) {
        return _userBids[user][index].price;
    }

    function getPricePointCount() external view returns (uint256) {
        return pricePoints.length;
    }

    function getEncryptedResultHandles() external view returns (bytes32, bytes32, bytes32) {
        return (
            FHE.toBytes32(encClearingPrice),
            FHE.toBytes32(encDemandAboveClearing),
            FHE.toBytes32(encDemandAtClearing)
        );
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./DutchAuction.sol";

/**
 * @title AuctionFactory
 * @notice Factory contract allowing anyone to deploy a confidential Dutch
 *         auction for any ERC-20 token. The creator deposits the tokens
 *         to sell, sets pricing parameters, and a new DutchAuction is deployed.
 *
 * KEY NOTE ON UNITS:
 *   - `supply` is the full wei amount of tokenToSell (used for ERC-20 transfer).
 *   - `supplyUnits` is the count in whole tokens (e.g. 100000 for 100,000 tokens),
 *     used inside the auction for FHE euint64 comparisons. Must fit in uint64.
 *   - If you do not pass `supplyUnits`, the factory will attempt to derive it
 *     automatically using the token's decimals.
 */
contract AuctionFactory {
    using SafeERC20 for IERC20;

    // ---------------------------------------------------------------
    //  State
    // ---------------------------------------------------------------

    address[] public auctions;
    mapping(address => address[]) public auctionsByCreator;

    // ---------------------------------------------------------------
    //  Events
    // ---------------------------------------------------------------

    event AuctionCreated(
        address indexed creator,
        address indexed auction,
        address tokenToSell,
        address paymentToken,
        uint256 totalSupply,
        uint64  totalSupplyUnits,
        uint256 floorPrice,
        uint256 startTime,
        uint256 endTime
    );

    // ---------------------------------------------------------------
    //  Errors
    // ---------------------------------------------------------------

    error InvalidDuration();
    error InvalidSupply();
    error InvalidFloorPrice();
    error StartInPast();

    // ---------------------------------------------------------------
    //  Create Auction
    // ---------------------------------------------------------------

    /**
     * @notice Deploy a new Dutch Auction for a given ERC-20 token.
     * @param tokenToSell   The ERC-20 token being auctioned.
     * @param paymentToken  The ERC-7984 confidential token used for payment.
     * @param supply        Total wei amount of tokenToSell to auction.
     * @param supplyUnits   Total whole-token count (must fit uint64, used for FHE).
     * @param floorPrice    Minimum allowed bid price (in paymentToken wei).
     * @param startTime     Unix timestamp when bidding opens.
     * @param duration      Duration of the bidding window in seconds.
     * @return auction      Address of the newly deployed DutchAuction contract.
     */
    function createAuction(
        address tokenToSell,
        address paymentToken,
        uint256 supply,
        uint64  supplyUnits,
        uint256 floorPrice,
        uint256 startTime,
        uint256 duration
    ) external returns (address auction) {
        if (supply == 0)     revert InvalidSupply();
        if (supplyUnits == 0) revert InvalidSupply();
        if (floorPrice == 0) revert InvalidFloorPrice();
        if (duration == 0)   revert InvalidDuration();
        if (startTime < block.timestamp) revert StartInPast();

        uint8 decimals = IERC20Metadata(tokenToSell).decimals();
        uint256 endTime = startTime + duration;

        DutchAuction auctionContract = new DutchAuction(
            tokenToSell,
            paymentToken,
            decimals,
            supply,
            supplyUnits,
            floorPrice,
            startTime,
            endTime,
            msg.sender
        );

        auction = address(auctionContract);

        // Transfer the full wei amount of tokens into the auction
        IERC20(tokenToSell).safeTransferFrom(msg.sender, auction, supply);

        auctions.push(auction);
        auctionsByCreator[msg.sender].push(auction);

        emit AuctionCreated(
            msg.sender,
            auction,
            tokenToSell,
            paymentToken,
            supply,
            supplyUnits,
            floorPrice,
            startTime,
            endTime
        );
    }

    // ---------------------------------------------------------------
    //  View Helpers
    // ---------------------------------------------------------------

    function getAuctionCount() external view returns (uint256) {
        return auctions.length;
    }

    function getAuctionsByCreator(address creator) external view returns (address[] memory) {
        return auctionsByCreator[creator];
    }
}

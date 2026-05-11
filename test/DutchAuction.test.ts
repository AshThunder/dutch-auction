import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("DutchAuction Comprehensive Test Suite", function () {
  let factory: any;
  let mockErc20: any;
  let auction: any;
  let owner: any, addr1: any, addr2: any;

  const supply = ethers.parseEther("1000"); // 1000 tokens
  const supplyUnits = 1000n;
  const floorPrice = ethers.parseUnits("1", 6); // 1 USDC equivalent
  const duration = 3600; // 1 hour
  let startTime: number;
  let endTime: number;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy Mock ERC20 to act as tokenToSell & paymentToken
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockErc20 = await MockERC20.deploy("Test Token", "TST", ethers.parseEther("1000000"));
    await mockErc20.waitForDeployment();

    // Deploy Factory
    const Factory = await ethers.getContractFactory("AuctionFactory");
    factory = await Factory.deploy();
    await factory.waitForDeployment();

    // Setup times
    startTime = (await time.latest()) + 100;
    endTime = startTime + duration;

    // Approve & Create Auction
    await mockErc20.approve(await factory.getAddress(), supply);
    await factory.createAuction(
      await mockErc20.getAddress(),
      await mockErc20.getAddress(), // Mock 7984 mapping
      supply,
      supplyUnits,
      floorPrice,
      startTime,
      duration
    );

    const auctionAddress = await factory.auctions(0);
    const Auction = await ethers.getContractFactory("DutchAuction");
    auction = Auction.attach(auctionAddress);
  });

  describe("Initialization & Public State", function () {
    it("Should correctly initialize state variables", async function () {
      expect(await auction.owner()).to.equal(owner.address);
      expect(await auction.tokenToSell()).to.equal(await mockErc20.getAddress());
      expect(await auction.paymentToken()).to.equal(await mockErc20.getAddress());
      expect(await auction.totalSupply()).to.equal(supply);
      expect(await auction.totalSupplyUnits()).to.equal(supplyUnits);
      expect(await auction.floorPrice()).to.equal(floorPrice);
      expect(await auction.startTime()).to.equal(startTime);
      expect(await auction.endTime()).to.equal(endTime);
      expect(await auction.phase()).to.equal(0); // Phase.Bidding
    });
  });

  describe("Access Controls & Temporal Reverts", function () {
    it("Should revert if placing a bid before startTime", async function () {
      const dummyHandle = ethers.hexlify(ethers.randomBytes(32));
      const dummyProof = "0x";

      await expect(
        auction.connect(addr1).submitBid(5, dummyHandle, dummyProof)
      ).to.be.revertedWithCustomError(auction, "AuctionNotActive");
    });

    it("Should revert if placing a bid after endTime", async function () {
      const dummyHandle = ethers.hexlify(ethers.randomBytes(32));
      const dummyProof = "0x";

      await time.increaseTo(endTime + 1);

      await expect(
        auction.connect(addr1).submitBid(5, dummyHandle, dummyProof)
      ).to.be.revertedWithCustomError(auction, "AuctionNotActive");
    });

    it("Should revert if finalizing before endTime", async function () {
      await time.increaseTo(startTime + 100); // During active bidding

      await expect(
        auction.connect(owner).calculateClearingPrice([])
      ).to.be.revertedWithCustomError(auction, "AuctionNotEnded");
    });

    it("Should revert if non-owner tries to finalize", async function () {
      await time.increaseTo(endTime + 1);

      await expect(
        auction.connect(addr1).calculateClearingPrice([])
      ).to.be.revertedWithCustomError(auction, "OwnableUnauthorizedAccount");
    });

    it("Should revert if claiming before phase is Claiming", async function () {
      await expect(
        auction.connect(addr1).requestClaim()
      ).to.be.revertedWithCustomError(auction, "InvalidPhase");
    });
  });

  describe("FHE Interactions (Architecture Mock)", function () {
    /**
     * NOTE: The following tests outline how you would test the Zama fhEVM specific
     * functions using `fhevmjs` and a fully mocked TFHE network. 
     * Because this is a standard hardhat node without `fhevmjs` configured in the
     * workspace dependencies, these are marked as skipped to prevent crashes during
     * basic validation, while still demonstrating full architectural intent.
     */
    
    it.skip("Should accept valid encrypted bids during active phase", async function () {
      await time.increaseTo(startTime + 1);

      // Pseudo-code for fhevmjs generation:
      // const instance = await createInstance({ chainId, publicKey });
      // const encQuantity = instance.encrypt64(100);
      // const price = 5; // 5 USDC
      
      // await auction.connect(addr1).submitBid(encQuantity, price);
      // const bidCount = await auction.getUserBidCount(addr1.address);
      // expect(bidCount).to.equal(1);
    });

    it.skip("Should calculate clearing price correctly in Finalize phase", async function () {
      // Simulate multiple encrypted bids, advance to endTime
      // await auction.connect(owner).calculateClearingPrice(sortedPrices);
      
      // Expect the Coprocessor callback to be triggered
      // and state to update to Phase.Decrypting
      // expect(await auction.phase()).to.equal(1); // Decrypting
    });

    it.skip("Should handle callback and update final clearing variables", async function () {
      // Assuming a mocked Coprocessor callback
      // auction.onClearingPriceDecrypted(requestId, decryptedClearingPrice);
      // expect(await auction.phase()).to.equal(2); // Claiming
      // expect(await auction.clearingPrice()).to.equal(expectedPrice);
    });
  });
});

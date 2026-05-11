import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("AuctionFactory", function () {
  let factory: any;
  let mockErc20: any;
  let owner: any, addr1: any;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();

    // Deploy Mock ERC20 to act as tokenToSell
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockErc20 = await MockERC20.deploy("Test Token", "TST", ethers.parseEther("1000000"));
    await mockErc20.waitForDeployment();

    // Deploy Factory
    const Factory = await ethers.getContractFactory("AuctionFactory");
    factory = await Factory.deploy();
    await factory.waitForDeployment();
  });

  it("Should successfully create a new auction and emit AuctionCreated", async function () {
    const supply = ethers.parseEther("1000"); // 1000 tokens
    const supplyUnits = 1000n;
    const floorPrice = ethers.parseUnits("1", 6); // 1 USDC
    const duration = 3600; // 1 hour
    
    // We need to approve the factory to spend our tokens
    await mockErc20.approve(await factory.getAddress(), supply);

    const latestTime = await time.latest();
    const startTime = latestTime + 100; // Starts in 100 seconds

    await expect(
      factory.createAuction(
        await mockErc20.getAddress(),
        await mockErc20.getAddress(), // using the same mock for paymentToken for simplicity
        supply,
        supplyUnits,
        floorPrice,
        startTime,
        duration
      )
    )
      .to.emit(factory, "AuctionCreated")
      .withArgs(
        owner.address,
        ethers.isAddress, // The newly deployed auction address
        await mockErc20.getAddress(),
        await mockErc20.getAddress(),
        supply,
        supplyUnits,
        floorPrice,
        startTime,
        startTime + duration
      );

    const auctionCount = await factory.getAuctionCount();
    expect(auctionCount).to.equal(1n);

    // Verify tokens were transferred to the new auction contract
    const auctionAddress = await factory.auctions(0);
    expect(await mockErc20.balanceOf(auctionAddress)).to.equal(supply);
  });

  describe("Reverts & Edge Cases", function () {
    const supply = ethers.parseEther("1000");
    const supplyUnits = 1000n;
    const floorPrice = ethers.parseUnits("1", 6);
    const duration = 3600;
    let startTime: number;

    beforeEach(async function () {
      await mockErc20.approve(await factory.getAddress(), supply);
      startTime = await time.latest() + 100;
    });

    it("Reverts if supply is 0", async function () {
      await expect(
        factory.createAuction(await mockErc20.getAddress(), await mockErc20.getAddress(), 0, supplyUnits, floorPrice, startTime, duration)
      ).to.be.revertedWithCustomError(factory, "InvalidSupply");
    });

    it("Reverts if supplyUnits is 0", async function () {
      await expect(
        factory.createAuction(await mockErc20.getAddress(), await mockErc20.getAddress(), supply, 0, floorPrice, startTime, duration)
      ).to.be.revertedWithCustomError(factory, "InvalidSupply");
    });

    it("Reverts if floorPrice is 0", async function () {
      await expect(
        factory.createAuction(await mockErc20.getAddress(), await mockErc20.getAddress(), supply, supplyUnits, 0, startTime, duration)
      ).to.be.revertedWithCustomError(factory, "InvalidFloorPrice");
    });

    it("Reverts if duration is 0", async function () {
      await expect(
        factory.createAuction(await mockErc20.getAddress(), await mockErc20.getAddress(), supply, supplyUnits, floorPrice, startTime, 0)
      ).to.be.revertedWithCustomError(factory, "InvalidDuration");
    });

    it("Reverts if startTime is in the past", async function () {
      const pastTime = await time.latest() - 100;
      await expect(
        factory.createAuction(await mockErc20.getAddress(), await mockErc20.getAddress(), supply, supplyUnits, floorPrice, pastTime, duration)
      ).to.be.revertedWithCustomError(factory, "StartInPast");
    });
  });
});

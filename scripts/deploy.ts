import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const Factory = await ethers.getContractFactory("AuctionFactory");
  const factory = await Factory.deploy();
  await factory.waitForDeployment();

  const address = await factory.getAddress();
  console.log("AuctionFactory deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

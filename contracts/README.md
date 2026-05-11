# Zama Auction Contracts

This directory contains the Fully Homomorphic Encryption (FHE) enabled smart contracts for the Confidential Dutch Auction.

## Architecture

The system is composed of two primary contracts:

1. **`AuctionFactory.sol`**
   - Acts as a permissionless hub for users to create new confidential auctions.
   - Handles parameter validation, securely transfers the underlying `tokenToSell` into the new auction contract, and tracks all deployed auctions.

2. **`DutchAuction.sol`**
   - The core auction engine implementing Zama's `@fhevm/solidity` library.
   - **Bidding Phase:** Accepts public price tiers but strictly encrypts bid quantities as `euint64`. Under the hood, it aggregates demand at specific price points without revealing individual or total demand sizes to the network.
   - **Finalization Phase:** Emits a secure decryption request to the Zama Coprocessor KMS to decrypt the exact clearing price.
   - **Claim Phase:** Securely processes `FHE.select` (conditional multiplexing) logic to determine if a bidder won tokens, or if they receive a refund in the confidential ERC-7984 payment token.

## Fully Homomorphic Encryption (FHE) Implementation

This project heavily utilizes the `FHE` library to execute logic on encrypted data:
- **`FHE.add`**: Aggregates encrypted demand at specific price points.
- **`FHE.lte` / `FHE.gte`**: Compares aggregate demand against the total supply to determine the clearing price entirely in ciphertexts.
- **`FHE.select`**: Allocates either the token payload or a full refund based on whether a user's bid price was above or below the clearing price.

## Deployment

Deploying to the Zama fhEVM network requires specific configuration. 

```bash
# Compile contracts (targets Paris EVM version to avoid PUSH0 issues on fhEVM)
npx hardhat compile

# Deploy to Zama testnet
npx hardhat run scripts/deploy.ts --network sepolia
```

Ensure your `.env` contains your deployer `PRIVATE_KEY` and the correct `SEPOLIA_RPC_URL`.

# Zama Auction Contracts

This directory contains the Fully Homomorphic Encryption (FHE) enabled smart contracts for the Confidential Dutch Auction. By leveraging Zama's **fhEVM**, we achieve complete privacy of bid quantities, eliminating front-running and MEV manipulation.

## 🏗️ Core Contracts

### 1. [`AuctionFactory.sol`](./AuctionFactory.sol)
The permissionless entry point for creating new auctions.
- **Permissionless:** Anyone can deploy an auction for any standard ERC-20 token.
- **Escrow:** Securely locks the `tokenToSell` supply during the auction creation.
- **Metadata Management:** Automatically derives token decimals and manages auction tracking for the frontend.

### 2. [`DutchAuction.sol`](./DutchAuction.sol)
The engine that powers the confidential bidding and settlement process.
- **Encrypted Bidding:** Bid quantities are submitted as `euint64` ciphertexts. 
- **Privacy-Preserving Demand:** The contract aggregates demand at each price point without exposing the volume to public observers.
- **Coprocessor Integration:** Uses Zama's KMS for secure decryption of the final clearing price once the auction ends.

## 🔐 FHE Logic & Security

The project utilizes specific `FHE` primitives to ensure data integrity while maintaining confidentiality:

### Confidential State Machine
- **Aggregation:** We use `FHE.add` to build a demand curve on-chain. Even the total number of bids or the total demand at a price is hidden in ciphertext.
- **Sorting & Clearing:** The contract iterates through price points in descending order. Using `FHE.ge`, it determines if the cumulative demand has exhausted the fixed supply.
- **Multiplexing (FHE.select):** Settlement uses `FHE.select` to determine winners. If `bid_price >= clearing_price`, the contract calculates an allocation; otherwise, it marks the bid for a full refund.

### MEV & Front-running Resistance
Because the demand curve is encrypted, searchers cannot see where the "buy wall" is. They cannot calculate the potential clearing price in advance to front-run other bidders, ensuring a fair, equilibrium-based outcome for all participants.

## 🛠️ Development & Testing

### Compilation

```bash
npx hardhat compile
```

### Testing
The Hardhat test suite (`/test`) validates:
- **Strict Bounds:** Auctions cannot be created in the past or end before they start.
- **Access Control:** Only the owner can trigger finalization and claim creator revenue.
- **Structural Integrity:** Ensures correct handling of ERC-20 token transfers into the auction escrow.

> **Note:** FHE precompiles are not available in a standard Hardhat environment. Tests covering FHE-specific logic (`submitBid`, `calculateClearingPrice`, `requestClaim`) are structurally mocked and require a Zama-enabled node for full end-to-end validation.

## 🚀 Deployment

The deploy script (`scripts/deploy.ts`) deploys the `AuctionFactory` contract. Individual `DutchAuction` contracts are deployed permissionlessly by users through the factory.

```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

After deployment, copy the printed `AuctionFactory` address into `frontend/.env` as `VITE_FACTORY_ADDRESS`.

### Environment Variables
Required in the root `.env`:
- `PRIVATE_KEY`: Your deployer wallet private key.
- `SEPOLIA_RPC_URL`: RPC endpoint for the Sepolia testnet (e.g. from Alchemy or Infura).

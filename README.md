# Zama FHE Confidential Dutch Auction

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![FHEVM](https://img.shields.io/badge/Zama-fhEVM-8A2BE2)
![Solidity](https://img.shields.io/badge/Solidity-^0.8.24-363636)
![React](https://img.shields.io/badge/Frontend-React+Vite-61DAFB)

A decentralized, fully on-chain confidential Dutch Auction built using **Zama's Fully Homomorphic Encryption (fhEVM)**. This project enables users to participate in token sales with completely private bid quantities, preventing front-running, gas wars, and MEV manipulation.

## 🌟 Overview

Traditional public Dutch auctions suffer from race conditions and public bid exposure, favoring larger bidders and MEV bots. By leveraging Zama's `FHE` library, this project ensures that **bid quantities remain encrypted on-chain** throughout the entire bidding process. The clearing price is calculated securely via Fully Homomorphic Encryption and decrypted only at the end of the auction using the Zama Coprocessor.

### Key Features
- **Encrypted Demand:** Bidders submit their desired token quantities as `euint64` encrypted payloads.
- **Fair Price Discovery:** The clearing price is calculated purely based on demand without exposing individual bids.
- **Confidential Settlement:** Refunds and allocations are securely computed, ensuring participants only reveal their final balances when they choose to unshield.
- **Factory Architecture:** Anyone can deploy a new confidential Dutch Auction for their ERC-20 token in a permissionless manner.

---

## 🏗️ Repository Structure

This is a monorepo containing both the smart contracts and the frontend application:

- `/contracts`: FHE-enabled Solidity smart contracts (`DutchAuction.sol`, `AuctionFactory.sol`). [Read more](./contracts/README.md)
- `/frontend`: React/Vite web application with Zama SDK integration. [Read more](./frontend/README.md)
- `/test`: Comprehensive Hardhat test suite demonstrating access controls and FHE mock architecture.

---

## 📖 How the Auction Works

The auction runs in four distinct phases:

### Phase 1 — Shield Stablecoins
Participating requires confidential stablecoins. Users shield standard ERC-20 tokens (e.g., USDC) into an ERC-7984 confidential wrapper. While the act of shielding is public, subsequent transfers and balances are entirely encrypted.

### Phase 2 — Bidding
Users have a set window to place bids. Each bid includes a **public price** and a **private, encrypted quantity** (`euint64`). Bots cannot monitor the mempool or front-run bids because the underlying demand at any given price point is hidden.

### Phase 3 — Clearing Price & Allocation
Bids are filled from highest price to lowest using Fully Homomorphic Encryption. The lowest price at which demand exhausts the supply becomes the **clearing price**. 
- **Above Clearing:** Receive full allocation + refund for overpayment.
- **At Clearing:** Pro-rata allocation + refund for the remainder.
- **Below Clearing:** No tokens, full refund.

### Phase 4 — Claiming
Once the Zama Coprocessor decrypts the final clearing price, users can securely claim their underlying token allocations and their refunds (which can remain as confidential ERC-7984 tokens).

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- `pnpm` (v10+)
- MetaMask or an EVM-compatible wallet configured for the Zama fhEVM network.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/YourUsername/zama-auction.git
   cd zama-auction
   ```

2. Install dependencies:
   ```bash
   pnpm install
   cd frontend && pnpm install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env` in the root and fill in your private keys.
   - Copy `frontend/.env.example` to `frontend/.env` and configure your RPC URLs and factory addresses.

---

## 🧪 Testing

The project includes a comprehensive Hardhat test suite that validates the factory, strict temporal bounds, and access controls, while architecting the FHE mocks.

```bash
# Run the test suite
npx hardhat test
```

*Note: Due to the nature of FHE precompiles, the tests currently focus heavily on public routing, state management, and edge-case reverts to ensure generic CI compatibility. FHE-specific data manipulations are structurally mocked.*

---

## 📄 License
This project is licensed under the MIT License.

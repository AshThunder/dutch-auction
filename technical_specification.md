# Technical Specification: Zama Confidential Dutch Auction

## Overview
This document details the mechanics and configuration for a decentralized platform that allows anyone to launch a sealed-bid, single-price Dutch auction for **any ERC20 token**, powered by Zama's Fully Homomorphic Encryption (FHE).

## 1. Auction Phases

### Phase 1: Auction Creation & Shielding
- **Factory Pattern**: Users interact with an `AuctionFactory.sol` to deploy a new `DutchAuction` contract for their specific ERC20 token.
- **Parameters**: Auction creator sets the token, total supply for the auction, auction duration, and floor price.
- **Shielding (Token Wrapping)**: Bidders wrap standard ERC-20 payment tokens (e.g., USDT) into **ERC-7984 (Confidential Tokens)**.
- **Privacy**: Balances and transfer amounts are encrypted on-chain.

### Phase 2: Bidding
- **Input**:
  - `price`: Public (increment $0.005, floor $55M FDV).
  - `quantity`: Encrypted (euint32).
- **On-chain Logic**:
  - Bids are stored in a mapping: `mapping(uint256 => euint32) demandAtPrice`.
  - Each bid submission: `demandAtPrice[price] = FHE.add(demandAtPrice[price], encryptedQuantity)`.
  - Individual bids are stored to allow cancellation/claims: `mapping(address => mapping(uint256 => euint32)) userBids`.

### Phase 3: Clearing Price Calculation
- **Algorithm**:
  1. Input a sorted list of price points (descending).
  2. For each price $p$:
     - `cumulativeDemand = FHE.add(cumulativeDemand, demandAtPrice[p])`
     - `isFilled = FHE.le(cumulativeDemand, totalAvailable)`
     - Determine the clearing price where `cumulativeDemand` first exceeds `totalAvailable`.
- **Pro-rata Handling (Confidential)**: 
  - If at the clearing price $P$, $Demand(P) + \sum_{p>P} Demand(p) > Supply$, then bidders at price $P$ receive tokens pro-rata.
  - This requires a confidential calculation: $Allocation = Demand(P) * (Supply - \sum_{p>P} Demand(p)) / Demand(P)$.
  - Note: Division on encrypted values is expensive; an alternative is to reveal the *total* demand at the clearing price while keeping individual bids private.
- **FHE Primitives** (fhEVM v0.10+ namespace):
  - `FHE.add(lhs, rhs)`: Summing encrypted quantities.
  - `FHE.sub(lhs, rhs)`: Subtraction (for refund calculations).
  - `FHE.mul(lhs, rhs)`: Multiplication (for cost calculations).
  - `FHE.div(lhs, plaintext_rhs)`: Division — **only supports plaintext divisors**.
  - `FHE.ge` / `FHE.le` / `FHE.gt` / `FHE.lt` / `FHE.eq`: Comparison operators returning `ebool`.
  - `FHE.select(ebool, true_val, false_val)`: Ternary selection (replaces `if/else` branching).
  - `FHE.asEuint32(ciphertext, proof)`: Casts raw input bytes into a validated encrypted type.
  - `FHE.allow(handle, address)`: Grants persistent ACL access to a ciphertext.
  - `FHE.allowTransient(handle, address)`: Grants transaction-scoped ACL access.
- **Decryption** (Asynchronous 3-step flow):
  1. Contract calls `FHE.makePubliclyDecryptable(encryptedClearingPrice)` to request decryption.
  2. Off-chain Gateway/Coprocessor picks up the request and performs threshold decryption.
  3. Gateway posts the plaintext result back to the contract via a callback function.
  - **Important**: The plaintext is NOT available in the same transaction. The contract must store a pending state and resolve it in the callback.
- **Reencryption** (Client-side only):
  - Contracts expose a view function returning the ciphertext handle.
  - The client SDK requests reencryption from the Gateway/TKMS to view the value privately.
  - This is used for displaying a user's own bid quantity without revealing it on-chain.

### Phase 4: Claiming and Refunds
- **Allocation**:
  - If `userPrice > clearingPrice`: 100% allocation.
  - If `userPrice == clearingPrice`: Pro-rata allocation (requires FHE-based division or manual split if price revealed).
  - If `userPrice < clearingPrice`: 0% allocation, 100% refund.
- **Refunds**: Calculated as `encryptedBidAmount - (allocatedQuantity * clearingPrice)`.

## 2. Smart Contract Interface

### `AuctionFactory.sol`
- `createAuction(address tokenToSell, address paymentToken, uint256 supply, uint256 floorPrice, uint256 duration)`: Deploys a new `DutchAuction` instance and transfers the `tokenToSell` to it. Emits an event with the new auction address.

### `DutchAuction.sol`
#### State Variables
- `address public tokenToSell`: The ERC20 token being auctioned.
- `address public paymentToken`: The ERC7984 confidential token used for bidding.
- `uint256 public totalAvailable`: Amount of `tokenToSell` to be sold.
- `uint256 public startTime, endTime`: Auction duration.
- `uint256 public floorPrice`: Minimum allowed price.
- `mapping(uint256 => euint32) public demandAtPrice`: Encrypted total demand per price point.
- `mapping(address => mapping(uint256 => euint32)) private userBids`: Individual bid storage (private).
- `euint32 public encryptedClearingPrice`: The clearing price calculated via FHE.

#### Core Functions
- `submitBid(uint256 price, bytes encryptedQuantity, bytes proof)`:
  - Validates `price >= floorPrice`.
  - Casts `encryptedQuantity` using `FHE.asEuint32(encryptedQuantity, proof)`.
  - Updates `demandAtPrice[price] = FHE.add(demandAtPrice[price], qty)`.
  - Sets ACL: `FHE.allow(demandAtPrice[price], address(this))`.
- `calculateClearingPrice(uint256[] sortedPrices)`:
  - Iterative FHE accumulation using `FHE.add`, `FHE.le`, `FHE.select`.
  - Sets `encryptedClearingPrice`.
- `requestRevealPrice()`: Calls `FHE.makePubliclyDecryptable(encryptedClearingPrice)` — triggers async Gateway decryption.
- `onDecryptionCallback(uint256 clearingPrice)`: Gateway callback that stores the revealed plaintext clearing price.
- `claimTokens()`: Transfers `tokenToSell` based on `price >= finalClearingPrice`.
- `claimRefund()`: Returns overpaid `paymentToken`.

## 3. Zama Configuration (2026 Standards)

### Network Details
- **Host Chain**: Ethereum Sepolia (Chain ID: `11155111`)
- **Gateway Chain ID**: `10901`
- **Relayer URL**: `https://relayer.testnet.zama.org`
- **RPC**: `https://ethereum-sepolia-rpc.publicnode.com` (or similar)

### Development Tools
- **Compiler**: Solidity 0.8.24
- **Hardhat**: v2.28.x (v2, not v3 — required for plugin compatibility)
- **Hardhat Plugin**: `@fhevm/hardhat-plugin` v0.4.2
- **Solidity Library**: `@fhevm/solidity` v0.11.1 (uses `FHE.*` namespace)
- **Peer Dependency**: `encrypted-types` v0.0.4
- **Frontend SDK**: `@zama-fhe/react-sdk`
- **OpenZeppelin**: `@openzeppelin/contracts` v5.6.x

## 4. fhEVM Limitations & Best Practices (v0.10+)

### Design Constraints
- **Linear Execution**: The EVM cannot branch (`if`, `require`) based on encrypted values. Logic must proceed linearly using `FHE.select` for conditional assignments.
- **Unchecked Arithmetic**: Arithmetic on encrypted integers is unchecked to prevent information leakage via reverts. Overflows must be detected using `FHE.ge`/`FHE.le` comparisons before operations.
- **Asynchronous Decryption**: Decryption is a 3-step async process (contract → Gateway → callback). The contract must manage pending states between request and result.
- **Silent Failures**: Failed operations (e.g., insufficient encrypted balance) result in a no-op (zero transfer) rather than a revert.
- **Division Limitation**: `FHE.div` only supports **plaintext divisors**. For pro-rata calculations, the total demand at the clearing price may need to be revealed first.

### Security & Privacy
- **Access Control List (ACL)**: Each ciphertext has an ACL. Use `FHE.allow(handle, address)` for persistent access, `FHE.allowTransient` for single-tx access.
- **Threshold Decryption**: Only a threshold of Gateway nodes can decrypt data, ensuring no single party can unilaterally view private bids.
- **ZK Proofs of Knowledge (ZKPoK)**: The frontend SDK generates proofs for all encrypted inputs, ensuring the user knows the plaintext behind the ciphertext.

## 5. Advanced Features & Extensions

### Bonus Mechanisms
The system can support optional bonuses (e.g., for early contributors or NFT holders):
- **Bonus Coefficients**: A mapping of addresses to bonus factors (e.g., 110 for a 10% bonus).
- **Encrypted Adjustment**: `AdjustedQuantity = (Quantity * BonusFactor) / 100`.
- **Verification**: The contract can check NFT ownership or bonus codes (public or hashed) before applying the factor.

### Fee Structure
The `AuctionFactory` can include a small platform fee (e.g., 0.1%) either in the token being sold or the payment token, to incentivize platform maintenance.

## 7. Frontend Architecture & UX

### Technology Stack
- **Framework**: Next.js 14+ (App Router).
- **FHE SDK**: `@zama-fhe/react-sdk` for client-side encryption and relayer communication.
- **Provider Layer**: `ZamaProvider` wrapping `WagmiProvider` and `QueryClientProvider`.

### User Flow
1. **Connect Wallet**: Standard wagmi/viem connection.
2. **Shielding**: 
   - Check standard ERC-20 balance.
   - Trigger `approve` and `shield` (wraps into ERC-7984).
   - Display encrypted balance using `useConfidentialBalance` hook.
3. **Bidding**:
   - User selects a price point from the available public options.
   - User inputs a quantity.
   - **Client-side Encryption**: The quantity is encrypted using the public key fetched from the Zama relayer.
   - **Proof Generation**: Zama SDK generates a ZK proof for the ciphertext.
   - Transaction is sent with `{price, ciphertext, proof}`.
4. **Auction Dashboard**:
   - Real-time display of total supply vs. estimated demand (if public).
   - Countdown timer for phases.
5. **Claims**:
   - Logic to check allocation once clearing price is revealed.
   - Button to trigger `claimTokens()` and `claimRefund()`.

### Performance Optimizations
- **Artifact Caching**: Use IndexedDB (via `ZamaProvider`) to cache multi-MB FHE public keys to prevent re-downloads on refresh.
- **Decryption Fetching**: Implement polling or event listeners for decryption callbacks from the Gateway.



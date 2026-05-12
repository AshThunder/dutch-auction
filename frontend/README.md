# Confidential Dutch Auction UI

The frontend application provides a seamless, dynamic interface for users to create auctions, bid confidentially, and manage their encrypted assets.

## Tech Stack

- **Framework:** React 18 with Vite
- **Styling:** TailwindCSS with a custom dark-mode, glassmorphism design system.
- **Web3 Interaction:** `viem` and `wagmi` for standard EVM interactions.
- **FHE Cryptography:** `@zama-fhe/react-sdk` and `@zama-fhe/sdk` for generating the encrypted payloads and handling the asynchronous decryption/unshielding flows.

## Core Features

- **Confidential Dashboard:** Shield standard ERC-20 tokens into ERC-7984 confidential stablecoins. Unshield them back at any time.
- **Auction Creation Workflow:** Step-by-step form to set auction parameters, approve token spending, and deploy a new `DutchAuction` contract directly from the browser.
- **Integrated Test Token Deployer:** A built-in utility allowing users to instantly deploy a `MockERC20` token to test the auction functionality without external faucet juggling.
- **Encrypted Bidding Interface:** Securely generates `euint64` payloads using Zama's SDK, masking the user's desired quantity before the transaction ever leaves the browser.
- **Educational Flow:** Comprehensive "How it Works" page and "The Clearing Price Logic" visualizations to guide users through the FHE auction lifecycle.

## Running Locally

1. Install dependencies:
```bash
pnpm install
```

2. Configure environment variables in a `.env` file based on your deployed contracts:
```env
VITE_FACTORY_ADDRESS=0xYourFactoryAddressHere
```

3. Start the Vite development server:
```bash
pnpm run dev
```

4. Open your browser to `http://localhost:5173`.

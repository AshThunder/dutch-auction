// ABI stubs for the Confidential Dutch Auction frontend.
// Reflects the rewritten contracts with proper euint64-safe unit separation.

export const AuctionFactoryABI = [
  {
    type: 'function',
    name: 'auctions',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getAuctionCount',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getAuctionsByCreator',
    inputs: [{ name: 'creator', type: 'address' }],
    outputs: [{ name: '', type: 'address[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'createAuction',
    inputs: [
      { name: 'tokenToSell',  type: 'address' },
      { name: 'paymentToken', type: 'address' },
      { name: 'supply',       type: 'uint256' }, // wei amount for ERC-20 transfer
      { name: 'supplyUnits',  type: 'uint64'  }, // whole-token count for FHE
      { name: 'floorPrice',   type: 'uint256' },
      { name: 'startTime',    type: 'uint256' },
      { name: 'duration',     type: 'uint256' },
    ],
    outputs: [{ name: 'auction', type: 'address' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    name: 'AuctionCreated',
    inputs: [
      { name: 'creator',          type: 'address', indexed: true  },
      { name: 'auction',          type: 'address', indexed: true  },
      { name: 'tokenToSell',      type: 'address', indexed: false },
      { name: 'paymentToken',     type: 'address', indexed: false },
      { name: 'totalSupply',      type: 'uint256', indexed: false },
      { name: 'totalSupplyUnits', type: 'uint64',  indexed: false },
      { name: 'floorPrice',       type: 'uint256', indexed: false },
      { name: 'startTime',        type: 'uint256', indexed: false },
      { name: 'endTime',          type: 'uint256', indexed: false },
    ],
  },
] as const

export const DutchAuctionABI = [
  // ── View: core params ──────────────────────────────────────────────
  { type: 'function', name: 'tokenToSell',      inputs: [], outputs: [{ name: '', type: 'address' }], stateMutability: 'view' },
  { type: 'function', name: 'paymentToken',     inputs: [], outputs: [{ name: '', type: 'address' }], stateMutability: 'view' },
  { type: 'function', name: 'tokenDecimals',    inputs: [], outputs: [{ name: '', type: 'uint8'   }], stateMutability: 'view' },
  { type: 'function', name: 'totalSupply',      inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'totalSupplyUnits', inputs: [], outputs: [{ name: '', type: 'uint64'  }], stateMutability: 'view' },
  { type: 'function', name: 'floorPrice',       inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'startTime',        inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'endTime',          inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'phase',            inputs: [], outputs: [{ name: '', type: 'uint8'   }], stateMutability: 'view' },
  { type: 'function', name: 'clearingPrice',    inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'demandAboveClearing', inputs: [], outputs: [{ name: '', type: 'uint64' }], stateMutability: 'view' },
  { type: 'function', name: 'demandAtClearing',    inputs: [], outputs: [{ name: '', type: 'uint64' }], stateMutability: 'view' },
  { type: 'function', name: 'pendingClaimsCount',  inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'owner',               inputs: [], outputs: [{ name: '', type: 'address' }], stateMutability: 'view' },

  // ── View: per-user helpers ──────────────────────────────────────────
  {
    type: 'function', name: 'getPricePointCount',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function', name: 'pricePoints',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function', name: 'getUserBidCount',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function', name: 'getUserBidPrice',
    inputs: [{ name: 'user', type: 'address' }, { name: 'index', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function', name: 'claimRequests',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [
      { name: 'isPending',     type: 'bool'    },
      { name: 'isDecrypted',   type: 'bool'    },
      { name: 'encAllocation', type: 'bytes32' }, // euint64 handle
      { name: 'allocation',    type: 'uint256' }, // decrypted value
      { name: 'encRefund',     type: 'bytes32' }, // euint64 handle
    ],
    stateMutability: 'view',
  },
  {
    type: 'function', name: 'getEncryptedResultHandles',
    inputs: [],
    outputs: [
      { name: '', type: 'bytes32' },
      { name: '', type: 'bytes32' },
      { name: '', type: 'bytes32' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function', name: 'getClaimEncryptedAllocation',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function', name: 'getClaimEncryptedRefund',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'view',
  },

  // ── Write ───────────────────────────────────────────
  {
    type: 'function', name: 'submitBid',
    inputs: [
      { name: 'price',       type: 'uint256' },
      { name: 'inputHandle', type: 'bytes32' },
      { name: 'inputProof',  type: 'bytes'   },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function', name: 'cancelBid',
    inputs: [{ name: 'bidIndex', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function', name: 'requestClaim',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function', name: 'calculateClearingPrice',
    inputs: [{ name: 'sortedPricesDesc', type: 'uint256[]' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function', name: 'onClearingPriceDecrypted',
    inputs: [
      { name: 'abiEncodedCleartexts', type: 'bytes' },
      { name: 'decryptionProof',      type: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function', name: 'executeClaimDecrypted',
    inputs: [
      { name: 'user',                 type: 'address' },
      { name: 'abiEncodedCleartexts', type: 'bytes'   },
      { name: 'decryptionProof',      type: 'bytes'   },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function', name: 'claimCreatorRevenue',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },

  // ── Events ──────────────────────────────────────────────────────────
  {
    type: 'event', name: 'BidPlaced',
    inputs: [
      { name: 'bidder',   type: 'address', indexed: true  },
      { name: 'price',    type: 'uint256', indexed: false },
      { name: 'bidIndex', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event', name: 'ClearingPriceRevealed',
    inputs: [{ name: 'clearingPrice', type: 'uint256', indexed: false }],
  },
  {
    type: 'event', name: 'ClaimRequested',
    inputs: [{ name: 'bidder', type: 'address', indexed: true }],
  },
  {
    type: 'event', name: 'TokensClaimed',
    inputs: [
      { name: 'bidder',      type: 'address', indexed: true  },
      { name: 'tokenAmount', type: 'uint256', indexed: false },
      { name: 'refund',      type: 'uint256', indexed: false },
    ],
  },
] as const

export const erc7984Abi = [
  {
    type: 'function',
    name: 'setOperator',
    inputs: [
      { name: 'operator', type: 'address' },
      { name: 'until', type: 'uint48' }
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  }
] as const

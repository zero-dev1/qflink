// ABI for QFLinkPodsAdmin — Functions: upgradePod, setEntryFee

export const podsAdminAbi = [
  // ── Write ──
  {
    type: 'function',
    name: 'upgradePod',
    inputs: [
      { name: 'podId', type: 'uint64', internalType: 'uint64' },
    ],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'setEntryFee',
    inputs: [
      { name: 'podId', type: 'uint64', internalType: 'uint64' },
      { name: 'fee', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },

  // ── Read ──
  {
    type: 'function',
    name: 'storage_',
    inputs: [],
    outputs: [
      { name: '', type: 'address', internalType: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'payments',
    inputs: [],
    outputs: [
      { name: '', type: 'address', internalType: 'address' },
    ],
    stateMutability: 'view',
  },

  // ── Events ──
  {
    type: 'event',
    name: 'EntryFeeUpdated',
    inputs: [
      { name: 'podId', type: 'uint64', indexed: true, internalType: 'uint64' },
      { name: 'newFee', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'creator', type: 'address', indexed: true, internalType: 'address' },
    ],
    anonymous: false,
  },

  // Custom errors
  { type: 'error', name: 'NotCreator', inputs: [] },
  { type: 'error', name: 'AlreadyPro', inputs: [] },
] as const

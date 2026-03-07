// ABI for QFLinkPodsAdmin — Single function: upgradePod

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

  // Custom errors
  { type: 'error', name: 'NotCreator', inputs: [] },
  { type: 'error', name: 'AlreadyPro', inputs: [] },
] as const

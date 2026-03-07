// ABI for QFLinkPodsRemoveMod — Single function: removeMod

export const podsRemoveModAbi = [
  // ── Write ──
  {
    type: 'function',
    name: 'removeMod',
    inputs: [
      { name: 'podId', type: 'uint64', internalType: 'uint64' },
      { name: 'user', type: 'address', internalType: 'address' },
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

  // Custom errors
  { type: 'error', name: 'NotCreator', inputs: [] },
  { type: 'error', name: 'NotMod', inputs: [] },
  { type: 'error', name: 'CannotRemoveCreator', inputs: [] },
] as const

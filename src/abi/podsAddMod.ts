// ABI for QFLinkPodsAddMod — Single function: addMod

export const podsAddModAbi = [
  // ── Write ──
  {
    type: 'function',
    name: 'addMod',
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
  { type: 'error', name: 'NotMember', inputs: [] },
  { type: 'error', name: 'AlreadyMod', inputs: [] },
  { type: 'error', name: 'ModCapReached', inputs: [] },
] as const

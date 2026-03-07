// ABI for QFLinkPodsJoin — Single function: joinPod

export const podsJoinAbi = [
  // ── Write ──
  {
    type: 'function',
    name: 'joinPod',
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
  {
    type: 'function',
    name: 'payments',
    inputs: [],
    outputs: [
      { name: '', type: 'address', internalType: 'address' },
    ],
    stateMutability: 'view',
  },

  // Custom errors
  { type: 'error', name: 'AlreadyMember', inputs: [] },
  { type: 'error', name: 'Banned', inputs: [] },
  { type: 'error', name: 'PodFull', inputs: [] },
  { type: 'error', name: 'PaymentRequired', inputs: [] },
] as const

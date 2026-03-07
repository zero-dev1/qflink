// ABI for QFLinkPodsLeave — Single function: leavePod

export const podsLeaveAbi = [
  // ── Write ──
  {
    type: 'function',
    name: 'leavePod',
    inputs: [
      { name: 'podId', type: 'uint64', internalType: 'uint64' },
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
  { type: 'error', name: 'NotMember', inputs: [] },
  { type: 'error', name: 'CreatorCantLeave', inputs: [] },
] as const

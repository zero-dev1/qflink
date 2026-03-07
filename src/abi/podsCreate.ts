// ABI for QFLinkPodsCreate — Single function: createPod

export const podsCreateAbi = [
  // ── Write ──
  {
    type: 'function',
    name: 'createPod',
    inputs: [
      { name: 'name', type: 'bytes32', internalType: 'bytes32' },
      { name: 'isPublic', type: 'bool', internalType: 'bool' },
      { name: 'threshold', type: 'uint256', internalType: 'uint256' },
      { name: 'category', type: 'bytes32', internalType: 'bytes32' },
      { name: 'description', type: 'bytes', internalType: 'bytes' },
    ],
    outputs: [
      { name: '', type: 'uint64', internalType: 'uint64' },
    ],
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
  { type: 'error', name: 'InvalidName', inputs: [] },
] as const

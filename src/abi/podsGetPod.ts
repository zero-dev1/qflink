// ABI for QFLinkPodsGetPod — Single function: getPod

export const podsGetPodAbi = [
  // ── Read ──
  {
    type: 'function',
    name: 'getPod',
    inputs: [
      { name: 'podId', type: 'uint64', internalType: 'uint64' },
    ],
    outputs: [
      { name: 'name', type: 'bytes32', internalType: 'bytes32' },
      { name: 'creator', type: 'address', internalType: 'address' },
      { name: 'isPublic', type: 'bool', internalType: 'bool' },
      { name: 'tier', type: 'uint8', internalType: 'uint8' },
      { name: 'memberCount', type: 'uint64', internalType: 'uint64' },
      { name: 'modCount', type: 'uint64', internalType: 'uint64' },
      { name: 'threshold', type: 'uint256', internalType: 'uint256' },
      { name: 'category', type: 'bytes32', internalType: 'bytes32' },
      { name: 'description', type: 'bytes', internalType: 'bytes' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'storage_',
    inputs: [],
    outputs: [
      { name: '', type: 'address', internalType: 'address' },
    ],
    stateMutability: 'view',
  },
] as const

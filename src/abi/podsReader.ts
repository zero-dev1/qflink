// ABI for QFLinkPodsReader — All view functions (no auth needed)

export const podsReaderAbi = [
  // ── Pod Info ──
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
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getCreator',
    inputs: [
      { name: 'podId', type: 'uint64', internalType: 'uint64' },
    ],
    outputs: [
      { name: '', type: 'address', internalType: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getPodTier',
    inputs: [
      { name: 'podId', type: 'uint64', internalType: 'uint64' },
    ],
    outputs: [
      { name: '', type: 'uint8', internalType: 'uint8' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getPodCount',
    inputs: [],
    outputs: [
      { name: '', type: 'uint64', internalType: 'uint64' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getMemberCount',
    inputs: [
      { name: 'podId', type: 'uint64', internalType: 'uint64' },
    ],
    outputs: [
      { name: '', type: 'uint64', internalType: 'uint64' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getModCount',
    inputs: [
      { name: 'podId', type: 'uint64', internalType: 'uint64' },
    ],
    outputs: [
      { name: '', type: 'uint64', internalType: 'uint64' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getThreshold',
    inputs: [
      { name: 'podId', type: 'uint64', internalType: 'uint64' },
    ],
    outputs: [
      { name: '', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getPodName',
    inputs: [
      { name: 'podId', type: 'uint64', internalType: 'uint64' },
    ],
    outputs: [
      { name: '', type: 'bytes32', internalType: 'bytes32' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isPublic',
    inputs: [
      { name: 'podId', type: 'uint64', internalType: 'uint64' },
    ],
    outputs: [
      { name: '', type: 'bool', internalType: 'bool' },
    ],
    stateMutability: 'view',
  },

  // ── Membership ──
  {
    type: 'function',
    name: 'isMember',
    inputs: [
      { name: 'podId', type: 'uint64', internalType: 'uint64' },
      { name: 'user', type: 'address', internalType: 'address' },
    ],
    outputs: [
      { name: '', type: 'bool', internalType: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isBanned',
    inputs: [
      { name: 'podId', type: 'uint64', internalType: 'uint64' },
      { name: 'user', type: 'address', internalType: 'address' },
    ],
    outputs: [
      { name: '', type: 'bool', internalType: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isMod',
    inputs: [
      { name: 'podId', type: 'uint64', internalType: 'uint64' },
      { name: 'user', type: 'address', internalType: 'address' },
    ],
    outputs: [
      { name: '', type: 'bool', internalType: 'bool' },
    ],
    stateMutability: 'view',
  },

  // ── Access Check ──
  {
    type: 'function',
    name: 'checkPodAccess',
    inputs: [
      { name: 'podId', type: 'uint64', internalType: 'uint64' },
      { name: 'user', type: 'address', internalType: 'address' },
    ],
    outputs: [
      { name: '', type: 'bool', internalType: 'bool' },
    ],
    stateMutability: 'view',
  },

  // ── Storage Reference ──
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

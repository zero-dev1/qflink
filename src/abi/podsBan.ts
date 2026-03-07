// ABI for QFLinkPodsBan — Ban/Unban functions

export const podsBanAbi = [
  // ── Write ──
  {
    type: 'function',
    name: 'banMember',
    inputs: [
      { name: 'podId', type: 'uint64', internalType: 'uint64' },
      { name: 'user', type: 'address', internalType: 'address' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'unbanMember',
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
  { type: 'error', name: 'NotModOrCreator', inputs: [] },
  { type: 'error', name: 'CannotBanCreator', inputs: [] },
] as const

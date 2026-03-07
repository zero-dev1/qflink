// ABI for the QFLinkRegistry v1 Solidity contract (resolc-optimized)

export const registryAbi = [
  {
    type: 'function',
    name: 'register',
    inputs: [
      { name: 'displayName', type: 'bytes32', internalType: 'bytes32' },
      { name: 'encryptionPubkey', type: 'bytes32', internalType: 'bytes32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'updateProfile',
    inputs: [
      { name: 'displayName', type: 'bytes32', internalType: 'bytes32' },
      { name: 'encryptionPubkey', type: 'bytes32', internalType: 'bytes32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getProfile',
    inputs: [
      { name: 'addr', type: 'address', internalType: 'address' },
    ],
    outputs: [
      { name: '', type: 'bytes32', internalType: 'bytes32' },
      { name: '', type: 'bytes32', internalType: 'bytes32' },
      { name: '', type: 'uint64', internalType: 'uint64' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getUserCount',
    inputs: [],
    outputs: [
      { name: '', type: 'uint64', internalType: 'uint64' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'profileExists',
    inputs: [
      { name: 'addr', type: 'address', internalType: 'address' },
    ],
    outputs: [
      { name: '', type: 'bool', internalType: 'bool' },
    ],
    stateMutability: 'view',
  },
  // Custom errors
  { type: 'error', name: 'UserExists', inputs: [] },
  { type: 'error', name: 'UserNotFound', inputs: [] },
  { type: 'error', name: 'InvalidName', inputs: [] },
] as const

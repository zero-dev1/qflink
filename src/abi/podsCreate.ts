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
  {
    type: 'function',
    name: 'setCreationFee',
    inputs: [
      { name: '_fee', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setSplit',
    inputs: [
      { name: '_treasuryShare', type: 'uint256', internalType: 'uint256' },
      { name: '_burnShare', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setBurnAddress',
    inputs: [
      { name: '_burnAddress', type: 'address', internalType: 'address' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setTreasury',
    inputs: [
      { name: '_treasury', type: 'address', internalType: 'address' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'transferOwnership',
    inputs: [
      { name: 'newOwner', type: 'address', internalType: 'address' },
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
  {
    type: 'function',
    name: 'creationFee',
    inputs: [],
    outputs: [
      { name: '', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'treasury',
    inputs: [],
    outputs: [
      { name: '', type: 'address', internalType: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'burnAddress',
    inputs: [],
    outputs: [
      { name: '', type: 'address', internalType: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'owner',
    inputs: [],
    outputs: [
      { name: '', type: 'address', internalType: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'treasuryShare',
    inputs: [],
    outputs: [
      { name: '', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'burnShare',
    inputs: [],
    outputs: [
      { name: '', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'view',
  },

  // Events
  {
    type: 'event',
    name: 'OwnershipTransferred',
    inputs: [
      { name: 'previousOwner', type: 'address', indexed: true, internalType: 'address' },
      { name: 'newOwner', type: 'address', indexed: true, internalType: 'address' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'CreationFeeUpdated',
    inputs: [
      { name: 'oldFee', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'newFee', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'SplitUpdated',
    inputs: [
      { name: 'treasuryShare', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'burnShare', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'BurnAddressUpdated',
    inputs: [
      { name: 'oldBurn', type: 'address', indexed: false, internalType: 'address' },
      { name: 'newBurn', type: 'address', indexed: false, internalType: 'address' },
    ],
    anonymous: false,
  },

  // Custom errors
  { type: 'error', name: 'InvalidName', inputs: [] },
  { type: 'error', name: 'InsufficientCreationFee', inputs: [] },
  { type: 'error', name: 'InvalidSplit', inputs: [] },
] as const

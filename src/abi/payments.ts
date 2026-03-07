// ABI for the QFLinkPayments Solidity contract
// Handles entry fees and payment tracking for pods

export const paymentsAbi = [
  // ── Write ──
  {
    type: 'function',
    name: 'payEntryFee',
    inputs: [
      { name: 'podId', type: 'uint64', internalType: 'uint64' },
    ],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'setEntryFee',
    inputs: [
      { name: 'podId', type: 'uint64', internalType: 'uint64' },
      { name: 'fee', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setPods',
    inputs: [
      { name: '_pods', type: 'address', internalType: 'address' },
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
    name: 'withdraw',
    inputs: [
      { name: 'amount', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'withdrawToTreasury',
    inputs: [
      { name: 'amount', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },

  // ── Read ──
  {
    type: 'function',
    name: 'getEntryFee',
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
    name: 'hasPaid',
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
    name: 'getContractBalance',
    inputs: [],
    outputs: [
      { name: '', type: 'uint256', internalType: 'uint256' },
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
    name: 'pods',
    inputs: [],
    outputs: [
      { name: '', type: 'address', internalType: 'address' },
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

  // Custom errors
  { type: 'error', name: 'NotAuthorized', inputs: [] },
  { type: 'error', name: 'NotOwner', inputs: [] },
  { type: 'error', name: 'InvalidFee', inputs: [] },
  { type: 'error', name: 'PaymentNotRequired', inputs: [] },
  { type: 'error', name: 'AlreadyPaid', inputs: [] },
  { type: 'error', name: 'InsufficientPayment', inputs: [] },
] as const

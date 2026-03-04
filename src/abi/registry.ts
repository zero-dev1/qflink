// ABI for the qflink-registry contract
// Derived from selectors in contracts.ts:
//   register(bytes,bytes32)
//   get_profile(address)
//   update_profile(bytes,bytes32)
//   link_wallet(address,bytes)
//   confirm_link(address)
//   unlink_wallet(address)
//   get_linked_wallets(address)
//   get_total_balance(address)
//   get_user_count()

export const registryAbi = [
  {
    type: 'function',
    name: 'register',
    inputs: [
      { name: 'display_name', type: 'bytes', internalType: 'bytes' },
      { name: 'encryption_pubkey', type: 'bytes32', internalType: 'bytes32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'get_profile',
    inputs: [
      { name: 'addr', type: 'address', internalType: 'address' },
    ],
    outputs: [
      { name: 'display_name', type: 'bytes', internalType: 'bytes' },
      { name: 'encryption_pubkey', type: 'bytes32', internalType: 'bytes32' },
      { name: 'registered_at', type: 'uint64', internalType: 'uint64' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'update_profile',
    inputs: [
      { name: 'display_name', type: 'bytes', internalType: 'bytes' },
      { name: 'encryption_pubkey', type: 'bytes32', internalType: 'bytes32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'link_wallet',
    inputs: [
      { name: 'linked_address', type: 'address', internalType: 'address' },
      { name: 'signature', type: 'bytes', internalType: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'confirm_link',
    inputs: [
      { name: 'primary_address', type: 'address', internalType: 'address' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'unlink_wallet',
    inputs: [
      { name: 'linked_address', type: 'address', internalType: 'address' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'get_linked_wallets',
    inputs: [
      { name: 'primary_address', type: 'address', internalType: 'address' },
    ],
    outputs: [
      { name: '', type: 'address[]', internalType: 'address[]' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'get_total_balance',
    inputs: [
      { name: 'primary_address', type: 'address', internalType: 'address' },
    ],
    outputs: [
      { name: '', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'get_user_count',
    inputs: [],
    outputs: [
      { name: '', type: 'uint64', internalType: 'uint64' },
    ],
    stateMutability: 'view',
  },
] as const

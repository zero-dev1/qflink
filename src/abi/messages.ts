// ABI for the qflink-messages contract
// Derived from selectors in contracts.ts:
//   send_message(address,bytes32,bytes24)
//   get_messages(address,address,uint64,uint64)
//   get_conversations(address)
//   get_message_count(address,address)

export const messagesAbi = [
  {
    type: 'function',
    name: 'send_message',
    inputs: [
      { name: 'recipient', type: 'address', internalType: 'address' },
      { name: 'content_hash', type: 'bytes32', internalType: 'bytes32' },
      { name: 'nonce', type: 'bytes24', internalType: 'bytes24' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'get_messages',
    inputs: [
      { name: 'addr1', type: 'address', internalType: 'address' },
      { name: 'addr2', type: 'address', internalType: 'address' },
      { name: 'start', type: 'uint64', internalType: 'uint64' },
      { name: 'limit', type: 'uint64', internalType: 'uint64' },
    ],
    outputs: [
      {
        name: '',
        type: 'tuple[]',
        internalType: 'struct DirectMessage[]',
        components: [
          { name: 'sender', type: 'address', internalType: 'address' },
          { name: 'recipient', type: 'address', internalType: 'address' },
          { name: 'content_hash', type: 'bytes32', internalType: 'bytes32' },
          { name: 'timestamp', type: 'uint64', internalType: 'uint64' },
          { name: 'nonce', type: 'bytes24', internalType: 'bytes24' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'get_conversations',
    inputs: [
      { name: 'addr', type: 'address', internalType: 'address' },
    ],
    outputs: [
      { name: '', type: 'address[]', internalType: 'address[]' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'get_message_count',
    inputs: [
      { name: 'addr1', type: 'address', internalType: 'address' },
      { name: 'addr2', type: 'address', internalType: 'address' },
    ],
    outputs: [
      { name: '', type: 'uint64', internalType: 'uint64' },
    ],
    stateMutability: 'view',
  },
] as const

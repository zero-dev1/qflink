// ABI for QFLinkMessageReader — read-only message contract (resolc-optimized)

export const messagesReaderAbi = [
  {
    type: 'function',
    name: 'getMessage',
    inputs: [
      { name: 'id', type: 'uint64', internalType: 'uint64' },
    ],
    outputs: [
      { name: 'sender', type: 'address', internalType: 'address' },
      { name: 'timestamp', type: 'uint64', internalType: 'uint64' },
      { name: 'content', type: 'string', internalType: 'string' },
      { name: 'podId', type: 'uint64', internalType: 'uint64' },
      { name: 'recipient', type: 'address', internalType: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getPodMessageIds',
    inputs: [
      { name: 'podId', type: 'uint64', internalType: 'uint64' },
      { name: 'offset', type: 'uint64', internalType: 'uint64' },
      { name: 'limit', type: 'uint64', internalType: 'uint64' },
    ],
    outputs: [
      { name: '', type: 'uint64[]', internalType: 'uint64[]' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getPodMessageCount',
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
    name: 'getDirectMessageIds',
    inputs: [
      { name: 'user1', type: 'address', internalType: 'address' },
      { name: 'user2', type: 'address', internalType: 'address' },
      { name: 'offset', type: 'uint64', internalType: 'uint64' },
      { name: 'limit', type: 'uint64', internalType: 'uint64' },
    ],
    outputs: [
      { name: '', type: 'uint64[]', internalType: 'uint64[]' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getConversations',
    inputs: [
      { name: 'user', type: 'address', internalType: 'address' },
    ],
    outputs: [
      { name: '', type: 'address[]', internalType: 'address[]' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getMessageCount',
    inputs: [],
    outputs: [
      { name: '', type: 'uint64', internalType: 'uint64' },
    ],
    stateMutability: 'view',
  },
] as const

// ABI for QFLinkMessageLogic — frontend-facing contract (triple-split, resolc-optimized)
// Returns ID arrays — frontend fetches individual messages via getMessage()

export const messagesAbi = [
  // ── Write ──
  {
    type: 'function',
    name: 'sendPodMessage',
    inputs: [
      { name: 'podId', type: 'uint64', internalType: 'uint64' },
      { name: 'content', type: 'string', internalType: 'string' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'sendMessage',
    inputs: [
      { name: 'recipient', type: 'address', internalType: 'address' },
      { name: 'content', type: 'string', internalType: 'string' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },

  // ── Read (single message) ──
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

  // ── Read (ID arrays) ──
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

  // Custom errors
  { type: 'error', name: 'NotPodMember', inputs: [] },
  { type: 'error', name: 'SelfMessage', inputs: [] },
  { type: 'error', name: 'EmptyContent', inputs: [] },
] as const

// ABI for QFLinkMessageWriterV2 — write-only message contract with session key support

export const messagesWriterV2Abi = [
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
  {
    type: 'function',
    name: 'updateSessionKeys',
    inputs: [
      { name: '_sessionKeys', type: 'address', internalType: 'address' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },

  // Custom errors
  { type: 'error', name: 'NotPodMember', inputs: [] },
  { type: 'error', name: 'SelfMessage', inputs: [] },
  { type: 'error', name: 'EmptyContent', inputs: [] },
] as const

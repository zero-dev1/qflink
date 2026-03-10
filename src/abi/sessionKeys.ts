// ABI for QFLinkSessionKeys — session key registry contract

export const sessionKeysAbi = [
  {
    type: 'function',
    name: 'registerSessionKey',
    inputs: [
      { name: 'sessionKey', type: 'address', internalType: 'address' },
      { name: 'durationSeconds', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'revokeSession',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'validateSession',
    inputs: [
      { name: 'sessionKey', type: 'address', internalType: 'address' },
    ],
    outputs: [
      { name: 'valid', type: 'bool', internalType: 'bool' },
      { name: 'owner', type: 'address', internalType: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getOwner',
    inputs: [
      { name: 'sessionKey', type: 'address', internalType: 'address' },
    ],
    outputs: [
      { name: '', type: 'address', internalType: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getActiveSession',
    inputs: [
      { name: 'owner', type: 'address', internalType: 'address' },
    ],
    outputs: [
      { name: 'sessionKey', type: 'address', internalType: 'address' },
      { name: 'expiry', type: 'uint64', internalType: 'uint64' },
      { name: 'revoked', type: 'bool', internalType: 'bool' },
      { name: 'isActive', type: 'bool', internalType: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'activeSessionKey',
    inputs: [
      { name: '', type: 'address', internalType: 'address' },
    ],
    outputs: [
      { name: '', type: 'address', internalType: 'address' },
    ],
    stateMutability: 'view',
  },

  // Events
  {
    type: 'event',
    name: 'SessionRegistered',
    inputs: [
      { name: 'owner', type: 'address', indexed: true, internalType: 'address' },
      { name: 'sessionKey', type: 'address', indexed: true, internalType: 'address' },
      { name: 'expiry', type: 'uint64', indexed: false, internalType: 'uint64' },
    ],
  },
  {
    type: 'event',
    name: 'SessionRevoked',
    inputs: [
      { name: 'owner', type: 'address', indexed: true, internalType: 'address' },
      { name: 'sessionKey', type: 'address', indexed: true, internalType: 'address' },
    ],
  },
] as const

export const podsCreatePaidAbi = [
  {
    type: 'function',
    name: 'createPaidPod',
    inputs: [
      { name: 'name', type: 'bytes32' },
      { name: 'isPublic', type: 'bool' },
      { name: 'threshold', type: 'uint256' },
      { name: 'entryFee', type: 'uint256' },
      { name: 'category', type: 'bytes32' },
      { name: 'description', type: 'bytes' }
    ],
    outputs: [{ name: '', type: 'uint64' }],
    stateMutability: 'payable'
  }
] as const;

// ABI for the qflink-pods contract
// Derived from selectors in contracts.ts

export const podsAbi = [
  // ── Pod CRUD ──
  {
    type: 'function',
    name: 'create_pod',
    inputs: [
      { name: 'name', type: 'bytes', internalType: 'bytes' },
      { name: 'description', type: 'bytes', internalType: 'bytes' },
      { name: 'min_balance', type: 'uint256', internalType: 'uint256' },
      { name: 'entry_fee', type: 'uint256', internalType: 'uint256' },
      { name: 'payout_wallet', type: 'address', internalType: 'address' },
    ],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'get_pod',
    inputs: [
      { name: 'pod_id', type: 'uint64', internalType: 'uint64' },
    ],
    outputs: [
      { name: 'id', type: 'uint64', internalType: 'uint64' },
      { name: 'name', type: 'bytes', internalType: 'bytes' },
      { name: 'description', type: 'bytes', internalType: 'bytes' },
      { name: 'min_balance', type: 'uint256', internalType: 'uint256' },
      { name: 'creator', type: 'address', internalType: 'address' },
      { name: 'created_at', type: 'uint64', internalType: 'uint64' },
      { name: 'is_default', type: 'bool', internalType: 'bool' },
      { name: 'pod_type', type: 'uint8', internalType: 'uint8' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'get_pod_count',
    inputs: [],
    outputs: [
      { name: '', type: 'uint64', internalType: 'uint64' },
    ],
    stateMutability: 'view',
  },

  // ── Membership ──
  {
    type: 'function',
    name: 'join_pod',
    inputs: [
      { name: 'pod_id', type: 'uint64', internalType: 'uint64' },
    ],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'leave_pod',
    inputs: [
      { name: 'pod_id', type: 'uint64', internalType: 'uint64' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'get_user_pods',
    inputs: [
      { name: 'addr', type: 'address', internalType: 'address' },
    ],
    outputs: [
      { name: '', type: 'uint64[]', internalType: 'uint64[]' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'get_pod_members',
    inputs: [
      { name: 'pod_id', type: 'uint64', internalType: 'uint64' },
    ],
    outputs: [
      { name: '', type: 'address[]', internalType: 'address[]' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'get_pod_member_count',
    inputs: [
      { name: 'pod_id', type: 'uint64', internalType: 'uint64' },
    ],
    outputs: [
      { name: '', type: 'uint64', internalType: 'uint64' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'check_pod_access',
    inputs: [
      { name: 'pod_id', type: 'uint64', internalType: 'uint64' },
      { name: 'addr', type: 'address', internalType: 'address' },
    ],
    outputs: [
      { name: '', type: 'uint8', internalType: 'uint8' },
    ],
    stateMutability: 'view',
  },

  // ── Messages ──
  {
    type: 'function',
    name: 'send_pod_message',
    inputs: [
      { name: 'pod_id', type: 'uint64', internalType: 'uint64' },
      { name: 'content_hash', type: 'bytes32', internalType: 'bytes32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'get_pod_messages',
    inputs: [
      { name: 'pod_id', type: 'uint64', internalType: 'uint64' },
      { name: 'start', type: 'uint64', internalType: 'uint64' },
      { name: 'limit', type: 'uint64', internalType: 'uint64' },
    ],
    outputs: [
      {
        name: '',
        type: 'tuple[]',
        internalType: 'struct PodMessage[]',
        components: [
          { name: 'sender', type: 'address', internalType: 'address' },
          { name: 'content_hash', type: 'bytes32', internalType: 'bytes32' },
          { name: 'timestamp', type: 'uint64', internalType: 'uint64' },
        ],
      },
    ],
    stateMutability: 'view',
  },

  // ── Moderation ──
  {
    type: 'function',
    name: 'ban_member',
    inputs: [
      { name: 'pod_id', type: 'uint64', internalType: 'uint64' },
      { name: 'target', type: 'address', internalType: 'address' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'unban_member',
    inputs: [
      { name: 'pod_id', type: 'uint64', internalType: 'uint64' },
      { name: 'target', type: 'address', internalType: 'address' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'add_mod',
    inputs: [
      { name: 'pod_id', type: 'uint64', internalType: 'uint64' },
      { name: 'moderator', type: 'address', internalType: 'address' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'remove_mod',
    inputs: [
      { name: 'pod_id', type: 'uint64', internalType: 'uint64' },
      { name: 'moderator', type: 'address', internalType: 'address' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'get_mods',
    inputs: [
      { name: 'pod_id', type: 'uint64', internalType: 'uint64' },
    ],
    outputs: [
      { name: '', type: 'address[]', internalType: 'address[]' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'is_banned',
    inputs: [
      { name: 'pod_id', type: 'uint64', internalType: 'uint64' },
      { name: 'addr', type: 'address', internalType: 'address' },
    ],
    outputs: [
      { name: '', type: 'bool', internalType: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'is_mod',
    inputs: [
      { name: 'pod_id', type: 'uint64', internalType: 'uint64' },
      { name: 'addr', type: 'address', internalType: 'address' },
    ],
    outputs: [
      { name: '', type: 'bool', internalType: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'global_ban',
    inputs: [
      { name: 'target', type: 'address', internalType: 'address' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'global_unban',
    inputs: [
      { name: 'target', type: 'address', internalType: 'address' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'is_globally_banned',
    inputs: [
      { name: 'addr', type: 'address', internalType: 'address' },
    ],
    outputs: [
      { name: '', type: 'bool', internalType: 'bool' },
    ],
    stateMutability: 'view',
  },

  // ── Tier / Fee ──
  {
    type: 'function',
    name: 'get_pod_tier',
    inputs: [
      { name: 'pod_id', type: 'uint64', internalType: 'uint64' },
    ],
    outputs: [
      { name: '', type: 'uint8', internalType: 'uint8' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'upgrade_pod',
    inputs: [
      { name: 'pod_id', type: 'uint64', internalType: 'uint64' },
    ],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'get_pod_fee',
    inputs: [
      { name: 'pod_id', type: 'uint64', internalType: 'uint64' },
    ],
    outputs: [
      { name: '', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'has_paid',
    inputs: [
      { name: 'pod_id', type: 'uint64', internalType: 'uint64' },
      { name: 'addr', type: 'address', internalType: 'address' },
    ],
    outputs: [
      { name: '', type: 'bool', internalType: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'get_pro_fee',
    inputs: [],
    outputs: [
      { name: '', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'set_pro_fee',
    inputs: [
      { name: 'amount', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'get_treasury',
    inputs: [],
    outputs: [
      { name: '', type: 'address', internalType: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'set_treasury',
    inputs: [
      { name: 'addr', type: 'address', internalType: 'address' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const

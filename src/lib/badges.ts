import { namehash } from 'viem/ens';
import { callContract } from './contractHelpers';
import { CONTRACT_ADDRESSES } from './contracts';

// Badge registry ABI — matches the deployed QNS badge contract
const badgeRegistryAbi = [
  {
    name: 'hasBadge',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'nameHash', type: 'bytes32' },
      { name: 'badgeType', type: 'string' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

export const BADGE_TYPES = {
  pioneer: { label: 'Pioneer', color: '#FFD700', icon: 'crown', shimmer: true },
  team: { label: 'Team', color: '#DADADA', icon: 'shield', shimmer: false },
  dapplab: { label: 'dApp Lab', color: '#00EFE7', icon: 'flask', shimmer: false },
  ambassador: { label: 'Ambassador', color: '#FF6B35', icon: 'megaphone', shimmer: false },
} as const;

export type BadgeType = keyof typeof BADGE_TYPES;

export interface UserBadge {
  type: BadgeType;
  label: string;
  color: string;
  icon: string;
  shimmer?: boolean;
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

/**
 * Fetch all badges for a .qf name from the on-chain badge registry.
 * Returns empty array if contract not deployed or name has no badges.
 */
export async function getBadgesForName(qfName: string): Promise<UserBadge[]> {
  if (
    !qfName ||
    !CONTRACT_ADDRESSES.qnsBadgeRegistry ||
    CONTRACT_ADDRESSES.qnsBadgeRegistry === ZERO_ADDRESS
  ) {
    return [];
  }

  // Ensure the name ends with .qf
  const fullName = qfName.endsWith('.qf') ? qfName : `${qfName}.qf`;
  const node = namehash(fullName);

  const badgeTypes = Object.keys(BADGE_TYPES) as BadgeType[];
  const badges: UserBadge[] = [];

  // Check each badge type in parallel
  const results = await Promise.allSettled(
    badgeTypes.map(async (type) => {
      try {
        const has = await callContract(
          CONTRACT_ADDRESSES.qnsBadgeRegistry,
          [...badgeRegistryAbi],
          'hasBadge',
          [node, type]
        );
        return { type, has: !!has };
      } catch {
        return { type, has: false };
      }
    })
  );

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.has) {
      const type = result.value.type;
      const info = BADGE_TYPES[type];
      badges.push({
        type,
        label: info.label,
        color: info.color,
        icon: info.icon,
        shimmer: info.shimmer,
      });
    }
  }

  return badges;
}

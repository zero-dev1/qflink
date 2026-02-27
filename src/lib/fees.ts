import type { PodTier } from '@/types'
import { POD_TIER_INFO } from '@/types'

export const TREASURY_PCT = 25
export const BURN_PCT = 75

export interface FeeSplit {
  total: bigint
  treasury: bigint
  burned: bigint
}

/**
 * Calculate the fee split for a given pod tier.
 */
export function calculateFeeSplit(tier: PodTier): FeeSplit {
  const total = POD_TIER_INFO[tier].fee
  const treasury = total * BigInt(TREASURY_PCT) / BigInt(100)
  const burned = total * BigInt(BURN_PCT) / BigInt(100)
  return { total, treasury, burned }
}

/**
 * Check if a user can afford to create a pod of a given tier.
 */
export function canAffordTier(balance: bigint, tier: PodTier): boolean {
  return balance >= POD_TIER_INFO[tier].fee
}

/**
 * Check if a user's aggregated balance meets a pod's minimum requirement.
 */
export function meetsMinBalance(
  primaryBalance: bigint,
  linkedBalances: bigint[],
  minBalance: bigint
): boolean {
  const total = linkedBalances.reduce((sum, b) => sum + b, primaryBalance)
  return total >= minBalance
}

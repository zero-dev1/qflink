import React from 'react'
import { formatCompactBalance } from '@/lib/utils'

interface TokenGateBarProps {
  userBalance: bigint | number
  threshold: bigint | number
}

/**
 * TokenGateBar - A reusable progress bar component for token-gated pods
 * 
 * Shows user's progress toward meeting the minimum balance threshold.
 * - If threshold is 0: renders nothing
 * - If userBalance >= threshold: renders a full bar with "Qualified ✓"
 * - If userBalance < threshold: renders a partial bar with "You hold X QF" and "Y to go"
 */
export const TokenGateBar: React.FC<TokenGateBarProps> = ({
  userBalance,
  threshold,
}) => {
  // Convert to bigint for consistent comparison
  const balanceBigInt = typeof userBalance === 'number' ? BigInt(Math.floor(userBalance)) : userBalance
  const thresholdBigInt = typeof threshold === 'number' ? BigInt(Math.floor(threshold)) : threshold

  // If threshold is 0, render nothing
  if (thresholdBigInt === 0n) {
    return null
  }

  // Calculate percentage filled (capped at 100%)
  const percentage = thresholdBigInt > 0n
    ? Math.min(Number((balanceBigInt * 100n) / thresholdBigInt), 100)
    : 0

  // Check if user qualifies
  const isQualified = balanceBigInt >= thresholdBigInt

  // Calculate remaining amount
  const remaining = thresholdBigInt > balanceBigInt ? thresholdBigInt - balanceBigInt : 0n

  return (
    <div className="w-full">
      {/* Progress bar track (gray background - light/dark mode) */}
      <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
        {/* Progress bar fill (cyan accent - matches app buttons) */}
        <div
          className="h-full rounded-full bg-cyan-600 transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      {/* Labels */}
      <div className="flex items-center justify-between mt-1.5">
        {isQualified ? (
          <span className="text-xs font-medium text-cyan-600">Qualified ✓</span>
        ) : (
          <>
            <span className="text-xs text-cyan-600">
              You hold <span className="font-medium">{formatCompactBalance(balanceBigInt)} QF</span>
            </span>
            <span className="text-xs text-cyan-600">
              {formatCompactBalance(remaining)} to go
            </span>
          </>
        )}
      </div>
    </div>
  )
}

export default TokenGateBar

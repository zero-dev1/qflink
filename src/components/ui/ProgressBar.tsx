import React from 'react'
import { cn } from '@/lib/utils'

interface ProgressBarProps {
  current: bigint
  target: bigint
  className?: string
  showLabels?: boolean
  formatValue?: (val: bigint) => string
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  current,
  target,
  className,
  showLabels = true,
  formatValue,
}) => {
  const pct = target > 0n ? Number((current * 100n) / target) : 0
  const clampedPct = Math.min(pct, 100)
  const remaining = target > current ? target - current : 0n

  const fmt = formatValue || ((v: bigint) => {
    const whole = v / (10n ** 18n)
    if (whole >= 1_000_000n) return `${(Number(whole) / 1_000_000).toFixed(1)}M`
    if (whole >= 1_000n) return `${(Number(whole) / 1_000).toFixed(0)}K`
    return whole.toString()
  })

  return (
    <div className={cn('w-full', className)}>
      <div className="h-1.5 w-full rounded-full bg-qx-border-prominent overflow-hidden">
        <div
          className="h-full rounded-full bg-cyan-600 transition-all duration-500"
          style={{ width: `${clampedPct}%` }}
        />
      </div>
      {showLabels && (
        <div className="flex items-center justify-between mt-1.5 text-xs">
          {remaining > 0n ? (
            <span className="text-qx-text-muted">{fmt(remaining)} to go</span>
          ) : (
            <span className="text-qx-success font-medium">Qualified ✓</span>
          )}
        </div>
      )}
    </div>
  )
}

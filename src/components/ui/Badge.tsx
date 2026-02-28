import React from 'react'
import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'success' | 'warning' | 'error'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-qx-border-prominent text-qx-text-secondary',
  success: 'bg-qx-success/20 text-qx-success',
  warning: 'bg-qx-warning/20 text-qx-warning',
  error: 'bg-qx-error/20 text-qx-error',
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'default', children, className }) => {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

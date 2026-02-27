import React from 'react'
import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'success' | 'warning' | 'error'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-qf-border-prominent text-qf-text-secondary',
  success: 'bg-qf-success/20 text-qf-success',
  warning: 'bg-qf-warning/20 text-qf-warning',
  error: 'bg-qf-error/20 text-qf-error',
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

import React from 'react'
import { cn } from '@/lib/utils'

interface CardProps {
  className?: string
  children: React.ReactNode
  header?: {
    title: string
    action?: React.ReactNode
  }
  padding?: 'sm' | 'md'
}

export const Card: React.FC<CardProps> = ({ className, children, header, padding = 'md' }) => {
  return (
    <div
      className={cn(
        'rounded-none border border-gray-200 dark:border-gray-800 bg-transparent transition-[border-color,transform] duration-150 hover:border-cyan-600 hover:-translate-y-0.5',
        padding === 'sm' ? 'p-4' : 'p-6',
        className
      )}
    >
      {header && (
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-qx-text-primary">{header.title}</h3>
          {header.action}
        </div>
      )}
      {children}
    </div>
  )
}

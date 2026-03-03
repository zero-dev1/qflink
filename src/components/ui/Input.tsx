import React from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input: React.FC<InputProps> = ({ label, error, className, id, ...props }) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-qx-text-secondary">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'h-10 w-full border border-qx-border-prominent bg-qx-card px-3 text-sm text-qx-text-primary placeholder:text-qx-text-muted',
          'transition-colors duration-150',
          'focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600',
          error && 'border-qx-error focus:border-qx-error focus:ring-qx-error',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-qx-error">{error}</p>}
    </div>
  )
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea: React.FC<TextareaProps> = ({ label, error, className, id, ...props }) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-qx-text-secondary">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={cn(
          'w-full border border-qx-border-prominent bg-qx-card px-3 py-2 text-sm text-qx-text-primary placeholder:text-qx-text-muted',
          'transition-colors duration-150 resize-none',
          'focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600',
          error && 'border-qx-error focus:border-qx-error focus:ring-qx-error',
          className
        )}
        rows={4}
        {...props}
      />
      {error && <p className="text-xs text-qx-error">{error}</p>}
    </div>
  )
}

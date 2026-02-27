import React from 'react'
import { useUIStore } from '@/stores/ui'
import { cn } from '@/lib/utils'
import type { ToastType } from '@/types'

const iconMap: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  warning: '⚠',
}

const styleMap: Record<ToastType, string> = {
  success: 'border-qf-success/30 bg-qf-success/10',
  error: 'border-qf-error/30 bg-qf-error/10',
  info: 'border-qf-accent/30 bg-qf-accent/10',
  warning: 'border-qf-warning/30 bg-qf-warning/10',
}

const iconColorMap: Record<ToastType, string> = {
  success: 'text-qf-success',
  error: 'text-qf-error',
  info: 'dark:text-qf-accent text-qf-text-primary',
  warning: 'text-qf-warning',
}

export const ToastContainer: React.FC = () => {
  const toasts = useUIStore((s) => s.toasts)
  const removeToast = useUIStore((s) => s.removeToast)

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg animate-slide-up min-w-[300px] max-w-[400px]',
            styleMap[toast.type]
          )}
        >
          <span className={cn('text-lg flex-shrink-0', iconColorMap[toast.type])}>
            {iconMap[toast.type]}
          </span>
          <p className="text-sm text-qf-text-primary flex-1">{toast.message}</p>
          <button
            onClick={() => removeToast(toast.id)}
            className="flex-shrink-0 text-qf-text-muted hover:text-qf-text-primary transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}

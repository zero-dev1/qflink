import { useUIStore } from '@/stores/ui'
import type { ToastType } from '@/types'

export function useToast() {
  const addToast = useUIStore((s) => s.addToast)
  const removeToast = useUIStore((s) => s.removeToast)
  const toasts = useUIStore((s) => s.toasts)

  return {
    toasts,
    addToast: (type: ToastType, message: string, duration?: number) =>
      addToast(type, message, duration),
    removeToast,
    success: (message: string) => addToast('success', message),
    error: (message: string) => addToast('error', message),
    info: (message: string) => addToast('info', message),
    warning: (message: string) => addToast('warning', message),
  }
}

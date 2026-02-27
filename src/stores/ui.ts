import { create } from 'zustand'
import type { UIState, ToastType, Toast, Theme } from '@/types'
import { generateId } from '@/lib/utils'

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'system'
  const stored = localStorage.getItem('qflink-theme') as Theme | null
  return stored || 'system'
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
  } else if (theme === 'light') {
    root.classList.remove('dark')
  } else {
    // system
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (prefersDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }
}

// Apply initial theme immediately
const initialTheme = getInitialTheme()
if (typeof window !== 'undefined') {
  applyTheme(initialTheme)
}

export const useUIStore = create<UIState>((set, get) => ({
  theme: initialTheme,
  toasts: [],
  isSidebarOpen: true,
  showConnectWallet: false,

  setTheme: (theme: Theme) => {
    localStorage.setItem('qflink-theme', theme)
    applyTheme(theme)
    set({ theme })
  },

  addToast: (type: ToastType, message: string, duration = 5000) => {
    const toast: Toast = { id: generateId(), type, message, duration }
    set({ toasts: [...get().toasts, toast] })

    setTimeout(() => {
      get().removeToast(toast.id)
    }, duration)
  },

  removeToast: (id: string) => {
    set({ toasts: get().toasts.filter((t) => t.id !== id) })
  },

  toggleSidebar: () => set({ isSidebarOpen: !get().isSidebarOpen }),

  setSidebarOpen: (open: boolean) => set({ isSidebarOpen: open }),

  setShowConnectWallet: (show: boolean) => set({ showConnectWallet: show }),
}))

// Listen for system theme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const { theme } = useUIStore.getState()
    if (theme === 'system') {
      applyTheme('system')
    }
  })
}

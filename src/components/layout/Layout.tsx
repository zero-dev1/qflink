import React, { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar, BottomNav } from './Sidebar'
import { Header } from './Header'
import { Spinner } from '@/components/ui/Spinner'
import { useWalletStore } from '@/stores/wallet'

const PageLoader: React.FC = () => (
  <div className="flex flex-1 items-center justify-center">
    <Spinner size="lg" />
  </div>
)

export const Layout: React.FC = () => {
  const isRehydrating = useWalletStore((s) => s._rehydrating)

  return (
    <div className="flex min-h-screen bg-white dark:bg-[#0D0D0D]">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <Header />
        {/* Reconnecting banner — subtle, doesn't block content */}
        {isRehydrating && (
          <div className="flex items-center justify-center gap-2 py-1.5 bg-cyan-600/10 border-b border-cyan-600/20">
            <Spinner size="sm" />
            <span className="text-xs text-cyan-600">Reconnecting wallet...</span>
          </div>
        )}
        <main className="flex-1 flex flex-col pb-16 md:pb-0 overflow-auto">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <BottomNav />
    </div>
  )
}

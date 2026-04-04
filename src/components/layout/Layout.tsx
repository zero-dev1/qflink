import React, { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar, BottomNav } from './Sidebar'
import { Header } from './Header'
import { Spinner } from '@/components/ui/Spinner'

const PageLoader: React.FC = () => (
  <div className="flex flex-1 items-center justify-center">
    <Spinner size="lg" />
  </div>
)

export const Layout: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-white dark:bg-[#0D0D0D]">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <Header />
        <main className="flex-1 pb-16 md:pb-0 overflow-auto">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <BottomNav />
    </div>
  )
}

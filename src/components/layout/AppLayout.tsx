// src/components/layout/AppLayout.tsx
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { MobileTabBar } from './MobileTabBar';
import { PageTransition } from './PageTransition';
import { ModePill } from '@/components/ui/ModePill';
import { useWalletStore } from '@/stores/wallet';

export function AppLayout() {
  const location = useLocation();
  const { isConnected } = useWalletStore();

  return (
    <div className="flex h-screen bg-base overflow-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:bg-cyan-primary focus:text-on-cyan focus:px-4 focus:py-2 focus:rounded-default focus:text-label"
      >
        Skip to content
      </a>

      <Sidebar />

      <main id="main-content" className="flex-1 flex flex-col overflow-hidden pb-14 md:pb-0">
        {/* Mode pill — centered top of content area */}
        {isConnected && (
          <div className="shrink-0 py-2 px-4">
            <ModePill />
          </div>
        )}

        {/* Content — left-aligned, not centered */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>
              <Outlet />
            </PageTransition>
          </AnimatePresence>
        </div>
      </main>

      <MobileTabBar />
    </div>
  );
}

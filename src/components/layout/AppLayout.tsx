// src/components/layout/AppLayout.tsx
// 3-column layout: Sidebar | Main Content | DetailPanel
import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Sidebar } from './Sidebar';
import { DetailPanel } from './DetailPanel';
import { MobileTabBar } from './MobileTabBar';
import { PageTransition } from './PageTransition';
import { ModePill } from '@/components/ui/ModePill';
import { useWalletStore } from '@/stores/wallet';
import { usePodsStore } from '@/stores/pods';
import { useMessagesStore } from '@/stores/messages';
import { useVisibilityPolling } from '@/hooks/useVisibilityPolling';
import { useTabReturn } from '@/hooks/useTabReturn';

export function AppLayout() {
  const location = useLocation();
  const isConnected = useWalletStore((s) => s.isConnected);
  const fetchPods = usePodsStore((s) => s.fetchPods);
  const fetchUserPods = usePodsStore((s) => s.fetchUserPods);
  const fetchConversations = useMessagesStore((s) => s.fetchConversations);

  // §24 — Tab return opacity breath on main content
  const breathClass = useTabReturn();

  // One-time fetch when entering the app shell (or when wallet connects)
  useEffect(() => {
    fetchPods();
    if (isConnected) {
      fetchUserPods();
      fetchConversations();
    }
  }, [isConnected, fetchPods, fetchUserPods, fetchConversations]);

  // Single global poll - replaces per-page polls for pods/conversations
  useVisibilityPolling(
    () => {
      fetchPods();
      if (isConnected) {
        fetchUserPods();
        fetchConversations();
      }
    },
    15000,
    [isConnected, fetchPods, fetchUserPods, fetchConversations],
  );

  return (
    <div className="flex h-screen bg-base overflow-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:bg-cyan-primary focus:text-on-cyan focus:px-4 focus:py-2 focus:rounded-default focus:text-label"
      >
        Skip to content
      </a>

      {/* Column 1 — Sidebar */}
      <Sidebar />

      {/* Column 2 — Main content */}
      <main id="main-content" className={`flex-1 min-w-0 flex flex-col overflow-hidden pb-14 md:pb-0 ${breathClass}`}>
        {/* Mode pill — centered top of content area */}
        {isConnected && (
          <div className="shrink-0 py-2 px-4">
            <ModePill />
          </div>
        )}

        <div className="flex-1 overflow-hidden">
          <ErrorBoundary key={location.pathname}>
            <AnimatePresence mode="wait">
              <PageTransition key={location.pathname}>
                <Outlet />
              </PageTransition>
            </AnimatePresence>
          </ErrorBoundary>
        </div>
      </main>

      {/* Column 3 — Contextual detail panel (desktop only) */}
      <DetailPanel />

      <MobileTabBar />
    </div>
  );
}

import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Sidebar } from "./Sidebar";
import { MobileTabBar } from "./MobileTabBar";
import { PageTransition } from "./PageTransition";

export function AppLayout() {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-base overflow-hidden">
      {/* Skip to content link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:bg-cyan-primary focus:text-on-cyan focus:px-4 focus:py-2 focus:rounded-default focus:text-label"
      >
        Skip to content
      </a>
      
      <Sidebar />
      <main id="main-content" className="flex-1 overflow-y-auto pb-14 md:pb-0">
        <AnimatePresence mode="wait">
          <PageTransition key={location.pathname}>
            <Outlet />
          </PageTransition>
        </AnimatePresence>
      </main>
      <MobileTabBar />
    </div>
  );
}

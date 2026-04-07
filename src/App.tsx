// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Suspense, lazy, type ReactNode } from "react";
import { MotionConfig, LayoutGroup } from "framer-motion";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppLayout } from "@/components/layout/AppLayout";
import { ToastContainer } from "@/components/ui/Toast";
import { ActionBar } from "@/components/ui/ActionBar";

// Standalone pages (no sidebar)
const Landing = lazy(() => import("@/pages/Landing"));
const Connect = lazy(() => import("@/pages/Connect"));

// App pages (inside layout shell)
const Home = lazy(() => import("@/pages/Home"));
const Explore = lazy(() => import("@/pages/Explore"));
const PodChat = lazy(() => import("@/pages/PodChat"));
const Messages = lazy(() => import("@/pages/Messages"));
const DMChat = lazy(() => import("@/pages/DMChat"));
const Profile = lazy(() => import("@/pages/Profile"));
const CreatorDashboard = lazy(() => import("@/pages/CreatorDashboard"));

function PageLoader() {
  return (
    <div className="h-screen bg-base relative">
      {/* §26.3 — Thin pulsing cyan line at top, not spinners */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/[0.04] overflow-hidden">
        <div className="h-full w-1/3 bg-cyan-primary animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
      </div>
    </div>
  );
}

function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const location = useLocation();
  return <ErrorBoundary key={location.pathname}>{children}</ErrorBoundary>;
}

export default function App() {
  return (
    <ErrorBoundary>
      {/* §28 — Respect prefers-reduced-motion for all Framer Motion animations */}
      <MotionConfig reducedMotion="user">
        <BrowserRouter>
          <RouteErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <LayoutGroup>
            <Routes>
              {/* Standalone — no app chrome */}
              <Route path="/" element={<Landing />} />
              <Route path="/connect" element={<Connect />} />

              {/* App — sidebar + content */}
              <Route element={<AppLayout />}>
                <Route path="/home" element={<Home />} />
                <Route path="/explore" element={<Explore />} />
                <Route path="/pod/:id" element={<PodChat />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/dm/:address" element={<DMChat />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/creator/:podId" element={<CreatorDashboard />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            </LayoutGroup>
          </Suspense>
          </RouteErrorBoundary>
          <ToastContainer />
          <ActionBar />
        </BrowserRouter>
      </MotionConfig>
    </ErrorBoundary>
  );
}

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ToastContainer } from "@/components/ui/Toast";

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
    <div className="flex h-screen items-center justify-center bg-base">
      <div className="h-8 w-8 border-2 border-border-medium border-t-cyan-primary rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
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
      </Suspense>
      <ToastContainer />
    </BrowserRouter>
  );
}

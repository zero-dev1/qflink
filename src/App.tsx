import React, { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { AuthGuard } from '@/components/AuthGuard'
import { Spinner } from '@/components/ui/Spinner'
import { useWalletStore } from '@/stores/wallet'
import { usePodsStore } from '@/stores/pods'

const LandingPage = lazy(() => import('@/pages/LandingPage'))
const ConnectPage = lazy(() => import('@/pages/ConnectPage'))
const HomePage = lazy(() => import('@/pages/HomePage'))
const ExplorePage = lazy(() => import('@/pages/ExplorePage'))
const PodsPage = lazy(() => import('@/pages/PodsPage'))
const PodPage = lazy(() => import('@/pages/PodPage'))
const DirectMessagesPage = lazy(() => import('@/pages/DirectMessagesPage'))
const DMChatPage = lazy(() => import('@/pages/DMChatPage'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const CreatePodPage = lazy(() => import('@/pages/CreatePodPage'))
const WhitepaperPage = lazy(() => import('@/pages/WhitepaperPage'))
const CreatorsPage = lazy(() => import('@/pages/CreatorsPage'))
const CommunitiesPage = lazy(() => import('@/pages/CommunitiesPage'))

const PageLoader: React.FC = () => (
  <div className="flex h-screen items-center justify-center">
    <Spinner size="lg" />
  </div>
)

// Wrapper for protected routes that includes Layout and AuthGuard
const ProtectedLayout: React.FC = () => (
  <AuthGuard>
    <Layout />
  </AuthGuard>
)

const App: React.FC = () => {
  const isConnected = useWalletStore((s) => s.isConnected)
  const fetchPods = usePodsStore((s) => s.fetchPods)

  useEffect(() => {
    if (isConnected) {
      fetchPods().catch((err) => {
        console.error('Failed to fetch pods on app mount:', err)
      })
    }
  }, [isConnected, fetchPods])

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Landing page - public, no layout wrapper */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Connect page - public, no layout wrapper, no auth guard */}
          <Route path="/connect" element={<ConnectPage />} />
          
          {/* Whitepaper - public, no layout wrapper, no auth guard */}
          <Route path="/whitepaper" element={<WhitepaperPage />} />
          
          {/* Marketing pages - public */}
          <Route path="/creators" element={<CreatorsPage />} />
          <Route path="/communities" element={<CommunitiesPage />} />
          
          {/* App routes - protected with AuthGuard and wrapped with Layout */}
          <Route element={<ProtectedLayout />}>
            <Route path="/home" element={<HomePage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/pods" element={<PodsPage />} />
            <Route path="/pods/:podId" element={<PodsPage />} />
            <Route path="/pod/:id" element={<PodPage />} />
            <Route path="/direct" element={<DirectMessagesPage />} />
            <Route path="/direct/:address" element={<DMChatPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/:address" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/create-pod" element={<CreatePodPage />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App

import React, { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { Spinner } from '@/components/ui/Spinner'
import { ConnectWalletModal } from '@/components/wallet/ConnectWalletModal'
import { ToastContainer } from '@/components/ui/Toast'
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
const CreatorDashboardPage = lazy(() => import('@/pages/CreatorDashboardPage'))
const AdminPage = lazy(() => import('@/pages/AdminPage'))

const PageLoader: React.FC = () => (
  <div className="flex h-screen items-center justify-center bg-[#0D0D0D]">
    <Spinner size="lg" />
  </div>
)

// Redirect connected users from landing to home
const LandingRedirect: React.FC = () => {
  const address = useWalletStore((s) => s.address)
  if (address) return <Navigate to="/home" replace />
  return <LandingPage />
}

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
          {/* Public standalone pages — no Layout */}
          <Route path="/" element={<LandingRedirect />} />
          <Route path="/connect" element={<ConnectPage />} />
          <Route path="/whitepaper" element={<WhitepaperPage />} />
          <Route path="/creators" element={<CreatorsPage />} />
          <Route path="/communities" element={<CommunitiesPage />} />
          <Route path="/admin" element={<AdminPage />} />

          {/* App pages — inside Layout, handle own auth state */}
          <Route element={<Layout />}>
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
            <Route path="/creator" element={<CreatorDashboardPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <ConnectWalletModal />
      <ToastContainer />
    </BrowserRouter>
  )
}

export default App

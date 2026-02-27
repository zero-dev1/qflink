import React, { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { Spinner } from '@/components/ui/Spinner'
import { useWalletStore } from '@/stores/wallet'
import { usePodsStore } from '@/stores/pods'

const LandingPage = lazy(() => import('@/pages/LandingPage'))
const HomePage = lazy(() => import('@/pages/HomePage'))
const ExplorePage = lazy(() => import('@/pages/ExplorePage'))
const PodPage = lazy(() => import('@/pages/PodPage'))
const DirectMessagesPage = lazy(() => import('@/pages/DirectMessagesPage'))
const DMChatPage = lazy(() => import('@/pages/DMChatPage'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const CreatePodPage = lazy(() => import('@/pages/CreatePodPage'))

const PageLoader: React.FC = () => (
  <div className="flex h-screen items-center justify-center">
    <Spinner size="lg" />
  </div>
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
          {/* Landing page - no layout wrapper */}
          <Route path="/" element={<LandingPage />} />
          
          {/* App routes - with layout wrapper */}
          <Route element={<Layout />}>
            <Route path="/home" element={<HomePage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/pod/:id" element={<PodPage />} />
            <Route path="/direct" element={<DirectMessagesPage />} />
            <Route path="/direct/:address" element={<DMChatPage />} />
            <Route path="/profile" element={<ProfilePage />} />
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

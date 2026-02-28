import React, { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useWalletStore } from '@/stores/wallet'
import { useProfileStore } from '@/stores/profile'
import { Spinner } from '@/components/ui/Spinner'

interface AuthGuardProps {
  children: React.ReactNode
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const location = useLocation()
  const [isChecking, setIsChecking] = useState(true)
  
  const isConnected = useWalletStore((s) => s.isConnected)
  const isConnecting = useWalletStore((s) => s.isConnecting)
  const evmAddress = useWalletStore((s) => s.evmAddress)
  const isRegistered = useProfileStore((s) => s.isRegistered)
  const needsRegistration = useProfileStore((s) => s.needsRegistration)
  const isLoadingProfile = useProfileStore((s) => s.isLoading)
  const fetchProfile = useProfileStore((s) => s.fetchProfile)

  // Check profile when connected and evmAddress is available
  useEffect(() => {
    const checkProfile = async () => {
      if (isConnected && evmAddress && !isRegistered && !isLoadingProfile) {
        await fetchProfile(evmAddress)
      }
      setIsChecking(false)
    }

    checkProfile()
  }, [isConnected, evmAddress, isRegistered, isLoadingProfile, fetchProfile])

  // Show loading while checking auth state
  if (isConnecting || isChecking || (isConnected && isLoadingProfile)) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0D0D0D]">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-gray-500">Checking authentication...</p>
        </div>
      </div>
    )
  }

  // Not connected → redirect to /connect
  if (!isConnected) {
    return <Navigate to="/connect" replace state={{ from: location }} />
  }

  // Connected but no profile → redirect to /connect
  // This will show Step 2 (create profile) since wallet is already connected
  if (needsRegistration || !isRegistered) {
    return <Navigate to="/connect" replace state={{ from: location }} />
  }

  // All good → render the protected content
  return <>{children}</>
}

export default AuthGuard

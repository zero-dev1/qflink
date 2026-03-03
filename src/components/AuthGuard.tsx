import React, { useEffect, useState, useRef } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useWalletStore } from '@/stores/wallet'
import { useProfileStore } from '@/stores/profile'
import { Spinner } from '@/components/ui/Spinner'

interface AuthGuardProps {
  children: React.ReactNode
}

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 3000

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const location = useLocation()
  const [isChecking, setIsChecking] = useState(true)
  const [networkError, setNetworkError] = useState(false)
  const retryCountRef = useRef(0)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  
  const isConnected = useWalletStore((s) => s.isConnected)
  const isConnecting = useWalletStore((s) => s.isConnecting)
  const evmAddress = useWalletStore((s) => s.evmAddress)
  const isRegistered = useProfileStore((s) => s.isRegistered)
  const needsRegistration = useProfileStore((s) => s.needsRegistration)
  const isLoadingProfile = useProfileStore((s) => s.isLoading)
  const fetchProfile = useProfileStore((s) => s.fetchProfile)

  console.log('[AUTH_TRACE] AuthGuard.tsx RENDER, isConnected:', isConnected, 'isRegistered:', isRegistered, 'needsRegistration:', needsRegistration, 'isChecking:', isChecking, 'isConnecting:', isConnecting, 'isLoadingProfile:', isLoadingProfile)

  useEffect(() => {
    console.log('[AUTH_TRACE] AuthGuard.tsx useEffect[checkProfile] FIRED, isConnected:', isConnected, 'evmAddress:', evmAddress, 'isRegistered:', isRegistered)
    let cancelled = false

    const checkProfile = async () => {
      console.log('[AUTH_TRACE] AuthGuard.tsx checkProfile() ENTRY, isConnected:', isConnected, 'evmAddress:', evmAddress, 'isRegistered:', isRegistered)
      if (!isConnected || !evmAddress || isRegistered) {
        console.log('[AUTH_TRACE] AuthGuard.tsx checkProfile() EARLY RETURN - !isConnected:', !isConnected, '!evmAddress:', !evmAddress, 'isRegistered:', isRegistered)
        setIsChecking(false)
        return
      }

      try {
        console.log('[AUTH_TRACE] AuthGuard.tsx checkProfile() CALLING fetchProfile')
        await fetchProfile(evmAddress)
        console.log('[AUTH_TRACE] AuthGuard.tsx checkProfile() fetchProfile SUCCESS')
        if (!cancelled) {
          setNetworkError(false)
          setIsChecking(false)
        }
      } catch (err: any) {
        console.log('[AUTH_TRACE] AuthGuard.tsx checkProfile() fetchProfile ERROR:', err)
        if (cancelled) return
        const msg: string = err?.message || String(err) || ''

        // AccountUnmapped = new wallet that hasn't registered yet.
        // Not a network error — redirect to /connect for registration.
        if (msg.toLowerCase().includes('accountunmapped') || msg.toLowerCase().includes('account_unmapped') || msg.toLowerCase().includes('unmapped')) {
          if (!cancelled) setIsChecking(false)
          return
        }

        retryCountRef.current += 1

        if (retryCountRef.current < MAX_RETRIES) {
          // Network/rate-limit error — show loading and retry
          setNetworkError(true)
          retryTimerRef.current = setTimeout(() => {
            if (!cancelled) checkProfile()
          }, RETRY_DELAY_MS)
        } else {
          // Exhausted retries — stay loading, do NOT redirect to register
          // The user is likely registered but the network is unavailable
          console.error('[AuthGuard] All retries exhausted — staying on loading screen')
          setNetworkError(true)
          setIsChecking(false)
        }
      }
    }

    checkProfile()

    return () => {
      cancelled = true
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    }
  }, [isConnected, evmAddress, isRegistered, fetchProfile])

  // Show loading while checking auth state or retrying after network error
  console.log('[AUTH_TRACE] AuthGuard.tsx DECISION POINT - isConnecting:', isConnecting, 'isChecking:', isChecking, 'isLoadingProfile:', isLoadingProfile)
  if (isConnecting || isChecking || (isConnected && isLoadingProfile)) {
    console.log('[AUTH_TRACE] AuthGuard.tsx DECISION: SHOW LOADING')
    return (
      <div className="flex h-screen items-center justify-center bg-[#0D0D0D]">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-gray-500">
            {networkError ? 'Network busy, retrying...' : 'Checking authentication...'}
          </p>
        </div>
      </div>
    )
  }

  // Not connected → redirect to /connect, preserving current location for return
  if (!isConnected) {
    console.log('[AUTH_TRACE] AuthGuard.tsx DECISION: REDIRECT /connect (not connected)')
    return <Navigate to="/connect" replace state={{ from: location }} />
  }

  // After retries exhausted with network error — show a retry button instead of redirecting
  if (networkError && !isRegistered && retryCountRef.current >= MAX_RETRIES) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0D0D0D]">
        <div className="flex flex-col items-center gap-4 text-center px-6">
          <p className="text-sm text-gray-400">Unable to reach the network. Please check your connection.</p>
          <button
            onClick={() => {
              retryCountRef.current = 0
              setNetworkError(false)
              setIsChecking(true)
            }}
            className="mt-2 bg-cyan-600 px-5 py-2 text-sm font-semibold text-white hover:bg-cyan-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Connected but confirmed no profile (query succeeded, returned null) → redirect to /connect
  if (needsRegistration || !isRegistered) {
    console.log('[AUTH_TRACE] AuthGuard.tsx DECISION: REDIRECT /connect (needsRegistration:', needsRegistration, '!isRegistered:', !isRegistered, ')')
    return <Navigate to="/connect" replace state={{ from: location }} />
  }

  // All good → render the protected content
  console.log('[AUTH_TRACE] AuthGuard.tsx DECISION: ALLOW (render children)')
  return <>{children}</>
}

export default AuthGuard

import React, { useEffect, useState, useRef } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useWalletStore } from '@/stores/wallet'
import { useProfileStore } from '@/stores/profile'
import { Spinner } from '@/components/ui/Spinner'
import { QNSRegistration } from '@/components/qns/QNSRegistration'
import { hasRegisteredName } from '@/lib/qnsRegistrar'
import { useQFName } from '@/hooks/useQFName'

interface AuthGuardProps {
  children: React.ReactNode
}

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 3000

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const location = useLocation()
  const [isChecking, setIsChecking] = useState(true)
  const [networkError, setNetworkError] = useState(false)
  const [showQNSRegistration, setShowQNSRegistration] = useState(false)
  const [isCheckingQNS, setIsCheckingQNS] = useState(true)
  const retryCountRef = useRef(0)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const qnsCheckedRef = useRef(false)
  
  const isConnected = useWalletStore((s) => s.isConnected)
  const isConnecting = useWalletStore((s) => s.isConnecting)
  const isRehydrating = useWalletStore((s) => s._rehydrating)
  const evmAddress = useWalletStore((s) => s.evmAddress)
  const isRegistered = useProfileStore((s) => s.isRegistered)
  const needsRegistration = useProfileStore((s) => s.needsRegistration)
  const isLoadingProfile = useProfileStore((s) => s.isLoading)
  const fetchProfile = useProfileStore((s) => s.fetchProfile)
  const { refresh: refreshQFName } = useQFName(evmAddress || undefined)

  useEffect(() => {
    let cancelled = false

    const checkProfile = async () => {
      if (!isConnected || !evmAddress || isRegistered) {
        setIsChecking(false)
        return
      }

      try {
        await fetchProfile(evmAddress)
        if (!cancelled) {
          setNetworkError(false)
          setIsChecking(false)
        }
      } catch (err: any) {
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

  // Check QNS registration after profile is confirmed
  useEffect(() => {
    const checkQNS = async () => {
      if (!isRegistered || !evmAddress) {
        setIsCheckingQNS(false);
        return;
      }

      const hasSkipped = localStorage.getItem('qns-skipped') === 'true';
      if (hasSkipped) {
        qnsCheckedRef.current = true;
        setIsCheckingQNS(false);
        return;
      }

      try {
        // Clear any cached null result before checking
        const { clearNameCache } = await import('@/lib/qns');
        clearNameCache(evmAddress);

        const qnsName = await hasRegisteredName(evmAddress);
        if (qnsName) {
          // Name found — skip the registration screen entirely
          qnsCheckedRef.current = true;
          setShowQNSRegistration(false);
          setIsCheckingQNS(false);
          return;
        }
        // No name — show registration
        setShowQNSRegistration(true);
        qnsCheckedRef.current = true;
      } catch (err) {
        console.error('Error checking QNS registration:', err);
        qnsCheckedRef.current = true;
      } finally {
        setIsCheckingQNS(false);
      }
    };

    checkQNS();

    // Re-check when user returns from another tab (may have registered a name there)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isRegistered && evmAddress && !localStorage.getItem('qns-skipped')) {
        // Reset and recheck
        import('@/lib/qns').then(({ clearNameCache }) => {
          clearNameCache(evmAddress);
          hasRegisteredName(evmAddress).then((name) => {
            if (name) {
              setShowQNSRegistration(false);
              qnsCheckedRef.current = true;
              // Also refresh the QFName hook so the name appears in the header
              refreshQFName();
            }
          }).catch(() => {});
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isRegistered, evmAddress]);

  // Show loading while checking auth state or QNS status
  if (isConnecting || isChecking || isRehydrating || (isConnected && isLoadingProfile) || isCheckingQNS) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0D0D0D]">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-gray-500">
            {networkError ? 'Network busy, retrying...' : isRehydrating ? 'Reconnecting wallet...' : 'Checking authentication...'}
          </p>
        </div>
      </div>
    )
  }

  // Not connected → redirect to /connect, preserving current location for return
  if (!isConnected) {
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
    return <Navigate to="/connect" replace state={{ from: location }} />
  }

  // Show QNS registration if needed
  if (showQNSRegistration) {
    return (
      <QNSRegistration
        onComplete={() => {
          setShowQNSRegistration(false)
          qnsCheckedRef.current = true
        }}
        onSuccess={refreshQFName}
      />
    )
  }

  // All good → render the protected content
  return <>{children}</>
}

export default AuthGuard

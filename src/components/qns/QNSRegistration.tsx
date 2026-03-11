import React, { useState, useEffect, useCallback } from 'react'
import {
  checkAvailability,
  getPrice,
  getAnnualPriceWithDuration,
  registerQFName,
  getPriceForName,
  isValidName,
  getValidationError,
} from '@/lib/qnsRegistrar'
import { useWallet } from '@/hooks/useWallet'
import { formatEther } from 'viem'

interface QNSRegistrationProps {
  onComplete: () => void
  onSuccess?: () => void  // Called after successful registration to refresh name
}

type RegistrationType = 'annual' | 'permanent'
type RegistrationStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'registering' | 'success' | 'error'
type PriceStatus = 'loading' | 'loaded' | 'error'

const DURATION_OPTIONS = [1, 2, 3, 5]

// Helper to format price without trailing zeros (e.g., "100.0000" -> "100")
function formatPrice(price: bigint): string {
  const ether = formatEther(price)
  // Remove trailing zeros and decimal point if not needed
  return parseFloat(ether).toString()
}

export const QNSRegistration: React.FC<QNSRegistrationProps> = ({ onComplete, onSuccess }) => {
  const { address, balance } = useWallet()
  const [name, setName] = useState('')
  const [registrationType, setRegistrationType] = useState<RegistrationType>('annual')
  const [duration, setDuration] = useState(1)
  const [status, setStatus] = useState<RegistrationStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [registeredName, setRegisteredName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [contractPrice, setContractPrice] = useState<bigint | null>(null)
  const [priceStatus, setPriceStatus] = useState<PriceStatus>('loading')

  // Fetch price from contract when name/registration type/duration changes
  useEffect(() => {
    if (!name || name.length < 3 || !isValidName(name) || status !== 'available') {
      setContractPrice(null)
      setPriceStatus('loading')
      return
    }

    setPriceStatus('loading')
    const fetchPrice = async () => {
      try {
        const price = await getPriceForName(
          name,
          duration,
          registrationType === 'permanent'
        )
        setContractPrice(price)
        setPriceStatus('loaded')
      } catch (error) {
        console.error('Failed to fetch price from contract:', error)
        // Fallback to local calculation on error
        const fallbackPrice = registrationType === 'permanent'
          ? getPrice(name, true)
          : getAnnualPriceWithDuration(name, duration)
        setContractPrice(fallbackPrice)
        setPriceStatus('error')
      }
    }

    fetchPrice()
  }, [name, registrationType, duration, status])

  useEffect(() => {
    if (!name || name.length < 3) {
      setStatus(name.length > 0 ? 'invalid' : 'idle')
      return
    }

    const validationError = getValidationError(name)
    if (validationError) {
      setStatus('invalid')
      return
    }

    setStatus('checking')
    const timer = setTimeout(async () => {
      try {
        const available = await checkAvailability(name)
        setStatus(available ? 'available' : 'taken')
      } catch {
        setStatus('error')
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [name])

  const handleSkip = () => {
    localStorage.setItem('qns-skipped', 'true')
    onComplete()
  }

  const handleRegister = async () => {
    if (!name || status !== 'available') return
    if (!address) {
      setError('Wallet not connected')
      return
    }

    setIsLoading(true)
    setStatus('registering')
    setError(null)

    try {
      await registerQFName(name, duration, registrationType === 'permanent')
      setRegisteredName(`${name}.qf`)
      setStatus('success')
      // Notify parent to refresh QNS name
      onSuccess?.()
    } catch (err) {
      setStatus('available')
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setIsLoading(false)
    }
  }

  // Use contract price if available, otherwise fallback to local calculation
  const displayPrice = contractPrice ?? (name && isValidName(name)
    ? registrationType === 'permanent'
      ? getPrice(name, true)
      : getAnnualPriceWithDuration(name, duration)
    : 0n)
  const canAfford = displayPrice > 0n && balance >= displayPrice

  // Success screen
  if (status === 'success' && registeredName) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center p-4">
        <div className="w-full max-w-[480px] bg-[#0D0D0D] border border-gray-800 rounded-none p-8 text-center">
          <div className="w-16 h-16 bg-cyan-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Welcome, {registeredName}!</h2>
          <p className="text-gray-400 mb-8">Your .qf name is now active across the QF ecosystem.</p>
          <button
            onClick={onComplete}
            className="w-full bg-[#0991B2] hover:bg-[#077a96] text-white font-semibold py-3 px-4 rounded-none transition-colors"
          >
            Continue to QFLink
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center p-4">
      <div className="w-full max-w-[480px] bg-[#0D0D0D] border border-gray-800 rounded-none p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Claim your .qf name</h1>
          <p className="text-sm text-gray-400">
            Your identity across the QF ecosystem. Visible in chats, DMs, pods, and every dApp on the network.
          </p>
        </div>

        {/* Name Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Choose your name
          </label>
          <div className="relative">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.toLowerCase())}
              placeholder="yourname"
              disabled={isLoading}
              className="w-full bg-[#0D0D0D] border border-gray-700 rounded-none py-3 px-4 pr-16 text-white placeholder-gray-600 focus:outline-none focus:border-[#0991B2] transition-colors disabled:opacity-50"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
              .qf
            </span>
          </div>

          {/* Status indicators */}
          <div className="mt-2 h-6">
            {status === 'checking' && (
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Checking availability...
              </p>
            )}
            {status === 'available' && (
              <p className="text-sm text-green-500 flex items-center gap-1">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Available
              </p>
            )}
            {status === 'taken' && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Taken
              </p>
            )}
            {status === 'invalid' && name.length > 0 && (
              <p className="text-sm text-red-500">
                {getValidationError(name) || 'Invalid name format'}
              </p>
            )}
            {status === 'error' && (
              <p className="text-sm text-amber-500 flex items-center gap-1">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Error checking availability. Please try again.
              </p>
            )}
          </div>
        </div>

        {/* Registration Type Tabs */}
        <div className="mb-6">
          <div className="flex rounded-lg bg-transparent p-1">
            <button
              onClick={() => setRegistrationType('annual')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-none transition-colors ${
                registrationType === 'annual'
                  ? 'bg-[#0991B2] text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Annual
            </button>
            <button
              onClick={() => setRegistrationType('permanent')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-none transition-colors ${
                registrationType === 'permanent'
                  ? 'bg-[#0991B2] text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Permanent
            </button>
          </div>
        </div>

        {/* Annual Duration Selector */}
        {registrationType === 'annual' && status === 'available' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Duration
            </label>
            <div className="flex gap-2">
              {DURATION_OPTIONS.map((years) => (
                <button
                  key={years}
                  onClick={() => setDuration(years)}
                  className={`flex-1 py-2 px-3 rounded-none text-sm font-medium transition-colors ${
                    duration === years
                      ? 'bg-[#0991B2] text-white border border-[#0991B2]'
                      : 'bg-transparent text-gray-400 border border-gray-700 hover:border-gray-500'
                  }`}
                >
                  {years} {years === 1 ? 'year' : 'years'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Price Display */}
        {status === 'available' && displayPrice > 0n && (
          <div className="mb-6 p-4 bg-[#0D0D0D] rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">
                {registrationType === 'permanent' ? 'One-time price' : `Price for ${duration} ${duration === 1 ? 'year' : 'years'}`}
                {priceStatus === 'loading' && <span className="ml-2 text-xs text-gray-500">(loading...)</span>}
              </span>
              <span className="text-xl font-bold text-white">
                {formatPrice(displayPrice)} QF
              </span>
            </div>
            {registrationType === 'permanent' && name && (
              <p className="text-xs text-gray-500">
                Save {(1 - 15 / (15 * duration)) * 100 | 0}% vs {duration} year{duration > 1 ? 's' : ''} annual
              </p>
            )}
            {registrationType === 'annual' && (
              <p className="text-xs text-gray-500">
                {contractPrice !== null 
                  ? `${formatPrice(contractPrice / BigInt(duration))} QF / year (from contract)`
                  : `${formatPrice(getPrice(name, false))} QF / year`}
              </p>
            )}
          </div>
        )}

        {/* Balance Warning */}
        {status === 'available' && displayPrice > 0n && !canAfford && (
          <div className="mb-6 p-3 bg-red-900/20 border border-red-800 rounded-lg">
            <p className="text-sm text-red-400">
              Insufficient balance. You have {formatPrice(balance)} QF but need {formatPrice(displayPrice)} QF.
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 p-3 bg-red-900/20 border border-red-800 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Register Button */}
        <button
          onClick={handleRegister}
          disabled={status !== 'available' || isLoading || !canAfford}
          className="w-full bg-[#0991B2] hover:bg-[#077a96] disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-none transition-colors mb-4"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Registering...
            </span>
          ) : status === 'available' ? (
            `Register ${name}.qf for ${formatPrice(displayPrice)} QF`
          ) : (
            'Enter a name to register'
          )}
        </button>

        {/* Skip Link */}
        <button
          onClick={handleSkip}
          disabled={isLoading}
          className="w-full text-sm text-gray-500 hover:text-gray-400 transition-colors disabled:opacity-50"
        >
          Skip for now
        </button>
      </div>
    </div>
  )
}

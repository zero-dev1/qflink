import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useWalletStore } from '@/stores/wallet'
import { useProfileStore } from '@/stores/profile'
import { useUIStore } from '@/stores/ui'
import { truncateAddress } from '@/lib/utils'
import { deriveEncryptionKeypair } from '@/lib/encryption'
import { ensureAccountMapped } from '@/lib/chain'
import { getProfile } from '@/lib/contractCalls'
import { Spinner } from '@/components/ui/Spinner'
import { QFLinkWordmark } from '@/components/QFLinkWordmark'


type Step = 1 | 2 | 3

type WalletId = 'metamask' | null

const ConnectPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [step, setStep] = useState<Step>(1)
  const [isRegistering, setIsRegistering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingWallet, setLoadingWallet] = useState<WalletId | null>(null)
  const [metaMaskNotInstalled, setMetaMaskNotInstalled] = useState(false)

  const isConnected = useWalletStore((s) => s.isConnected)
  const address = useWalletStore((s) => s.address)
  const evmAddress = useWalletStore((s) => s.evmAddress)
  const walletType = useWalletStore((s) => s.walletType)
  const isMappingAccount = useWalletStore((s) => s.isMappingAccount)
  const walletSource = useWalletStore((s) => s.walletSource)
  const connectStore = useWalletStore((s) => s.connect)
  const connectMetaMaskStore = useWalletStore((s) => s.connectMetaMask)
  const addToast = useUIStore((s) => s.addToast)
  const profile = useProfileStore()

  // After wallet connects, do a fresh on-chain profile check to decide next step.
  // We do NOT rely on the profile store's cached isRegistered — we always query
  // registryGetProfile directly so a mapped-but-unregistered account is never
  // accidentally treated as registered.
  useEffect(() => {
    if (!isConnected || !evmAddress) {
      return
    }

    let cancelled = false
    const returnTo = (location.state as any)?.from?.pathname || '/home'

    const checkAndRoute = async () => {
      try {
        const profileData = await getProfile(evmAddress as `0x${string}`)
        if (cancelled) {
          return
        }

        // Check if registered (only requires registeredAt > 0, displayName is no longer required)
        const hasProfile = !!(profileData && profileData.registeredAt && profileData.registeredAt > 0n)

        if (hasProfile) {
          navigate(returnTo, { replace: true })
        } else {
          // No valid profile — stay on connect page at step 2 for registration
          setStep(2)
        }
      } catch (err) {
        // Network error — fall back to store state to avoid blocking the user
        if (cancelled) return
        if (profile.isRegistered) {
          navigate(returnTo, { replace: true })
        } else {
          setStep(2)
        }
      }
    }

    checkAndRoute()
    return () => { 
      cancelled = true 
    }
  }, [isConnected, evmAddress])

  // Navigate after profile registration completes (with delay for chain indexing)
  useEffect(() => {
    if (!profile.isRegistered || !isConnected) {
      return
    }
    const returnTo = (location.state as any)?.from?.pathname || '/home'
    const timer = setTimeout(() => {
      navigate(returnTo, { replace: true })
    }, 2000)
    return () => {
      clearTimeout(timer)
    }
  }, [profile.isRegistered, isConnected, navigate, location])

  // Handle wallet connection (direct MetaMask)
  const handleConnectClick = async () => {
    setError(null)
    
    // Check if MetaMask is installed
    if (!window.ethereum) {
      setMetaMaskNotInstalled(true)
      return
    }
    
    await handleMetaMaskConnect()
  }

  // Handle MetaMask connection
  const handleMetaMaskConnect = async () => {
    setLoadingWallet('metamask')
    setError(null)
    try {
      await connectMetaMaskStore()
      // After successful connection, check profile in the next effect cycle
      addToast('success', 'MetaMask connected successfully')
    } catch (err: any) {
      setError(err.message || 'Failed to connect MetaMask')
    } finally {
      setLoadingWallet(null)
    }
  }



  // Handle auto-registration (no display name input required)
  const handleAutoRegister = async () => {
    setIsRegistering(true)
    setError(null)

    let keyPair: { publicKey: Uint8Array; secretKey: Uint8Array } | undefined

    try {
      const { walletType: wt, address: walletAddress, evmAddress: evmAddr } = useWalletStore.getState()
      
      if (!walletAddress) throw new Error('No wallet connected')

      if (wt === 'evm') {
        // MetaMask: use personal_sign
        if (!window.ethereum) throw new Error('MetaMask not available')
        
        keyPair = await deriveEncryptionKeypair(async (msg) => {
          const messageHex = '0x' + Array.from(new TextEncoder().encode(msg))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')
          
          const signature = await window.ethereum!.request({
            method: 'personal_sign',
            params: [messageHex, walletAddress],
          })
          
          // Convert hex signature to Uint8Array
          const hex = signature.slice(2)
          const bytes = new Uint8Array(hex.length / 2)
          for (let i = 0; i < hex.length; i += 2) {
            bytes[i / 2] = parseInt(hex.substr(i, 2), 16)
          }
          return bytes
        })
      } else {
        // Substrate: use signRaw
        const { web3Enable, web3FromSource } = await import('@polkadot/extension-dapp')
        const { walletSource } = useWalletStore.getState()
        
        if (!walletSource) throw new Error('No wallet source')
        
        await web3Enable('QFLink')
        const injector = await web3FromSource(walletSource)
        
        keyPair = await deriveEncryptionKeypair(async (msg) => {
          const signature = await injector.signer.signRaw?.({
            address: walletAddress,
            data: msg,
            type: 'bytes',
          })
          if (!signature) throw new Error('Signature failed')
          // Convert hex string to Uint8Array
          const hex = signature.signature.slice(2)
          const bytes = new Uint8Array(hex.length / 2)
          for (let i = 0; i < hex.length; i += 2) {
            bytes[i / 2] = parseInt(hex.substr(i, 2), 16)
          }
          return bytes
        })
      }

      // Use truncated address as placeholder display name
      const placeholderName = evmAddr ? truncateAddress(evmAddr, 'evm') : truncateAddress(walletAddress, 'substrate')
      
      await profile.register(placeholderName, keyPair.publicKey)
      addToast('success', 'Welcome to QFLink! Redirecting...')
      // Navigation will happen via useEffect when profile.isRegistered updates (with 2s delay)
    } catch (err: any) {
      console.error('Registration failed:', err)
      const msg: string = err?.message || String(err) || ''

      // For MetaMask (EVM), account mapping is handled automatically
      // No manual recovery needed - just show appropriate error

      let userMessage: string
      if (msg === 'INSUFFICIENT_BALANCE_FOR_MAPPING' || msg.includes('1010') || msg.includes('Inability to pay') || msg.includes('insufficient')) {
        userMessage = 'Insufficient balance. You need QF tokens to register.'
        addToast('error', userMessage)
      } else if (msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('429') || msg.toLowerCase().includes('network') || msg.toLowerCase().includes('timeout')) {
        userMessage = 'Network busy. Please wait a moment and try again.'
        addToast('error', userMessage)
      } else if (msg.toLowerCase().includes('cannot convert') || msg.toLowerCase().includes('bigint') || msg.toLowerCase().includes('undefined')) {
        userMessage = 'Registration failed. Please try again.'
        addToast('error', userMessage)
      } else {
        userMessage = msg || 'Failed to register'
        addToast('error', userMessage)
      }
      setError(userMessage)
      // Do NOT redirect — stay on registration page so user can retry
    } finally {
      setIsRegistering(false)
    }
  }

  // Render MetaMask not installed prompt
  const renderMetaMaskPrompt = () => (
    <div className="space-y-4 animate-fade-in text-center">
      <div className="text-4xl mb-4">🦊</div>
      <p className="text-gray-300">
        MetaMask is required to use QFLink.
      </p>
      <a
        href="https://metamask.io/download/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block w-full bg-orange-500 text-white hover:bg-orange-600 py-3.5 px-6 rounded-md font-medium text-sm uppercase tracking-wider transition-colors"
      >
        INSTALL METAMASK
      </a>
      <button
        onClick={() => setMetaMaskNotInstalled(false)}
        className="text-gray-500 text-sm hover:text-gray-400"
      >
        Go back
      </button>
    </div>
  )

  return (
    <div className="h-dvh overflow-hidden bg-[#0D0D0D] flex flex-col items-center justify-center px-4">
      {/* QFLink Wordmark — always visible on connect page */}
      <QFLinkWordmark size={56} variant="dark" className="mb-10" />

      {/* Card */}
      <div className="border border-gray-800 rounded-none px-10 py-12 w-full max-w-sm bg-[#0D0D0D]">
        {step === 1 && (
          <div className="animate-fade-in">
            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-2 mb-8">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-600" />
              <div className="w-2.5 h-2.5 rounded-full bg-gray-700" />
            </div>

            {/* Headline */}
            <h1 className="font-display font-semibold text-2xl text-white text-center mb-3">
              Connect Wallet
            </h1>

            {/* Subtitle */}
            <p className="text-gray-400 text-sm text-center mb-10">
              Connect your MetaMask wallet to get started.
            </p>

            {/* During mapAccount transaction: replace UI with status message */}
            {isMappingAccount ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <Spinner size="md" />
                <p className="text-sm text-gray-300 text-center font-medium">Connecting and setting up your account...</p>
                <p className="text-xs text-gray-500 text-center">Please approve the transaction in MetaMask.</p>
              </div>
            ) : metaMaskNotInstalled ? (
              renderMetaMaskPrompt()
            ) : (
              <>
                {/* Connect Button */}
                <button
                  onClick={handleConnectClick}
                  disabled={loadingWallet !== null}
                  className="w-full bg-cyan-600 text-white hover:bg-cyan-700 disabled:opacity-50 py-3.5 px-6 rounded-md font-medium text-sm uppercase tracking-wider transition-colors mb-6"
                >
                  {loadingWallet === 'metamask' ? (
                    <span className="flex items-center justify-center gap-2">
                      <Spinner size="sm" />
                      CONNECTING...
                    </span>
                  ) : (
                    'CONNECT METAMASK'
                  )}
                </button>

                {/* Learn More Link */}
                <p className="text-gray-500 text-sm text-center">
                  Don't have MetaMask?{' '}
                  <a 
                    href="https://metamask.io/download/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-cyan-600 hover:text-cyan-500"
                  >
                    Install here
                  </a>
                </p>
              </>
            )}

            {/* Error Message */}
            {error && (
              <p className="text-red-400 text-sm text-center mt-4">{error}</p>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in">
            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-2 mb-8">
              <div className="w-2.5 h-2.5 rounded-full bg-gray-700" />
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-600" />
            </div>

            {/* Connected Address */}
            <p className="font-mono text-xs text-gray-500 text-center mb-4">
              {evmAddress ? truncateAddress(evmAddress, 'evm') : address ? truncateAddress(address, 'substrate') : ''}
            </p>

            {/* Headline */}
            <h1 className="font-display font-semibold text-2xl text-white text-center mb-3">
              Welcome to QFLink
            </h1>

            {/* Mapping should be done before we reach this step, but show status if still in progress */}
            {isMappingAccount ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <Spinner size="md" />
                <p className="text-sm text-gray-400 text-center">Setting up your account on-chain…</p>
                <p className="text-xs text-gray-600 text-center">Please approve the transaction in your wallet.</p>
              </div>
            ) : (
              <>
                {/* Subtitle */}
                <p className="text-gray-400 text-sm text-center mb-10">
                  Click below to create your on-chain profile and get started.
                </p>

                {/* Get Started Button */}
                <button
                  onClick={handleAutoRegister}
                  disabled={isRegistering || isMappingAccount}
                  className="w-full bg-cyan-600 text-white hover:bg-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed py-3.5 px-6 rounded-md font-medium text-sm uppercase tracking-wider transition-colors flex items-center justify-center gap-2 mb-6"
                >
                  {isRegistering ? (
                    <>
                      <Spinner size="sm" />
                      <span className="uppercase tracking-wider">Setting up...</span>
                    </>
                  ) : (
                    'GET STARTED'
                  )}
                </button>
              </>
            )}

            {/* Info Text */}
            <p className="text-gray-500 text-xs text-center">
              Your identity will be your .qf name or wallet address.
            </p>

            {/* Error Message */}
            {error && (
              <p className="text-red-400 text-sm text-center mt-3">{error}</p>
            )}
          </div>
        )}
      </div>

      {/* Bottom Tagline */}
      <p className="font-bold uppercase tracking-[0.2em] text-gray-500 text-sm mt-16">
        Sovereign. On-Chain. Yours.
      </p>
    </div>
  )
}

export default ConnectPage

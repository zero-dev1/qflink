import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWalletStore } from '@/stores/wallet'
import { useProfileStore } from '@/stores/profile'
import { useUIStore } from '@/stores/ui'
import { truncateAddress } from '@/lib/utils'
import { deriveEncryptionKeypair } from '@/lib/encryption'
import { Spinner } from '@/components/ui/Spinner'
import { QFLinkWordmark } from '@/components/QFLinkWordmark'
import type { InjectedAccountWithMeta } from '@/lib/chain'

type Step = 1 | 2

// Extension wallet options
const SUBSTRATE_WALLETS = [
  { id: 'talisman', name: 'Talisman', icon: '🦊', url: 'https://talisman.xyz' },
  { id: 'polkadot-js', name: 'Polkadot.js', icon: '🔴', url: 'https://polkadot.js.org/extension/' },
  { id: 'subwallet', name: 'SubWallet', icon: '📱', url: 'https://subwallet.app' },
] as const

type WalletId = typeof SUBSTRATE_WALLETS[number]['id'] | 'metamask'

const ConnectPage: React.FC = () => {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>(1)
  const [displayName, setDisplayName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingWallet, setLoadingWallet] = useState<WalletId | null>(null)
  const [showWalletOptions, setShowWalletOptions] = useState(false)

  const isConnected = useWalletStore((s) => s.isConnected)
  const address = useWalletStore((s) => s.address)
  const evmAddress = useWalletStore((s) => s.evmAddress)
  const walletType = useWalletStore((s) => s.walletType)
  const connectStore = useWalletStore((s) => s.connect)
  const connectMetaMaskStore = useWalletStore((s) => s.connectMetaMask)
  const addToast = useUIStore((s) => s.addToast)
  const profile = useProfileStore()

  // Check if user already has wallet connected and profile on mount
  useEffect(() => {
    if (isConnected && profile.isRegistered) {
      navigate('/home', { replace: true })
    } else if (isConnected && !profile.isRegistered && step === 1) {
      // Wallet connected but no profile - auto advance to step 2
      setStep(2)
    }
  }, [isConnected, profile.isRegistered, navigate, step])

  // Watch for profile changes - navigate when registration completes
  useEffect(() => {
    if (profile.isRegistered && isConnected) {
      navigate('/home', { replace: true })
    }
  }, [profile.isRegistered, isConnected, navigate])

  // Handle wallet selection (show options)
  const handleConnectClick = () => {
    setShowWalletOptions(true)
    setError(null)
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

  // Handle Substrate wallet connection
  const handleExtensionConnect = async (wallet: typeof SUBSTRATE_WALLETS[number]) => {
    setLoadingWallet(wallet.id)
    setError(null)
    try {
      const { web3Enable, web3Accounts } = await import('@polkadot/extension-dapp')
      const extensions = await web3Enable('QFLink')
      if (extensions.length === 0) {
        setError(`No wallet extension found. Please install ${wallet.name}.`)
        return
      }

      const accounts = await web3Accounts()
      if (accounts.length === 0) {
        setError(`No accounts found. Please create an account in ${wallet.name}.`)
        return
      }

      // Use first account for simplicity in onboarding
      const account = accounts[0]
      await connectStore(account as InjectedAccountWithMeta)
      addToast('success', 'Wallet connected successfully')
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet')
    } finally {
      setLoadingWallet(null)
    }
  }

  // Handle profile creation
  const handleCreateProfile = async () => {
    if (!displayName.trim()) return

    setIsCreating(true)
    setError(null)

    try {
      const { walletType: wt, address: walletAddress } = useWalletStore.getState()
      
      if (!walletAddress) throw new Error('No wallet connected')

      let keyPair

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

      await profile.register(displayName.trim(), keyPair.publicKey)
      addToast('success', 'Profile created successfully!')
      // Navigation will happen via useEffect when profile.isRegistered updates
    } catch (err: any) {
      console.error('Profile creation failed:', err)
      setError(err.message || 'Failed to create profile')
    } finally {
      setIsCreating(false)
    }
  }

  // Render wallet options within the card
  const renderWalletOptions = () => (
    <div className="space-y-4 animate-fade-in">
      {/* MetaMask */}
      <div>
        <p className="text-sm text-gray-400 mb-3">EVM Wallets:</p>
        <button
          onClick={handleMetaMaskConnect}
          disabled={loadingWallet !== null}
          className="flex w-full items-center gap-3 rounded-sm border border-gray-800 bg-white/5 p-4 text-left transition-colors hover:bg-white/10 hover:border-gray-700 disabled:opacity-50"
        >
          <span className="text-2xl">🦊</span>
          <span className="flex-1 text-sm font-medium text-white">MetaMask</span>
          {loadingWallet === 'metamask' ? (
            <Spinner size="sm" />
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          )}
        </button>
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-800"></div>
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-2 bg-[#0D0D0D] text-gray-500">or</span>
        </div>
      </div>

      {/* Substrate Wallets */}
      <div>
        <p className="text-sm text-gray-400 mb-3">Substrate Wallets:</p>
        <div className="space-y-2">
          {SUBSTRATE_WALLETS.map((wallet) => (
            <button
              key={wallet.id}
              onClick={() => handleExtensionConnect(wallet)}
              disabled={loadingWallet !== null}
              className="flex w-full items-center gap-3 rounded-sm border border-gray-800 bg-white/5 p-4 text-left transition-colors hover:bg-white/10 hover:border-gray-700 disabled:opacity-50"
            >
              <span className="text-2xl">{wallet.icon}</span>
              <span className="flex-1 text-sm font-medium text-white">{wallet.name}</span>
              {loadingWallet === wallet.id ? (
                <Spinner size="sm" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-500 text-center pt-2">
        Don't have a wallet?{' '}
        <a href="https://talisman.xyz" target="_blank" rel="noopener noreferrer" className="text-cyan-600 hover:underline">
          Get Talisman
        </a>
        {' · '}
        <a href="https://subwallet.app" target="_blank" rel="noopener noreferrer" className="text-cyan-600 hover:underline">
          Get SubWallet
        </a>
      </p>
    </div>
  )

  return (
    <div className="h-dvh overflow-hidden bg-[#0D0D0D] flex flex-col items-center justify-center px-4">
      {/* QFLink Wordmark */}
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
              Connect your Substrate wallet to get started.
            </p>

            {showWalletOptions ? (
              renderWalletOptions()
            ) : (
              <>
                {/* Connect Button */}
                <button
                  onClick={handleConnectClick}
                  className="w-full bg-cyan-600 text-white hover:bg-cyan-700 py-3.5 px-6 rounded-md font-medium text-sm uppercase tracking-wider transition-colors mb-6"
                >
                  CONNECT WALLET
                </button>

                {/* Learn More Link */}
                <p className="text-gray-500 text-sm text-center">
                  Don't have a wallet?{' '}
                  <a 
                    href="https://polkadot.js.org/extension/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-cyan-600 hover:text-cyan-500"
                  >
                    Learn more
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
              Create Profile
            </h1>

            {/* Subtitle */}
            <p className="text-gray-400 text-sm text-center mb-10">
              Choose a display name for on-chain messaging.
            </p>

            {/* Form Field */}
            <div className="mb-6">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 block">
                DISPLAY NAME
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && displayName.trim() && !isCreating && handleCreateProfile()}
                placeholder="Enter a display name"
                maxLength={30}
                disabled={isCreating}
                className="w-full bg-white/5 border border-gray-800 rounded-sm px-4 py-3 text-white placeholder:text-gray-500 focus:border-cyan-600 focus:outline-none focus:ring-0 transition-colors"
              />
            </div>

            {/* Create Button */}
            <button
              onClick={handleCreateProfile}
              disabled={!displayName.trim() || isCreating}
              className="w-full bg-cyan-600 text-white hover:bg-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed py-3.5 px-6 rounded-md font-medium text-sm uppercase tracking-wider transition-colors flex items-center justify-center gap-2 mb-6"
            >
              {isCreating ? (
                <>
                  <Spinner size="sm" />
                  <span className="uppercase tracking-wider">Creating...</span>
                </>
              ) : (
                'CREATE PROFILE'
              )}
            </button>

            {/* Info Text */}
            <p className="text-gray-500 text-xs text-center">
              Stored on-chain and visible to other users.
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

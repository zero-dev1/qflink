import React, { useState, useEffect } from 'react'
import { useWallet } from '@/hooks/useWallet'
import { useWalletStore } from '@/stores/wallet'
import { useUIStore } from '@/stores/ui'
import { usePodsStore } from '@/stores/pods'
import { useProfileStore } from '@/stores/profile'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { LinkWalletModal } from '@/components/wallet/LinkWalletModal'
import { EditProfileModal } from '@/components/profile/EditProfileModal'
import { truncateAddress, formatBalance, copyToClipboard } from '@/lib/utils'
import { useToast } from '@/hooks/useToast'
import { LIMITS } from '@/types'
import { deriveEncryptionKeypair } from '@/lib/encryption'
import { Spinner } from '@/components/ui/Spinner'

const ProfilePage: React.FC = () => {
  const { address, balance, isConnected, linkedWallets, removeLinkedWallet, evmAddress } = useWallet()
  const setShowConnectWallet = useUIStore((s) => s.setShowConnectWallet)
  const myPods = usePodsStore((s) => s.myPods)
  const defaultPods = usePodsStore((s) => s.defaultPods)
  const profile = useProfileStore()
  const toast = useToast()
  const [showLinkWallet, setShowLinkWallet] = useState(false)
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [registrationName, setRegistrationName] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)

  // Fetch profile on mount when evmAddress is available
  useEffect(() => {
    if (isConnected && evmAddress && !profile.isLoading) {
      console.log('[ProfilePage] Fetching profile for evmAddress:', evmAddress)
      profile.fetchProfile(evmAddress)
    }
  }, [isConnected, evmAddress])

  console.log('🎨 [ProfilePage] Rendering with profile state:')
  console.log('   needsRegistration:', profile.needsRegistration)
  console.log('   isRegistered:', profile.isRegistered)
  console.log('   displayName:', profile.displayName)
  console.log('   isLoading:', profile.isLoading)

  const totalBalance = linkedWallets.reduce((sum, w) => sum + w.balance, balance)
  const podsJoined = myPods.length + defaultPods.length

  const handleRegister = async () => {
    if (!registrationName.trim()) {
      toast.error('Please enter a display name')
      return
    }

    setIsRegistering(true)
    try {
      const { walletType, address: walletAddress } = useWalletStore.getState()
      
      if (!walletAddress) throw new Error('No wallet connected')

      let keyPair

      if (walletType === 'evm') {
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

      await profile.register(registrationName.trim(), keyPair.publicKey)
      toast.success('Profile registered successfully!')
    } catch (err: any) {
      console.error('Registration failed:', err)
      toast.error(err.message || 'Registration failed')
    } finally {
      setIsRegistering(false)
    }
  }

  if (!isConnected || !address) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-3.5rem)] text-center px-6">
        <h2 className="text-xl font-semibold text-qf-text-primary mb-4">Connect Your Wallet</h2>
        <p className="text-sm text-qf-text-muted mb-6">Connect your wallet to view your profile</p>
        <Button onClick={() => setShowConnectWallet(true)}>Connect Wallet</Button>
      </div>
    )
  }

  // Show loading state while fetching profile
  if (profile.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-3.5rem)] text-center px-6">
        <Spinner size="lg" className="mb-4" />
        <p className="text-sm text-qf-text-muted">Loading profile...</p>
      </div>
    )
  }

  if (profile.needsRegistration) {
    return (
      <div className="max-w-md mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-semibold text-qf-text-primary">Register Your Profile</h1>
        <Card>
          <div className="space-y-4">
            <p className="text-sm text-qf-text-secondary">
              Create your QFLink profile to start messaging and joining pods.
            </p>
            <div>
              <label className="block text-sm font-medium text-qf-text-primary mb-2">
                Display Name
              </label>
              <input
                type="text"
                value={registrationName}
                onChange={(e) => setRegistrationName(e.target.value)}
                placeholder="Enter your display name"
                maxLength={32}
                className="w-full px-3 py-2 bg-qf-elevated border border-qf-card-border text-qf-text-primary placeholder-qf-text-muted focus:outline-none focus:border-qf-accent"
                disabled={isRegistering}
              />
            </div>
            <Button
              onClick={handleRegister}
              disabled={isRegistering || !registrationName.trim()}
              className="w-full"
            >
              {isRegistering ? 'Registering...' : 'Register Profile'}
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  const handleCopy = () => {
    copyToClipboard(address)
    toast.success('Address copied to clipboard')
  }

  const handleLinkWallet = () => {
    if (linkedWallets.length >= LIMITS.MAX_LINKED_WALLETS) {
      toast.error(`Maximum ${LIMITS.MAX_LINKED_WALLETS} linked wallets reached`)
      return
    }
    setShowLinkWallet(true)
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-qf-text-primary">Profile</h1>

      {/* Profile Card */}
      <Card>
        <div className="flex flex-col items-center text-center py-4">
          <Avatar address={address} size="lg" className="mb-4 !w-20 !h-20" />
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-qf-text-primary">{profile.displayName || 'QF Holder'}</h2>
            <button
              onClick={() => setShowEditProfile(true)}
              className="flex h-6 w-6 items-center justify-center rounded-md text-qf-text-muted hover:text-qf-text-primary hover:bg-qf-elevated transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-qf-text-muted mt-1">Member since February 2026</p>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 mt-2 text-xs text-qf-text-secondary hover:text-qf-text-primary transition-colors"
          >
            <span className="font-mono">{truncateAddress(address)}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>

          <div className="flex gap-8 mt-6">
            <div>
              <p className="text-lg font-bold dark:text-qf-accent text-qf-text-primary">{formatBalance(balance)} QF</p>
              <p className="text-xs text-qf-text-muted">QF Balance</p>
            </div>
            <div>
              <p className="text-lg font-bold text-qf-text-primary">{podsJoined}</p>
              <p className="text-xs text-qf-text-muted">Pods Joined</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Linked Wallets */}
      <Card
        header={{
          title: `Linked Wallets (${linkedWallets.length + 1}/${LIMITS.MAX_LINKED_WALLETS})`,
          action: linkedWallets.length < LIMITS.MAX_LINKED_WALLETS - 1 ? (
            <Button size="sm" onClick={handleLinkWallet}>+ Link Wallet</Button>
          ) : undefined,
        }}
      >
        <div className="space-y-3">
          {/* Primary wallet */}
          <div className="flex items-center gap-3 border border-qf-card-border p-3">
            <Avatar address={address} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm text-qf-text-primary truncate font-mono">{truncateAddress(address)}</p>
                <span className="text-[10px] rounded bg-qf-accent/15 px-1.5 py-0.5 dark:text-qf-accent text-qf-text-primary font-medium">Primary</span>
              </div>
              <p className="text-xs text-qf-text-secondary">{formatBalance(balance)} QF</p>
            </div>
          </div>

          {/* Linked wallets */}
          {linkedWallets.map((wallet) => (
            <div key={wallet.address} className="flex items-center gap-3 border border-qf-card-border p-3">
              <Avatar address={wallet.address} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-qf-text-primary truncate font-mono">{truncateAddress(wallet.address)}</p>
                <p className="text-xs text-qf-text-secondary">{formatBalance(wallet.balance)} QF</p>
              </div>
              <Button variant="danger" size="sm" onClick={() => removeLinkedWallet(wallet.address)}>
                Unlink
              </Button>
            </div>
          ))}

          <div className="flex items-center justify-between bg-qf-elevated p-3 mt-2">
            <span className="text-sm text-qf-text-secondary">Aggregate Balance</span>
            <span className="text-sm font-semibold dark:text-qf-accent text-qf-text-primary">{formatBalance(totalBalance)} QF</span>
          </div>
        </div>
      </Card>
      <LinkWalletModal
        isOpen={showLinkWallet}
        onClose={() => setShowLinkWallet(false)}
      />
      <EditProfileModal
        isOpen={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        currentName={profile.displayName || ''}
        onSave={(name) => {
          profile.updateProfile(name, profile.encryptionPubkey || new Uint8Array(32))
            .then(() => toast.success('Profile updated'))
            .catch((err) => toast.error(err.message))
        }}
      />
    </div>
  )
}

export default ProfilePage

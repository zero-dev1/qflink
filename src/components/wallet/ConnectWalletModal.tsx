import React, { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useUIStore } from '@/stores/ui'
import { useWalletStore } from '@/stores/wallet'
import { Spinner } from '@/components/ui/Spinner'

export const ConnectWalletModal: React.FC = () => {
  const showConnectWallet = useUIStore((s) => s.showConnectWallet)
  const setShowConnectWallet = useUIStore((s) => s.setShowConnectWallet)
  const connectMetaMaskStore = useWalletStore((s) => s.connectMetaMask)

  const [isConnecting, setIsConnecting] = useState(false)
  const [metaMaskNotInstalled, setMetaMaskNotInstalled] = useState(false)

  // Auto-connect to MetaMask when modal opens
  useEffect(() => {
    if (showConnectWallet && !metaMaskNotInstalled) {
      handleMetaMaskConnect()
    }
  }, [showConnectWallet])

  const handleMetaMaskConnect = async () => {
    // Check if MetaMask is installed
    if (!window.ethereum) {
      setMetaMaskNotInstalled(true)
      return
    }

    setIsConnecting(true)
    try {
      await connectMetaMaskStore()
      setShowConnectWallet(false)
      setMetaMaskNotInstalled(false)
    } catch (err) {
      // Error is already handled by the store (toast)
      // Don't close modal on error so user can retry
    } finally {
      setIsConnecting(false)
    }
  }

  const handleClose = () => {
    setShowConnectWallet(false)
    setMetaMaskNotInstalled(false)
    setIsConnecting(false)
  }

  // Show MetaMask not installed state
  if (metaMaskNotInstalled) {
    return (
      <Modal
        isOpen={showConnectWallet}
        onClose={handleClose}
        title="MetaMask Required"
      >
        <div className="space-y-4 text-center">
          <div className="text-4xl mb-4">🦊</div>
          <p className="text-qx-text-secondary">
            MetaMask is required to use QFLink. Please install MetaMask to continue.
          </p>
          <a
            href="https://metamask.io/download/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Install MetaMask
          </a>
          <button
            onClick={handleClose}
            className="block w-full text-sm text-qx-text-muted hover:text-qx-text-secondary mt-4"
          >
            Cancel
          </button>
        </div>
      </Modal>
    )
  }

  // Show connecting state (auto-connecting to MetaMask)
  return (
    <Modal
      isOpen={showConnectWallet}
      onClose={handleClose}
      title="Connect Wallet"
    >
      <div className="space-y-4 text-center py-8">
        <div className="text-4xl mb-4">🦊</div>
        <p className="text-qx-text-secondary">
          {isConnecting ? 'Connecting to MetaMask...' : 'Opening MetaMask...'}
        </p>
        {isConnecting && <Spinner size="lg" className="mx-auto" />}
        <button
          onClick={handleClose}
          className="text-sm text-qx-text-muted hover:text-qx-text-secondary"
        >
          Cancel
        </button>
      </div>
    </Modal>
  )
}

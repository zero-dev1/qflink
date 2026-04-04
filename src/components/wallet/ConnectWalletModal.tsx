import React, { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useUIStore } from '@/stores/ui'
import { useWalletStore } from '@/stores/wallet'
import { Spinner } from '@/components/ui/Spinner'

export const ConnectWalletModal: React.FC = () => {
  const showConnectWallet = useUIStore((s) => s.showConnectWallet)
  const setShowConnectWallet = useUIStore((s) => s.setShowConnectWallet)
  const connect = useWalletStore((s) => s.connect)
  const walletError = useWalletStore((s) => s.walletError)

  const [isConnecting, setIsConnecting] = useState(false)

  const handleConnect = async (walletType: 'talisman' | 'subwallet') => {
    setIsConnecting(true)
    try {
      await connect(walletType)
      setShowConnectWallet(false)
    } catch {
      // Error handled by store
    } finally {
      setIsConnecting(false)
    }
  }

  const handleClose = () => {
    setShowConnectWallet(false)
    setIsConnecting(false)
  }

  const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

  return (
    <Modal
      isOpen={showConnectWallet}
      onClose={handleClose}
      title="Connect Wallet"
    >
      <div className="space-y-3 py-4">
        {!isMobile && (
          <button
            onClick={() => handleConnect('talisman')}
            disabled={isConnecting}
            className="w-full bg-cyan-600 text-white hover:bg-cyan-700 disabled:opacity-50 py-3 px-6 font-medium text-sm uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
          >
            {isConnecting ? <><Spinner size="sm" /> Connecting...</> : 'Connect Talisman'}
          </button>
        )}
        <button
          onClick={() => handleConnect('subwallet')}
          disabled={isConnecting}
          className="w-full bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 py-3 px-6 font-medium text-sm uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
        >
          {isConnecting ? <><Spinner size="sm" /> Connecting...</> : (isMobile ? 'Open in SubWallet' : 'Connect SubWallet')}
        </button>
        {walletError && (
          <p className="text-red-400 text-sm text-center mt-2">{walletError}</p>
        )}
        <button
          onClick={handleClose}
          className="block w-full text-sm text-center text-gray-500 hover:text-gray-400 mt-4"
        >
          Cancel
        </button>
      </div>
    </Modal>
  )
}

import { useCallback } from 'react'
import { useWalletStore } from '@/stores/wallet'
import { useUIStore } from '@/stores/ui'

export function useWallet() {
  const address = useWalletStore((s) => s.address)
  const balance = useWalletStore((s) => s.balance)
  const isConnected = useWalletStore((s) => s.isConnected)
  const isConnecting = useWalletStore((s) => s.isConnecting)
  const encryptionKeyPair = useWalletStore((s) => s.encryptionKeyPair)
  const linkedWallets = useWalletStore((s) => s.linkedWallets)
  const walletType = useWalletStore((s) => s.walletType)
  const evmAddress = useWalletStore((s) => s.evmAddress)
  const storeConnect = useWalletStore((s) => s.connect)
  const storeConnectMetaMask = useWalletStore((s) => s.connectMetaMask)
  const storeDisconnect = useWalletStore((s) => s.disconnect)
  const setBalance = useWalletStore((s) => s.setBalance)
  const setEncryptionKeyPair = useWalletStore((s) => s.setEncryptionKeyPair)
  const addLinkedWallet = useWalletStore((s) => s.addLinkedWallet)
  const removeLinkedWallet = useWalletStore((s) => s.removeLinkedWallet)
  const addToast = useUIStore((s) => s.addToast)

  // Connect with Substrate wallet (opens account selection modal)
  // Note: This is called by the modal after user selects an account
  const connect = useCallback(async (selectedAccount?: any) => {
    try {
      await storeConnect(selectedAccount)
      addToast('success', 'Wallet connected successfully')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect wallet'
      addToast('error', message)
      throw err
    }
  }, [storeConnect, addToast])

  // Connect with MetaMask
  const connectMetaMask = useCallback(async () => {
    try {
      await storeConnectMetaMask()
      addToast('success', 'MetaMask connected successfully')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect MetaMask'
      addToast('error', message)
      throw err
    }
  }, [storeConnectMetaMask, addToast])

  const disconnect = useCallback(() => {
    storeDisconnect()
    addToast('info', 'Wallet disconnected')
  }, [storeDisconnect, addToast])

  return {
    address,
    balance,
    isConnected,
    isConnecting,
    encryptionKeyPair,
    linkedWallets,
    walletType,
    evmAddress,
    connect,
    connectMetaMask,
    disconnect,
    setBalance,
    setEncryptionKeyPair,
    addLinkedWallet,
    removeLinkedWallet,
  }
}

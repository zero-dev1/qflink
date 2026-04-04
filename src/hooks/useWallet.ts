import { useCallback } from 'react'
import { useWalletStore } from '@/stores/wallet'
import { useUIStore } from '@/stores/ui'

export function useWallet() {
  const address = useWalletStore((s) => s.address)
  const balance = useWalletStore((s) => s.balance)
  const isConnected = useWalletStore((s) => s.isConnected)
  const isConnecting = useWalletStore((s) => s.isConnecting)
  const encryptionKeyPair = useWalletStore((s) => s.encryptionKeyPair)
  const evmAddress = useWalletStore((s) => s.evmAddress)
  const walletName = useWalletStore((s) => s.walletName)
  const storeConnect = useWalletStore((s) => s.connect)
  const storeDisconnect = useWalletStore((s) => s.disconnect)
  const setBalance = useWalletStore((s) => s.setBalance)
  const setEncryptionKeyPair = useWalletStore((s) => s.setEncryptionKeyPair)
  const addToast = useUIStore((s) => s.addToast)

  const connect = useCallback(async (walletType: 'talisman' | 'subwallet' = 'talisman') => {
    try {
      await storeConnect(walletType)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect wallet'
      addToast('error', message)
      throw err
    }
  }, [storeConnect, addToast])

  const disconnect = useCallback(() => {
    storeDisconnect()
    localStorage.removeItem('qns-skipped')
    addToast('info', 'Wallet disconnected')
  }, [storeDisconnect, addToast])

  return {
    address,
    balance,
    isConnected,
    isConnecting,
    encryptionKeyPair,
    evmAddress,
    walletName,
    connect,
    disconnect,
    setBalance,
    setEncryptionKeyPair,
  }
}

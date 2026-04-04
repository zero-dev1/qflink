import { useWalletStore } from '@/stores/wallet'
import { useProfileStore } from '@/stores/profile'
import { useUIStore } from '@/stores/ui'

export function useRequireProfile() {
  const isConnected = useWalletStore((s) => s.isConnected)
  const evmAddress = useWalletStore((s) => s.evmAddress)
  const isRegistered = useProfileStore((s) => s.isRegistered)
  const setShowConnectWallet = useUIStore((s) => s.setShowConnectWallet)

  const requireProfile = (): boolean => {
    if (!isConnected) {
      setShowConnectWallet(true)
      return false
    }
    if (!isRegistered) {
      // Profile registration is automatic during connect flow.
      // If somehow they're connected but unregistered, prompt reconnect.
      setShowConnectWallet(true)
      return false
    }
    return true
  }

  return {
    isConnected,
    isRegistered,
    evmAddress,
    requireProfile,
  }
}

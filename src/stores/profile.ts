import { create } from 'zustand'
import { getApi } from '@/lib/chain'
import {
  registryRegister,
  registryGetProfile,
  registryUpdateProfile,
  registryLinkWallet,
  registryConfirmLink,
  registryUnlinkWallet,
  registryGetLinkedWallets,
  type UserProfile as ContractUserProfile,
} from '@/lib/contracts'
import { useWalletStore } from './wallet'

export interface ProfileState {
  displayName: string | null
  encryptionPubkey: Uint8Array | null
  registeredAt: number | null
  isRegistered: boolean
  needsRegistration: boolean
  linkedWallets: string[]
  isLoading: boolean
  register: (displayName: string, encryptionPubkey: Uint8Array) => Promise<void>
  fetchProfile: (address?: string) => Promise<void>
  updateProfile: (displayName: string, encryptionPubkey: Uint8Array) => Promise<void>
  linkWallet: (linkedAddress: string) => Promise<void>
  confirmLink: (primaryAddress: string) => Promise<void>
  unlinkWallet: (linkedAddress: string) => Promise<void>
  fetchLinkedWallets: (primaryAddress?: string) => Promise<void>
  setLoading: (loading: boolean) => void
  reset: () => void
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  displayName: null,
  encryptionPubkey: null,
  registeredAt: null,
  isRegistered: false,
  needsRegistration: true,
  linkedWallets: [],
  isLoading: false,

  register: async (displayName: string, encryptionPubkey: Uint8Array) => {
    const { isConnected } = useWalletStore.getState()
    if (!isConnected) {
      throw new Error('Wallet not connected')
    }

    const api = await getApi()
    await registryRegister(api, displayName, encryptionPubkey)

    set({
      displayName,
      encryptionPubkey,
      registeredAt: Date.now(),
      isRegistered: true,
      needsRegistration: false,
    })

    useWalletStore.getState().setEncryptionKeyPair({
      publicKey: encryptionPubkey,
      secretKey: new Uint8Array(32),
    })
  },

  fetchProfile: async (address?: string) => {
    const { evmAddress } = useWalletStore.getState()
    const targetAddress = address || evmAddress

    if (!targetAddress) {
      set({ needsRegistration: true, isRegistered: false })
      return
    }

    set({ isLoading: true })
    try {
      const api = await getApi()
      const profile = await registryGetProfile(api, targetAddress)

      if (profile) {
        set({
          displayName: profile.displayName,
          encryptionPubkey: profile.encryptionPubkey,
          registeredAt: Number(profile.registeredAt),
          isRegistered: true,
          needsRegistration: false,
        })

        useWalletStore.getState().setEncryptionKeyPair({
          publicKey: profile.encryptionPubkey,
          secretKey: new Uint8Array(32),
        })
      } else {
        // Query succeeded and explicitly returned null — confirmed no profile
        set({
          needsRegistration: true,
          isRegistered: false,
          displayName: null,
          encryptionPubkey: null,
          registeredAt: null,
        })
      }
    } catch (err) {
      // Network/rate-limit error — do NOT conclude the user has no profile.
      // Re-throw so the caller (AuthGuard) can retry instead of redirecting.
      console.error('❌ [fetchProfile] Network error fetching profile:', err)
      throw err
    } finally {
      set({ isLoading: false })
    }
  },

  updateProfile: async (displayName: string, encryptionPubkey: Uint8Array) => {
    const { isConnected } = useWalletStore.getState()
    if (!isConnected) {
      throw new Error('Wallet not connected')
    }

    const api = await getApi()
    await registryUpdateProfile(api, displayName, encryptionPubkey)

    set({
      displayName,
      encryptionPubkey,
    })

    useWalletStore.getState().setEncryptionKeyPair({
      publicKey: encryptionPubkey,
      secretKey: new Uint8Array(32),
    })
  },

  linkWallet: async (linkedAddress: string) => {
    const { isConnected } = useWalletStore.getState()
    if (!isConnected) {
      throw new Error('Wallet not connected')
    }

    const api = await getApi()
    await registryLinkWallet(api, linkedAddress)
  },

  confirmLink: async (primaryAddress: string) => {
    const { isConnected } = useWalletStore.getState()
    if (!isConnected) {
      throw new Error('Wallet not connected')
    }

    const api = await getApi()
    await registryConfirmLink(api, primaryAddress)
  },

  unlinkWallet: async (linkedAddress: string) => {
    const { isConnected } = useWalletStore.getState()
    if (!isConnected) {
      throw new Error('Wallet not connected')
    }

    const api = await getApi()
    await registryUnlinkWallet(api, linkedAddress)

    const current = get().linkedWallets
    set({ linkedWallets: current.filter(addr => addr !== linkedAddress) })
  },

  fetchLinkedWallets: async (primaryAddress?: string) => {
    const { evmAddress } = useWalletStore.getState()
    const targetAddress = primaryAddress || evmAddress

    if (!targetAddress) {
      return
    }

    try {
      const api = await getApi()
      const wallets = await registryGetLinkedWallets(api, targetAddress)
      set({ linkedWallets: wallets })
    } catch (err) {
      console.error('Failed to fetch linked wallets:', err)
    }
  },

  setLoading: (loading: boolean) => set({ isLoading: loading }),

  reset: () => set({
    displayName: null,
    encryptionPubkey: null,
    registeredAt: null,
    isRegistered: false,
    needsRegistration: false,
    linkedWallets: [],
    isLoading: false,
  }),
}))

import { create } from 'zustand'
import { toHex } from 'viem'
import * as cc from '@/lib/contractCalls'
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

    const pubkeyHex = toHex(encryptionPubkey, { size: 32 }) as `0x${string}`
    await cc.registerProfile(displayName, pubkeyHex)

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
    console.log('[AUTH_TRACE] profile.ts fetchProfile() ENTRY, address param:', address)
    const { evmAddress } = useWalletStore.getState()
    const targetAddress = address || evmAddress
    console.log('[AUTH_TRACE] profile.ts fetchProfile() targetAddress:', targetAddress)

    if (!targetAddress) {
      console.log('[AUTH_TRACE] profile.ts fetchProfile() no targetAddress, setting needsRegistration=true')
      set({ needsRegistration: true, isRegistered: false })
      return
    }

    set({ isLoading: true })
    try {
      const profile = await cc.getProfile(targetAddress as `0x${string}`)
      console.log('[AUTH_TRACE] profile.ts fetchProfile() raw contract response:', profile)

      if (profile && profile.displayName && profile.displayName.trim().length > 0 && profile.registeredAt > 0n) {
        console.log('[AUTH_TRACE] profile.ts fetchProfile() has valid profile, setting isRegistered=true, needsRegistration=false')
        // Convert hex pubkey back to Uint8Array
        const { hexToBytes } = await import('viem')
        const pubkeyBytes = hexToBytes(profile.encryptionPubkey)

        set({
          displayName: profile.displayName,
          encryptionPubkey: pubkeyBytes,
          registeredAt: Number(profile.registeredAt),
          isRegistered: true,
          needsRegistration: false,
        })

        useWalletStore.getState().setEncryptionKeyPair({
          publicKey: pubkeyBytes,
          secretKey: new Uint8Array(32),
        })
      } else {
        console.log('[AUTH_TRACE] profile.ts fetchProfile() no valid profile found, setting isRegistered=false, needsRegistration=true')
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
      console.error('[fetchProfile] Network error fetching profile:', err)
      throw err
    } finally {
      const finalState = get()
      console.log('[AUTH_TRACE] profile.ts fetchProfile() EXIT, isRegistered:', finalState.isRegistered, 'needsRegistration:', finalState.needsRegistration)
      set({ isLoading: false })
    }
  },

  updateProfile: async (displayName: string, encryptionPubkey: Uint8Array) => {
    const { isConnected } = useWalletStore.getState()
    if (!isConnected) {
      throw new Error('Wallet not connected')
    }

    const pubkeyHex = toHex(encryptionPubkey, { size: 32 }) as `0x${string}`
    await cc.updateProfile(displayName, pubkeyHex)

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

    await cc.linkWallet(linkedAddress as `0x${string}`)
  },

  confirmLink: async (primaryAddress: string) => {
    const { isConnected } = useWalletStore.getState()
    if (!isConnected) {
      throw new Error('Wallet not connected')
    }

    await cc.confirmLink(primaryAddress as `0x${string}`)
  },

  unlinkWallet: async (linkedAddress: string) => {
    const { isConnected } = useWalletStore.getState()
    if (!isConnected) {
      throw new Error('Wallet not connected')
    }

    await cc.unlinkWallet(linkedAddress as `0x${string}`)

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
      const wallets = await cc.getLinkedWallets(targetAddress as `0x${string}`)
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
    needsRegistration: true,
    linkedWallets: [],
    isLoading: false,
  }),
}))

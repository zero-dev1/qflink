import { create } from 'zustand'
import type { WalletState, LinkedWallet, WalletType } from '@/types'
import { subscribeBalance, queryBalance, ensureAccountMapped, getEvmAddress, deriveEvmAddress, getApi, type InjectedAccountWithMeta } from '@/lib/chain'


let balanceUnsub: (() => void) | null = null
let metamaskListenersSetup = false

const SESSION_KEY = 'qflink-session'
const WALLET_TYPE_KEY = 'qflink-wallet-type'

interface SessionData {
  address: string
  source: string
  walletType: WalletType
}

function saveSession(address: string, source: string, walletType: WalletType) {
  const session: SessionData = { address, source, walletType }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  if (walletType) {
    localStorage.setItem(WALLET_TYPE_KEY, walletType)
  }
}

function loadSession(): SessionData | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SessionData
  } catch {
    return null
  }
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY)
  localStorage.removeItem(WALLET_TYPE_KEY)
}

export const useWalletStore = create<WalletState>((set, get) => ({
  address: null,
  balance: BigInt(0),
  isConnected: false,
  isConnecting: false,
  walletSource: null,
  encryptionKeyPair: null,
  linkedWallets: [],
  evmAddress: null,
  accountMapped: false,
  isMappingAccount: false,
  walletType: null,

  connect: async (selectedAccount?: InjectedAccountWithMeta) => {
    console.log('[AUTH_TRACE] wallet.ts connect() START')
    set({ isConnecting: true })

    try {
      const { web3Enable, web3Accounts } = await import('@polkadot/extension-dapp')

      const extensions = await web3Enable('QFLink')
      if (extensions.length === 0) {
        set({ isConnecting: false })
        throw new Error('No wallet extension found. Please install Polkadot.js, Talisman, or SubWallet.')
      }

      let account: InjectedAccountWithMeta
      
      if (selectedAccount) {
        account = selectedAccount
      } else {
        const accounts = await web3Accounts()
        if (accounts.length === 0) {
          set({ isConnecting: false })
          throw new Error('No accounts found. Please create an account in your wallet extension.')
        }
        account = accounts[0]
      }

      const address = account.address
      const source = account.meta?.source || 'polkadot-js'

      // Attach signer to account and API before any tx (fixes "No signer specified" error)
      const { web3FromAddress } = await import('@polkadot/extension-dapp')
      const injector = await web3FromAddress(address)
      account = { ...account, signer: injector.signer }
      const chainApi = await getApi()
      chainApi.setSigner(injector.signer)

      // Fetch initial balance and set up subscription
      let initialBalance = BigInt(0)
      try {
        initialBalance = await queryBalance(address)

        if (balanceUnsub) {
          balanceUnsub()
          balanceUnsub = null
        }

        balanceUnsub = await subscribeBalance(address, (free) => {
          set({ balance: free })
        })
      } catch (err) {
        // Silently handle balance fetch errors
      }

      let evmAddr: string | null = null

      // Ensure account is mapped BEFORE setting isConnected=true.
      // Contract queries (registryGetProfile, etc.) will fail with AccountUnmapped
      // if we allow components to fire them against an unmapped account.
      console.log('[AUTH_TRACE] wallet.ts connect() BEFORE getEvmAddress')
      evmAddr = await getEvmAddress(address)
      console.log('[AUTH_TRACE] wallet.ts connect() AFTER getEvmAddress, evmAddr:', evmAddr)

      if (evmAddr) {
        // Mapping already exists on-chain — proceed immediately
        console.log('[AUTH_TRACE] wallet.ts connect() Mapping exists')
      } else {
        // No mapping — submit mapAccount and WAIT for finalization before continuing
        console.log('[AUTH_TRACE] wallet.ts connect() BEFORE ensureAccountMapped')
        set({ isMappingAccount: true })
        try {
          evmAddr = await ensureAccountMapped(account)
          console.log('[AUTH_TRACE] wallet.ts connect() AFTER ensureAccountMapped, evmAddr:', evmAddr)
        } catch (mapErr: any) {
          // Surface the error to the UI — do NOT fall back to a derived address
          // and do NOT set isConnected=true. The user must resolve this first.
          console.log('[AUTH_TRACE] wallet.ts connect() ensureAccountMapped FAILED:', mapErr)
          set({ isMappingAccount: false, isConnecting: false })
          throw mapErr
        }
        set({ isMappingAccount: false })
      }

      if (!evmAddr) {
        console.log('[AUTH_TRACE] wallet.ts connect() ERROR: no evmAddr')
        set({ isConnecting: false })
        throw new Error('Could not determine EVM address after mapping')
      }

      saveSession(address, source, 'substrate')

      // Only NOW set isConnected=true — mapping is confirmed, contract queries are safe
      console.log('[AUTH_TRACE] wallet.ts connect() BEFORE setting isConnected=true')
      set({
        address,
        evmAddress: evmAddr.toLowerCase(),
        isConnected: true,
        isConnecting: false,
        walletSource: source,
        accountMapped: true,
        walletType: 'substrate',
        balance: initialBalance,
      })
      console.log('[AUTH_TRACE] wallet.ts connect() AFTER set isConnected=true')

      const { useProfileStore } = await import('./profile')
      console.log('[AUTH_TRACE] wallet.ts connect() BEFORE fetchProfile')
      try {
        await useProfileStore.getState().fetchProfile(evmAddr)
        const profileState = useProfileStore.getState()
        console.log('[AUTH_TRACE] wallet.ts connect() AFTER fetchProfile, isRegistered:', profileState.isRegistered, 'needsRegistration:', profileState.needsRegistration)
      } catch (profileErr) {
        console.log('[AUTH_TRACE] wallet.ts connect() fetchProfile ERROR:', profileErr)
        // Don't block connection if profile fetch fails — AuthGuard/ConnectPage will handle it
      }

      // Fetch pods after profile is loaded so Home page has data ready
      try {
        const { usePodsStore } = await import('./pods')
        await usePodsStore.getState().fetchPods()
      } catch (podsErr) {
        console.log('[AUTH_TRACE] wallet.ts connect() fetchPods ERROR:', podsErr)
        // Don't block connection if pods fetch fails
      }

      console.log('[AUTH_TRACE] wallet.ts connect() COMPLETE')
    } catch (error) {
      console.log('[AUTH_TRACE] wallet.ts connect() ERROR:', error)
      set({ isConnecting: false })
      throw error
    }
  },

  connectMetaMask: async () => {
    set({ isConnecting: true })

    try {
      // Check if MetaMask is installed
      if (!window.ethereum) {
        set({ isConnecting: false })
        throw new Error('MetaMask not installed')
      }

      // Request account access (opens MetaMask popup)
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      
      if (!accounts || accounts.length === 0) {
        set({ isConnecting: false })
        throw new Error('No accounts found. Please create an account in MetaMask.')
      }

      const evmAddress = accounts[0].toLowerCase()
      
      await get().finalizeMetaMaskConnection(evmAddress)
    } catch (error) {
      set({ isConnecting: false })
      throw error
    }
  },

  /**
   * Silently connect to MetaMask using existing permissions (for auto-reconnect).
   * Uses eth_accounts instead of eth_requestAccounts to avoid popup.
   */
  silentConnectMetaMask: async (): Promise<boolean> => {
    try {
      // Check if MetaMask is installed
      if (!window.ethereum) {
        return false
      }

      // Check existing accounts without prompting (silently)
      const accounts = await window.ethereum.request({ method: 'eth_accounts' })
      
      if (!accounts || accounts.length === 0) {
        return false
      }

      const evmAddress = accounts[0].toLowerCase()
      const session = loadSession()
      
      // Verify the connected account matches the saved session
      if (!session || session.address.toLowerCase() !== evmAddress) {
        return false
      }

      await get().finalizeMetaMaskConnection(evmAddress)
      return true
    } catch (error) {
      console.error('❌ [silentConnectMetaMask] Failed:', error)
      return false
    }
  },

  /**
   * Finalize MetaMask connection - shared between connect and silent connect.
   */
  finalizeMetaMaskConnection: async (evmAddress: string) => {
    console.log('[AUTH_TRACE] wallet.ts finalizeMetaMaskConnection() START, evmAddress:', evmAddress)
    try {
      // Get balance from Ethereum RPC
      let balance = BigInt(0)
      try {
        const ethRpcUrl = import.meta.env.VITE_ETH_RPC_URL
        if (ethRpcUrl) {
          const response = await fetch(ethRpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'eth_getBalance',
              params: [evmAddress, 'latest'],
            }),
          })
          const data = await response.json()
          if (data.result) {
            // Convert hex balance to bigint
            balance = BigInt(data.result)
          }
        }
      } catch (err) {
        // Silently handle balance fetch errors
      }

      // Save session
      saveSession(evmAddress, 'metamask', 'evm')

      // Set all state atomically
      console.log('[AUTH_TRACE] wallet.ts finalizeMetaMaskConnection() BEFORE setting isConnected=true')
      set({
        address: evmAddress,
        evmAddress: evmAddress,
        isConnected: true,
        isConnecting: false,
        walletSource: 'metamask',
        accountMapped: true,
        walletType: 'evm',
        balance,
        linkedWallets: [],
      })
      console.log('[AUTH_TRACE] wallet.ts finalizeMetaMaskConnection() AFTER set isConnected=true')

      // Fetch profile and pods
      const { useProfileStore } = await import('./profile')
      console.log('[AUTH_TRACE] wallet.ts finalizeMetaMaskConnection() BEFORE fetchProfile')
      await useProfileStore.getState().fetchProfile(evmAddress)
      const profileState = useProfileStore.getState()
      console.log('[AUTH_TRACE] wallet.ts finalizeMetaMaskConnection() AFTER fetchProfile, isRegistered:', profileState.isRegistered, 'needsRegistration:', profileState.needsRegistration)

      const { usePodsStore } = await import('./pods')
      await usePodsStore.getState().fetchPods()

      // Set up MetaMask event listeners (only once)
      if (!metamaskListenersSetup && window.ethereum) {
        const handleAccountsChanged = async (accounts: string[]) => {
          if (accounts.length === 0) {
            // User disconnected
            get().disconnect()
          } else {
            // Account changed - update state
            const newAddress = accounts[0].toLowerCase()
            set({
              address: newAddress,
              evmAddress: newAddress,
            })
            // Refresh profile for new account
            const { useProfileStore } = await import('./profile')
            const profileStore = useProfileStore.getState()
            await profileStore.fetchProfile(newAddress)
            
            // If new account doesn't have a profile, redirect to /connect
            if (profileStore.needsRegistration || !profileStore.isRegistered) {
              if (typeof window !== 'undefined' && window.location.pathname !== '/connect') {
                window.location.href = '/connect'
              }
            }
          }
        }

        const handleChainChanged = () => {
          // Reload page on chain change (standard MetaMask behavior)
          window.location.reload()
        }

        window.ethereum.on('accountsChanged', handleAccountsChanged)
        window.ethereum.on('chainChanged', handleChainChanged)
        
        metamaskListenersSetup = true
      }

    } catch (error) {
      console.error('❌ [finalizeMetaMaskConnection] Error:', error)
      set({ isConnecting: false })
      throw error
    }
  },

  disconnect: async () => {
    if (balanceUnsub) {
      balanceUnsub()
      balanceUnsub = null
    }
    clearSession()
    
    // Clear all qflink-prefixed localStorage entries on disconnect
    if (typeof window !== 'undefined') {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('qflink')) localStorage.removeItem(key);
      });
    }
    
    set({
      address: null,
      balance: BigInt(0),
      isConnected: false,
      walletSource: null,
      encryptionKeyPair: null,
      linkedWallets: [],
      evmAddress: null,
      accountMapped: false,
      walletType: null,
    })

    const { useProfileStore } = await import('./profile')
    useProfileStore.getState().reset()
    
    // Redirect to /connect page (only if in browser and not already there)
    if (typeof window !== 'undefined' && window.location.pathname !== '/connect' && window.location.pathname !== '/') {
      window.location.href = '/connect'
    }
  },

  ensureMapping: async () => {
    const { address, walletSource, walletType } = get()
    
    // For EVM wallets, no mapping needed
    if (walletType === 'evm') {
      const evmAddr = get().evmAddress
      if (!evmAddr) {
        throw new Error('No EVM address available')
      }
      return evmAddr
    }
    
    if (!address || !walletSource) {
      throw new Error('No wallet connected')
    }

    const { web3FromSource } = await import('@polkadot/extension-dapp')
    const injector = await web3FromSource(walletSource)
    
    const account: InjectedAccountWithMeta = {
      address,
      meta: { source: walletSource },
      signer: injector.signer,
    }

    const evmAddr = await ensureAccountMapped(account)
    set({ evmAddress: evmAddr, accountMapped: true })
    
    const { useProfileStore } = await import('./profile')
    await useProfileStore.getState().fetchProfile(evmAddr)
    
    return evmAddr
  },

  setBalance: (balance: bigint) => set({ balance }),

  refreshBalance: async () => {
    const { evmAddress, walletType } = get()
    if (!evmAddress) return

    try {
      if (walletType === 'evm') {
        // MetaMask: fetch via eth_getBalance
        const ethRpcUrl = import.meta.env.VITE_ETH_RPC_URL
        if (ethRpcUrl) {
          const response = await fetch(ethRpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'eth_getBalance',
              params: [evmAddress, 'latest'],
            }),
          })
          const data = await response.json()
          if (data.result) {
            set({ balance: BigInt(data.result) })
          }
        }
      } else {
        // Substrate: query balance
        const { queryBalance } = await import('@/lib/chain')
        const balance = await queryBalance(get().address!)
        set({ balance })
      }
    } catch (err) {
      console.error('[refreshBalance] Failed:', err)
    }
  },

  setEncryptionKeyPair: (keyPair) => set({ encryptionKeyPair: keyPair }),

  addLinkedWallet: (wallet: LinkedWallet) => {
    const current = get().linkedWallets
    if (!current.find((w) => w.address === wallet.address)) {
      set({ linkedWallets: [...current, wallet] })
    }
  },

  removeLinkedWallet: (address: string) => {
    set({ linkedWallets: get().linkedWallets.filter((w) => w.address !== address) })
  },

  setEvmAddress: (evmAddress: string) => set({ evmAddress, accountMapped: true }),
}))

// Auto-reconnect from saved session on app load
if (typeof window !== 'undefined') {
  const session = loadSession()
  if (session) {
    ;(async () => {
      try {
        // Check wallet type and reconnect accordingly
        if (session.walletType === 'evm') {
          // For EVM wallets, use silent connect (no popup)
          const restored = await useWalletStore.getState().silentConnectMetaMask()
          if (!restored) {
            clearSession()
          }
        } else {
          // Substrate wallet reconnection
          const { web3Enable, web3Accounts } = await import('@polkadot/extension-dapp')
          await web3Enable('QFLink')
          const accounts = await web3Accounts()
          const account = accounts.find(acc => acc.address === session.address)
          
          if (account) {
            await useWalletStore.getState().connect(account)
          } else {
            clearSession()
          }
        }
      } catch (err) {
        console.error('❌ Failed to restore session:', err)
        clearSession()
      }
    })()
  }
}

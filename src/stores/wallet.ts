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
  walletType: null,

  connect: async (selectedAccount?: InjectedAccountWithMeta) => {
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
      console.log('✅ Connected to wallet:', { address, source })

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
        console.warn('Could not fetch on-chain balance, using 0:', err)
      }

      let evmAddr: string | null = null
      try {
        const api = await getApi()
        evmAddr = await getEvmAddress(address)
        
        // If no chain mapping exists, derive EVM address locally (same algorithm as pallet-revive)
        if (!evmAddr) {
          evmAddr = deriveEvmAddress(address)
          console.log('📍 Derived EVM address locally:', evmAddr)
        } else {
          console.log('📍 Found EVM address from chain:', evmAddr)
        }
      } catch (err) {
        console.warn('Could not check EVM address mapping:', err)
        // Fallback to derived address
        evmAddr = deriveEvmAddress(address)
      }

      // Final fallback
      if (!evmAddr) {
        evmAddr = deriveEvmAddress(address)
      }

      if (evmAddr) {
        saveSession(address, source, 'substrate')
        
        // Set all state atomically - components will see complete state at once
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
        
        const { useProfileStore } = await import('./profile')
        await useProfileStore.getState().fetchProfile(evmAddr)
        
        // Fetch pods after profile is loaded so Home page has data ready
        const { usePodsStore } = await import('./pods')
        await usePodsStore.getState().fetchPods()
      } else {
        // This should never happen since we always derive, but handle gracefully
        set({ isConnecting: false })
        throw new Error('Could not determine EVM address')
      }
    } catch (error) {
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
      console.log('✅ Connected to MetaMask:', evmAddress)
      
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

      console.log('🔄 [silentConnectMetaMask] Restoring session:', evmAddress)
      
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
        console.warn('Could not fetch ETH balance, using 0:', err)
      }

      // Save session
      saveSession(evmAddress, 'metamask', 'evm')

      // Set all state atomically
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

      // Fetch profile and pods
      const { useProfileStore } = await import('./profile')
      await useProfileStore.getState().fetchProfile(evmAddress)

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
              console.log('🔀 [accountsChanged] New account has no profile, redirecting to /connect')
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
        console.log('📡 [connectMetaMask] Event listeners registered')
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
    console.log('✅ Wallet disconnected')
    
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
    console.log('🔄 Restoring wallet session...', session)
    ;(async () => {
      try {
        // Check wallet type and reconnect accordingly
        if (session.walletType === 'evm') {
          // For EVM wallets, use silent connect (no popup)
          const restored = await useWalletStore.getState().silentConnectMetaMask()
          if (restored) {
            console.log('✅ EVM wallet session restored silently')
          } else {
            console.warn('⚠️ Could not restore EVM session silently, clearing session')
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
            console.log('✅ Substrate wallet session restored')
          } else {
            console.warn('⚠️ Saved account not found, clearing session')
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

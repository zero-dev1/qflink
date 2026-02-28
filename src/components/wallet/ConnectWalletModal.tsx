import React, { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useUIStore } from '@/stores/ui'
import { useWalletStore } from '@/stores/wallet'
import { useUIStore as useUI } from '@/stores/ui'
import { SelectAccountModal, type ExtensionAccount } from './SelectAccountModal'
import { queryBalance } from '@/lib/chain'
import { Spinner } from '@/components/ui/Spinner'

const SUBSTRATE_WALLETS = [
  { id: 'talisman', name: 'Talisman', icon: '🦊', url: 'https://talisman.xyz' },
  { id: 'polkadot-js', name: 'Polkadot.js', icon: '🔴', url: 'https://polkadot.js.org/extension/' },
  { id: 'subwallet', name: 'SubWallet', icon: '📱', url: 'https://subwallet.app' },
] as const

type WalletId = typeof SUBSTRATE_WALLETS[number]['id'] | 'metamask'

export const ConnectWalletModal: React.FC = () => {
  const showConnectWallet = useUIStore((s) => s.showConnectWallet)
  const setShowConnectWallet = useUIStore((s) => s.setShowConnectWallet)
  const addToast = useUI((s) => s.addToast)
  const connectStore = useWalletStore((s) => s.connect)
  const connectMetaMaskStore = useWalletStore((s) => s.connectMetaMask)

  const [loadingWallet, setLoadingWallet] = useState<WalletId | null>(null)
  const [accounts, setAccounts] = useState<ExtensionAccount[]>([])
  const [selectedWalletName, setSelectedWalletName] = useState('')
  const [showAccountPicker, setShowAccountPicker] = useState(false)

  const handleExtensionConnect = async (wallet: typeof SUBSTRATE_WALLETS[number]) => {
    setLoadingWallet(wallet.id)
    try {
      const { web3Enable, web3Accounts } = await import('@polkadot/extension-dapp')
      const extensions = await web3Enable('QFLink')
      if (extensions.length === 0) {
        addToast('error', 'No wallet extension found. Please install ' + wallet.name + '.')
        return
      }

      const rawAccounts = await web3Accounts()
      if (rawAccounts.length === 0) {
        addToast('error', 'No accounts found. Please create an account in ' + wallet.name + '.')
        return
      }

      // Fetch balances for each account (best-effort)
      const enriched: ExtensionAccount[] = await Promise.all(
        rawAccounts.map(async (acc) => {
          let balance: bigint | undefined
          try {
            balance = await queryBalance(acc.address)
          } catch {
            balance = undefined
          }
          return {
            address: acc.address,
            name: acc.meta.name,
            source: acc.meta.source || wallet.id,
            balance,
          }
        })
      )

      setAccounts(enriched)
      setSelectedWalletName(wallet.name)
      setShowAccountPicker(true)
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to connect wallet')
    } finally {
      setLoadingWallet(null)
    }
  }

  const handleMetaMaskConnect = async () => {
    setLoadingWallet('metamask')
    try {
      await connectMetaMaskStore()
      setShowConnectWallet(false)
      addToast('success', 'MetaMask connected successfully')
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to connect MetaMask')
    } finally {
      setLoadingWallet(null)
    }
  }

  const handleAccountSelect = async (account: ExtensionAccount) => {
    try {
      const { web3Accounts } = await import('@polkadot/extension-dapp')
      const allAccounts = await web3Accounts()
      const selectedAccount = allAccounts.find(acc => acc.address === account.address)
      
      if (!selectedAccount) {
        addToast('error', 'Account not found')
        return
      }
      
      await connectStore(selectedAccount)
      setShowAccountPicker(false)
      setShowConnectWallet(false)
      addToast('success', 'Wallet connected successfully')
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to connect')
    }
  }

  const handleClose = () => {
    setShowConnectWallet(false)
    setShowAccountPicker(false)
    setAccounts([])
  }

  return (
    <>
      <Modal
        isOpen={showConnectWallet && !showAccountPicker}
        onClose={handleClose}
        title="Connect Wallet"
      >
        <div className="space-y-4">
          {/* EVM Wallets Section */}
          <div>
            <p className="text-sm text-qx-text-secondary mb-3">EVM Wallets:</p>
            <button
              onClick={handleMetaMaskConnect}
              disabled={loadingWallet !== null}
              className="flex w-full items-center gap-3 rounded-lg border border-qx-border-subtle p-4 text-left transition-colors hover:bg-qx-elevated hover:border-qx-border-prominent disabled:opacity-50"
            >
              <span className="text-2xl">🦊</span>
              <span className="flex-1 text-sm font-medium text-qx-text-primary">MetaMask</span>
              {loadingWallet === 'metamask' ? (
                <Spinner size="sm" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-qx-text-muted">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-qx-border-subtle"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-qx-card text-qx-text-muted">or</span>
            </div>
          </div>

          {/* Substrate Wallets Section */}
          <div>
            <p className="text-sm text-qx-text-secondary mb-3">Substrate Wallets:</p>
            <div className="space-y-2">
              {SUBSTRATE_WALLETS.map((wallet) => (
                <button
                  key={wallet.id}
                  onClick={() => handleExtensionConnect(wallet)}
                  disabled={loadingWallet !== null}
                  className="flex w-full items-center gap-3 rounded-lg border border-qx-border-subtle p-4 text-left transition-colors hover:bg-qx-elevated hover:border-qx-border-prominent disabled:opacity-50"
                >
                  <span className="text-2xl">{wallet.icon}</span>
                  <span className="flex-1 text-sm font-medium text-qx-text-primary">{wallet.name}</span>
                  {loadingWallet === wallet.id ? (
                    <Spinner size="sm" />
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-qx-text-muted">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-qx-text-muted text-center pt-2">
            Don't have a wallet?{' '}
            <a href="https://talisman.xyz" target="_blank" rel="noopener noreferrer" className="text-cyan-600 hover:underline">
              Get Talisman
            </a>
            {' · '}
            <a href="https://subwallet.app" target="_blank" rel="noopener noreferrer" className="text-cyan-600 hover:underline">
              Get SubWallet
            </a>
            {' · '}
            <a href="https://metamask.io" target="_blank" rel="noopener noreferrer" className="text-cyan-600 hover:underline">
              Get MetaMask
            </a>
          </p>
        </div>
      </Modal>

      <SelectAccountModal
        isOpen={showAccountPicker}
        onClose={() => { setShowAccountPicker(false); setAccounts([]) }}
        accounts={accounts}
        walletName={selectedWalletName}
        onSelect={handleAccountSelect}
      />
    </>
  )
}

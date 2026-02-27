import React, { useState, useCallback } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Modal } from '@/components/ui/Modal'
import { useWallet } from '@/hooks/useWallet'
import { useToast } from '@/hooks/useToast'
import { useUIStore } from '@/stores/ui'
import { formatBalance, truncateAddress, copyToClipboard } from '@/lib/utils'
import { publicKeyToBase64 } from '@/lib/encryption'
import { NETWORKS, NETWORK_ORDER, DEV_ACCOUNTS, DEV_MNEMONIC, type NetworkId } from '@/lib/network'
import { switchNetwork } from '@/lib/chain'
import { useNetworkStore } from '@/stores/network'
import type { Theme } from '@/types'

const STATUS_DOT: Record<string, string> = {
  connected: 'bg-qf-success',
  connecting: 'bg-yellow-400 animate-pulse',
  disconnected: 'bg-red-500',
  stalled: 'bg-orange-400 animate-pulse',
}
const STATUS_LABEL: Record<string, string> = {
  connected: 'Connected',
  connecting: 'Connecting...',
  disconnected: 'Disconnected',
  stalled: 'Network may be stalled',
}

const SettingsPage: React.FC = () => {
  const {
    address,
    balance,
    isConnected,
    encryptionKeyPair,
    linkedWallets,
    connect,
    disconnect,
    addLinkedWallet,
    removeLinkedWallet,
  } = useWallet()
  const toast = useToast()
  const [showRegenWarning, setShowRegenWarning] = useState(false)
  const [switching, setSwitching] = useState(false)

  const activeNetwork = useNetworkStore((s) => s.currentNetwork)
  const connectionStatus = useNetworkStore((s) => s.connectionStatus)
  const latestBlock = useNetworkStore((s) => s.latestBlock)
  const theme = useUIStore((s) => s.theme)
  const setTheme = useUIStore((s) => s.setTheme)

  const totalBalance = linkedWallets.reduce((sum, w) => sum + w.balance, balance)

  const handleNetworkSwitch = useCallback(async (id: NetworkId) => {
    if (id === activeNetwork) return
    setSwitching(true)
    try {
      await switchNetwork(id)
      toast.success(`Switched to ${NETWORKS[id].name}`)
    } catch {
      toast.error('Failed to switch network')
    } finally {
      setSwitching(false)
    }
  }, [activeNetwork, toast])

  const handleCopy = (text: string, label: string) => {
    copyToClipboard(text)
    toast.success(`${label} copied to clipboard`)
  }

  const handleLinkWallet = () => {
    const mockLinked = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty'
    addLinkedWallet({ address: mockLinked, balance: BigInt('500000000000000000000'), isPrimary: false })
    toast.success('Wallet linked successfully')
  }

  if (!isConnected) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-qf-text-primary mb-4">Connect Your Wallet</h2>
          <p className="text-sm text-qf-text-muted mb-6">Connect your wallet to access settings</p>
          <Button onClick={() => useUIStore.getState().setShowConnectWallet(true)}>Connect Wallet</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-qf-text-primary">Settings</h1>

      <Card header={{ title: 'Connected Wallet' }}>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Avatar address={address || ''} size="lg" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-qf-text-primary truncate">{address}</p>
              <p className="text-xs text-qf-text-secondary">{formatBalance(balance)} QF</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopy(address || '', 'Address')}
            >
              Copy
            </Button>
          </div>
          <Button variant="secondary" size="sm" onClick={disconnect}>
            Disconnect
          </Button>
        </div>
      </Card>

      <Card
        header={{
          title: 'Linked Wallets',
          action: <Button size="sm" onClick={handleLinkWallet}>Link New Wallet</Button>,
        }}
      >
        <div className="space-y-3">
          <p className="text-sm text-qf-text-secondary">
            Link multiple wallets to aggregate balances for pod access
          </p>

          {linkedWallets.length === 0 ? (
            <p className="text-sm text-qf-text-muted py-4 text-center">No linked wallets</p>
          ) : (
            linkedWallets.map((wallet) => (
              <div key={wallet.address} className="flex items-center gap-3 border border-qf-card-border p-3">
                <Avatar address={wallet.address} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-qf-text-primary truncate">{truncateAddress(wallet.address)}</p>
                  <p className="text-xs text-qf-text-secondary">{formatBalance(wallet.balance)} QF</p>
                </div>
                <Button variant="danger" size="sm" onClick={() => removeLinkedWallet(wallet.address)}>
                  Unlink
                </Button>
              </div>
            ))
          )}

          <div className="flex items-center justify-between bg-qf-elevated p-3">
            <span className="text-sm text-qf-text-secondary">Total Aggregated Balance</span>
            <span className="text-sm font-semibold dark:text-qf-accent text-qf-text-primary">{formatBalance(totalBalance)} QF</span>
          </div>
        </div>
      </Card>

      <Card header={{ title: 'Network' }}>
        <div className="space-y-4">
          {/* Connection status */}
          <div className="flex items-center justify-between bg-qf-elevated p-3">
            <div className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT[connectionStatus]}`} />
              <span className="text-sm text-qf-text-primary">{STATUS_LABEL[connectionStatus]}</span>
            </div>
            {latestBlock > 0 && (
              <span className="text-xs text-qf-text-muted">Block #{latestBlock}</span>
            )}
          </div>

          {/* Stalled banner */}
          {connectionStatus === 'stalled' && (
            <div className="rounded-lg border border-orange-400/30 bg-orange-400/10 p-3">
              <p className="text-sm text-orange-300 mb-2">
                {activeNetwork === 'testnet'
                  ? 'Testnet appears inactive. Switch to Local Dev for testing.'
                  : 'Network may be stalled — no new blocks in 60s.'}
              </p>
              {activeNetwork !== 'local' && (
                <Button size="sm" onClick={() => handleNetworkSwitch('local')}>
                  Switch to Local Dev
                </Button>
              )}
            </div>
          )}

          {/* Disconnected after retries */}
          {connectionStatus === 'disconnected' && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
              <p className="text-sm text-red-300 mb-2">Cannot connect to {NETWORKS[activeNetwork].name}.</p>
              {activeNetwork !== 'local' && (
                <Button size="sm" onClick={() => handleNetworkSwitch('local')}>
                  Switch to Local Dev
                </Button>
              )}
            </div>
          )}

          {/* Network selector */}
          <p className="text-sm text-qf-text-secondary">
            Select which network to connect to
          </p>
          <div className="grid grid-cols-3 gap-2">
            {NETWORK_ORDER.map((id) => {
              const net = NETWORKS[id]
              const dotColor = id === 'local' ? 'bg-blue-400' : id === 'testnet' ? 'bg-yellow-400' : 'bg-qf-success'
              return (
                <button
                  key={id}
                  disabled={switching}
                  onClick={() => handleNetworkSwitch(id)}
                  className={`border p-3 text-left transition-[border-color,transform] duration-150 hover:-translate-y-0.5 ${
                    activeNetwork === id
                      ? 'border-qf-accent bg-qf-accent'
                      : 'border-qf-card-border hover:border-qf-accent'
                  } ${switching ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`h-2 w-2 rounded-full ${dotColor}`} />
                    <span className={`text-sm font-medium ${activeNetwork === id ? 'text-black' : 'text-qf-text-primary'}`}>{net.name}</span>
                  </div>
                  <p className={`text-[10px] truncate ${activeNetwork === id ? 'text-black/70' : 'text-qf-text-muted'}`}>{net.wsUrl}</p>
                  {net.description && (
                    <p className={`text-[10px] mt-1 ${activeNetwork === id ? 'text-black/70' : 'text-qf-text-muted'}`}>{net.description}</p>
                  )}
                </button>
              )
            })}
          </div>

          {activeNetwork === 'testnet' && NETWORKS.testnet.faucetUrl && (
            <p className="text-xs text-qf-text-muted">
              Need test tokens?{' '}
              <a
                href={NETWORKS.testnet.faucetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-qf-accent hover:underline"
              >
                Get QF from faucet
              </a>
            </p>
          )}
        </div>
      </Card>

      {/* Dev Wallets — only on local network */}
      {activeNetwork === 'local' && (
        <Card header={{ title: 'Dev Wallets' }}>
          <div className="space-y-4">
            <p className="text-sm text-qf-text-secondary">
              To import a dev account into Polkadot.js extension: paste the mnemonic below, then set the derivation path in Advanced.
            </p>

            {/* Shared mnemonic */}
            <div className="border border-qf-card-border bg-qf-elevated p-3">
              <label className="text-xs text-qf-text-muted mb-1 block">Shared Dev Mnemonic (12 words)</label>
              <code className="block text-xs text-qf-accent break-all leading-relaxed">{DEV_MNEMONIC}</code>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => handleCopy(DEV_MNEMONIC, 'Dev mnemonic')}
              >
                Copy Mnemonic
              </Button>
            </div>

            <p className="text-xs text-qf-text-muted">
              Each account uses a different derivation path. In the extension, expand "Advanced" and paste the derivation path.
            </p>

            {DEV_ACCOUNTS.map((acct) => (
              <div key={acct.address} className="flex items-center gap-3 border border-qf-card-border p-3">
                <Avatar address={acct.address} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-qf-text-primary">{acct.name}</span>
                    <span className="text-[10px] rounded bg-qf-elevated px-1.5 py-0.5 text-qf-text-muted">{acct.role}</span>
                  </div>
                  <p className="text-[10px] text-qf-text-muted truncate mt-0.5">{acct.address}</p>
                  <p className="text-[10px] text-qf-text-secondary mt-0.5">Derivation: <code className="text-qf-accent">{acct.derivation}</code></p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(acct.derivation, `${acct.name} derivation path`)}
                >
                  Copy Path
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Appearance */}
      <Card header={{ title: 'Appearance' }}>
        <div className="space-y-3">
          <p className="text-sm text-qf-text-secondary">Theme</p>
          <div className="flex gap-2">
            {(['light', 'dark', 'system'] as Theme[]).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`flex-1 rounded-lg border py-2 text-sm font-medium capitalize transition-colors ${
                  theme === t
                    ? 'border-qf-accent bg-qf-accent/10 text-qf-accent'
                    : 'border-qf-border-subtle text-qf-text-secondary hover:border-qf-border-prominent'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card header={{ title: 'Encryption Keys' }}>
        <div className="space-y-3">
          {encryptionKeyPair ? (
            <>
              <div>
                <label className="text-xs text-qf-text-muted">Public Key</label>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 truncate rounded bg-qf-elevated px-3 py-2 text-xs text-qf-text-secondary">
                    {publicKeyToBase64(encryptionKeyPair.publicKey)}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(publicKeyToBase64(encryptionKeyPair.publicKey), 'Public key')}
                  >
                    Copy
                  </Button>
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setShowRegenWarning(true)}>
                Regenerate Keys
              </Button>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-qf-text-muted mb-3">No encryption keys generated</p>
              <Badge variant="warning">Keys will be generated on first message</Badge>
            </div>
          )}
        </div>
      </Card>

      {/* About */}
      <Card header={{ title: 'About' }}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-qf-text-secondary">Version</span>
            <span className="text-sm font-medium text-qf-text-primary">QFLink v1.0.0</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-qf-text-secondary">Network</span>
            <span className="text-sm font-medium text-qf-text-primary">QF Network</span>
          </div>
          <div className="flex gap-2 pt-1">
            <a
              href="https://github.com/QuantumFusion-network"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 rounded-lg border border-qf-border-prominent py-2 text-center text-sm font-medium text-qf-text-secondary hover:border-qf-border-prominent hover:text-qf-text-primary transition-colors"
            >
              View on GitHub
            </a>
            <a
              href="https://qfnode.net"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 rounded-lg border border-qf-border-prominent py-2 text-center text-sm font-medium text-qf-text-secondary hover:border-qf-border-prominent hover:text-qf-text-primary transition-colors"
            >
              QF Network
            </a>
          </div>
        </div>
      </Card>

      <Modal
        isOpen={showRegenWarning}
        onClose={() => setShowRegenWarning(false)}
        title="Regenerate Encryption Keys?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowRegenWarning(false)}>Cancel</Button>
            <Button variant="danger" onClick={() => { setShowRegenWarning(false); toast.warning('Key regeneration not yet implemented') }}>
              Regenerate
            </Button>
          </>
        }
      >
        <p className="text-sm text-qf-text-secondary">
          Regenerating your encryption keys will make all previously encrypted messages unreadable.
          This action cannot be undone. Are you sure?
        </p>
      </Modal>
    </div>
  )
}

export default SettingsPage

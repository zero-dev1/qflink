import React, { useState, useCallback, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { useWallet } from '@/hooks/useWallet'
import { useToast } from '@/hooks/useToast'
import { useUIStore } from '@/stores/ui'
import { hasRegisteredName, checkAvailability, getPrice, getAnnualPriceWithDuration, registerName, registerPermanentName, isValidName, getValidationError } from '@/lib/qnsRegistrar'
import { useQFName } from '@/hooks/useQFName'
import { QNSRegistration } from '@/components/qns/QNSRegistration'
import { useWalletStore } from '@/stores/wallet'
import { formatBalance, truncateAddress, copyToClipboard } from '@/lib/utils'
import { NETWORKS, DEV_ACCOUNTS, DEV_MNEMONIC, type NetworkId } from '@/lib/network'
import { useNetworkStore } from '@/stores/network'
import type { Theme } from '@/types'
import {
  areNotificationsSupported,
  getNotificationPermission,
  areNotificationsEnabled,
  setNotificationsEnabled,
  requestNotificationPermission,
} from '@/lib/notifications'

const STATUS_DOT: Record<string, string> = {
  connected: 'bg-qx-success',
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

type NotificationStatus = 'disabled' | 'enabled' | 'blocked'

const SettingsPage: React.FC = () => {
  const {
    address,
    balance,
    isConnected,
    disconnect,
  } = useWallet()
  const toast = useToast()
  const [switching, setSwitching] = useState(false)
  const [notifStatus, setNotifStatus] = useState<NotificationStatus>('disabled')
  const [isTogglingNotif, setIsTogglingNotif] = useState(false)
  const [qnsRegistrationOpen, setQnsRegistrationOpen] = useState(false)

  const connectionStatus = useNetworkStore((s) => s.connectionStatus)
  const latestBlock = useNetworkStore((s) => s.latestBlock)
  const theme = useUIStore((s) => s.theme)
  const setTheme = useUIStore((s) => s.setTheme)

  // Check notification status on mount and when permission changes
  useEffect(() => {
    const checkStatus = () => {
      const permission = getNotificationPermission()
      const enabled = areNotificationsEnabled()

      if (permission === 'denied') {
        setNotifStatus('blocked')
      } else if (permission === 'granted' && enabled) {
        setNotifStatus('enabled')
      } else {
        setNotifStatus('disabled')
      }
    }

    checkStatus()
    // Re-check when window gains focus (user might have changed permissions)
    window.addEventListener('focus', checkStatus)
    return () => window.removeEventListener('focus', checkStatus)
  }, [isTogglingNotif])

  const handleNetworkSwitch = useCallback(async (id: NetworkId) => {
    // Network switching not available in PAPI setup
    setSwitching(false)
    toast.error('Network switching not available in current setup')
  }, [toast])

  const handleCopy = (text: string, label: string) => {
    copyToClipboard(text)
    toast.success(`${label} copied to clipboard`)
  }

  const handleNotificationToggle = async () => {
    if (!areNotificationsSupported()) {
      toast.error('Notifications not supported in this browser')
      return
    }

    setIsTogglingNotif(true)

    try {
      const permission = getNotificationPermission()

      if (notifStatus === 'enabled') {
        // User is turning OFF notifications
        setNotificationsEnabled(false)
        setNotifStatus('disabled')
        toast.success('Notifications disabled')
      } else {
        // User is turning ON notifications - request permission if needed
        if (permission === 'denied') {
          setNotifStatus('blocked')
          toast.error('Notifications blocked by browser. Enable in browser settings.')
        } else if (permission === 'granted') {
          // Permission already granted, just enable in app
          setNotificationsEnabled(true)
          setNotifStatus('enabled')
          toast.success('Notifications enabled')
        } else {
          // Need to request permission
          const granted = await requestNotificationPermission()
          if (granted) {
            setNotificationsEnabled(true)
            setNotifStatus('enabled')
            toast.success('Notifications enabled')
          } else {
            setNotifStatus('blocked')
            toast.error('Notifications blocked by browser. Enable in browser settings.')
          }
        }
      }
    } finally {
      setIsTogglingNotif(false)
    }
  }

  const getNotificationStatusText = () => {
    switch (notifStatus) {
      case 'enabled':
        return { text: 'Enabled', color: 'text-qx-success' }
      case 'blocked':
        return { text: 'Blocked by browser', color: 'text-red-500' }
      default:
        return { text: 'Disabled', color: 'text-qx-text-muted' }
    }
  }

  const getNotificationStatusDescription = () => {
    switch (notifStatus) {
      case 'enabled':
        return 'You will receive notifications when new messages arrive while the app is in the background.'
      case 'blocked':
        return 'Notifications are blocked by your browser. Please enable them in your browser settings to receive notifications.'
      default:
        return 'Enable notifications to get alerted when new messages arrive while the app is in the background.'
    }
  }

  if (!isConnected) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="font-display text-xl font-semibold text-qx-text-primary mb-4">Connect Your Wallet</h2>
          <p className="text-sm text-qx-text-muted mb-6">Connect your wallet to access settings</p>
          <Button onClick={() => useUIStore.getState().setShowConnectWallet(true)}>Connect Wallet</Button>
        </div>
      </div>
    )
  }

  const notifStatusInfo = getNotificationStatusText()
  const isDev = import.meta.env.DEV
  const evmAddress = useWalletStore((s) => s.evmAddress)
  const { name: userQNSName, refresh: refreshUserQNS } = useQFName(evmAddress || undefined)

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="font-display text-2xl font-bold text-qx-text-primary">Settings</h1>

      {/* Section 1 — Account */}
      <Card header={{ title: 'Account' }}>
        <div className="space-y-4">
          {/* Connected wallet address */}
          <div className="flex items-center gap-3">
            <Avatar address={address || ''} size="lg" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-qx-text-muted mb-0.5">Connected Wallet</p>
              <p className="text-sm font-medium text-qx-text-primary truncate">{address}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopy(address || '', 'Address')}
            >
              Copy
            </Button>
          </div>

          {/* Balance display */}
          <div className="flex items-center justify-between bg-qx-elevated p-3">
            <span className="text-sm text-qx-text-secondary">Balance</span>
            <span className="text-sm font-semibold text-cyan-600">{formatBalance(balance)} QF</span>
          </div>

          {/* Disconnect button */}
          <Button variant="secondary" size="sm" onClick={disconnect}>
            Disconnect Wallet
          </Button>
        </div>
      </Card>

      {/* Section 2 — QNS Name */}
      <Card header={{ title: 'QNS Name' }}>
        <div className="space-y-4">
          {userQNSName ? (
            <div className="flex items-center justify-between bg-qx-elevated p-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-cyan-600/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-cyan-600">{userQNSName}</p>
                  <p className="text-xs text-qx-text-muted">Your identity across QF</p>
                </div>
              </div>
              <span className="px-2 py-1 bg-cyan-600/20 text-cyan-600 text-xs font-medium rounded">
                Active
              </span>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-qx-text-secondary">
                You don&apos;t have a .qf name yet. Register one to make your identity recognizable across the QF ecosystem.
              </p>
              <Button
                onClick={() => setQnsRegistrationOpen(true)}
                className="w-full"
              >
                Register .qf Name
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Section 3 — Notifications */}
      <Card header={{ title: 'Notifications' }}>
        <div className="space-y-4">
          {/* Notification toggle */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-qx-text-primary">Enable notifications</p>
              <p className="text-xs text-qx-text-muted mt-1">
                Status: <span className={notifStatusInfo.color}>{notifStatusInfo.text}</span>
              </p>
            </div>
            <button
              onClick={handleNotificationToggle}
              disabled={isTogglingNotif || notifStatus === 'blocked'}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:ring-offset-2 ${
                notifStatus === 'enabled'
                  ? 'bg-cyan-600'
                  : notifStatus === 'blocked'
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  notifStatus === 'enabled' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Status description */}
          <p className="text-sm text-qx-text-secondary">
            {getNotificationStatusDescription()}
          </p>
        </div>
      </Card>

      {/* Section 4 — Appearance */}
      <Card header={{ title: 'Appearance' }}>
        <div className="space-y-3">
          <p className="text-sm text-qx-text-secondary">Theme</p>
          <div className="flex gap-2">
            {(['light', 'dark', 'system'] as Theme[]).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`flex-1 rounded-lg border py-2 text-sm font-medium capitalize transition-colors ${
                  theme === t
                    ? 'border-cyan-600 bg-cyan-600/10 text-cyan-600'
                    : 'border-qx-border-subtle text-qx-text-secondary hover:border-qx-border-prominent'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Network selector - DEV only */}
      {isDev && (
        <Card header={{ title: 'Network (Dev Only)' }}>
          <div className="space-y-4">
            {/* Connection status */}
            <div className="flex items-center justify-between bg-qx-elevated p-3">
              <div className="flex items-center gap-2">
                <div className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT[connectionStatus]}`} />
                <span className="text-sm text-qx-text-primary">{STATUS_LABEL[connectionStatus]}</span>
              </div>
              {latestBlock > 0 && (
                <span className="text-xs text-qx-text-muted">Block #{latestBlock}</span>
              )}
            </div>

            {/* Network warning banner */}
            {connectionStatus === 'disconnected' && (
              <div className="rounded-lg border border-orange-400/30 bg-orange-400/10 p-3">
                <p className="text-sm text-orange-300 mb-2">
                  Network may be stalled — no new blocks in 60s.
                </p>
                <p className="text-xs text-gray-400">
                  Network switching not available in current setup
                </p>
              </div>
            )}

            {/* Substrate node connection status — shows amber warning when offline since EVM RPC is primary */}
            {connectionStatus === 'disconnected' && (
              <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3">
                <p className="text-sm text-amber-300">Substrate node: Offline</p>
                <p className="text-xs text-amber-300/70 mt-1">
                  EVM RPC connection is active. Some features like balance queries may be limited.
                </p>
              </div>
            )}

            {/* Network selector disabled */}
            <p className="text-sm text-qx-text-secondary">Network switching not available in current setup</p>
            <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg text-center">
              <p className="text-sm text-qx-text-muted">Connected to default network</p>
            </div>
          </div>
        </Card>
      )}

      {/* Dev Wallets - DEV only */}
      {isDev && (
        <Card header={{ title: 'Dev Wallets (Dev Only)' }}>
          <div className="space-y-4">
            <p className="text-sm text-qx-text-secondary">
              To import a dev account into Polkadot.js extension: paste the mnemonic below, then set the derivation path in Advanced.
            </p>

            {/* Shared mnemonic */}
            <div className="border border-gray-200 dark:border-gray-800 bg-transparent p-3">
              <label className="text-xs text-qx-text-muted mb-1 block">Shared Dev Mnemonic (12 words)</label>
              <code className="block text-xs text-cyan-600 break-all leading-relaxed">{DEV_MNEMONIC}</code>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => handleCopy(DEV_MNEMONIC, 'Dev mnemonic')}
              >
                Copy Mnemonic
              </Button>
            </div>

            <p className="text-xs text-qx-text-muted">
              Each account uses a different derivation path. In the extension, expand &quot;Advanced&quot; and paste the derivation path.
            </p>

            {DEV_ACCOUNTS.map((acct) => (
              <div key={acct.address} className="flex items-center gap-3 border border-gray-200 dark:border-gray-800 bg-transparent p-3">
                <Avatar address={acct.address} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-qx-text-primary">{acct.name}</span>
                    <span className="text-[10px] rounded bg-qx-elevated px-1.5 py-0.5 text-qx-text-muted">{acct.role}</span>
                  </div>
                  <p className="text-[10px] text-qx-text-muted truncate mt-0.5">{acct.address}</p>
                  <p className="text-[10px] text-qx-text-secondary mt-0.5">Derivation: <code className="text-cyan-600">{acct.derivation}</code></p>
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

      {/* Section 5 — About */}
      <Card header={{ title: 'About' }}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-qx-text-secondary">Version</span>
            <span className="text-sm font-medium text-qx-text-primary">v1.0.0</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-qx-text-secondary">Network</span>
            <span className="text-sm font-medium text-qx-text-primary">Default Network</span>
          </div>
          <div className="flex gap-2 pt-1">
            <a
              href="https://qfnetwork.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 rounded-lg border border-qx-border-prominent py-2 text-center text-sm font-medium text-qx-text-secondary hover:border-qx-border-prominent hover:text-qx-text-primary transition-colors"
            >
              QF Network
            </a>
            <a
              href="https://qflink.vercel.app/whitepaper"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 rounded-lg border border-qx-border-prominent py-2 text-center text-sm font-medium text-qx-text-secondary hover:border-qx-border-prominent hover:text-qx-text-primary transition-colors"
            >
              Whitepaper
            </a>
          </div>
        </div>
      </Card>
      {/* QNS Registration Modal */}
      {qnsRegistrationOpen && (
        <div className="fixed inset-0 z-50">
          <QNSRegistration 
            onComplete={() => setQnsRegistrationOpen(false)} 
            onSuccess={refreshUserQNS}
          />
        </div>
      )}
    </div>
  )
}

export default SettingsPage

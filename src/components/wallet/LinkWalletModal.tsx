import React, { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { copyToClipboard, isValidAddress } from '@/lib/utils'
import { useToast } from '@/hooks/useToast'
import { useWallet } from '@/hooks/useWallet'
import { LIMITS } from '@/types'

interface LinkWalletModalProps {
  isOpen: boolean
  onClose: () => void
}

type Step = 1 | 2 | 3 | 4

export const LinkWalletModal: React.FC<LinkWalletModalProps> = ({ isOpen, onClose }) => {
  const toast = useToast()
  const { address, linkedWallets, addLinkedWallet } = useWallet()

  const [step, setStep] = useState<Step>(1)
  const [walletAddress, setWalletAddress] = useState('')
  const [signature, setSignature] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [addressError, setAddressError] = useState('')
  const [copiedMsg, setCopiedMsg] = useState(false)

  const timestamp = Math.floor(Date.now() / 1000)
  const signMessage = `I authorize linking this wallet to ${address} on QFLink. Timestamp: ${timestamp}`

  const handleClose = () => {
    setStep(1)
    setWalletAddress('')
    setSignature('')
    setAddressError('')
    onClose()
  }

  const handleStep1Continue = () => {
    if (!walletAddress.trim()) {
      setAddressError('Please enter a wallet address')
      return
    }
    if (!isValidAddress(walletAddress.trim())) {
      setAddressError('Invalid wallet address format')
      return
    }
    if (walletAddress.trim() === address) {
      setAddressError('Cannot link your primary wallet')
      return
    }
    if (linkedWallets.find((w) => w.address === walletAddress.trim())) {
      setAddressError('This wallet is already linked')
      return
    }
    setAddressError('')
    setStep(2)
  }

  const handleCopyMessage = async () => {
    await copyToClipboard(signMessage)
    setCopiedMsg(true)
    setTimeout(() => setCopiedMsg(false), 2000)
  }

  const handleStep3Continue = () => {
    if (!signature.trim()) return
    setStep(4)
  }

  const handleSubmit = async () => {
    if (linkedWallets.length >= LIMITS.MAX_LINKED_WALLETS) {
      toast.error(`Maximum ${LIMITS.MAX_LINKED_WALLETS} linked wallets reached`)
      return
    }
    setIsSubmitting(true)
    try {
      // Mock verification — in production this calls the contract
      await new Promise((r) => setTimeout(r, 800))
      addLinkedWallet({
        address: walletAddress.trim(),
        balance: BigInt(0),
        isPrimary: false,
      })
      toast.success('Wallet linked successfully!')
      handleClose()
    } catch {
      toast.error('Failed to link wallet. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const stepLabels = ['Enter Address', 'Sign Message', 'Paste Signature', 'Confirm']

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Link a Wallet">
      <div className="space-y-4">
        {/* Step indicator */}
        <div className="flex items-center gap-1">
          {([1, 2, 3, 4] as Step[]).map((s) => (
            <React.Fragment key={s}>
              <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                s < step
                  ? 'bg-qf-accent text-black'
                  : s === step
                  ? 'bg-qf-accent/20 border border-qf-accent text-qf-accent'
                  : 'bg-qf-elevated text-qf-text-muted'
              }`}>
                {s < step ? (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : s}
              </div>
              {s < 4 && <div className={`flex-1 h-px transition-colors ${s < step ? 'bg-qf-accent' : 'bg-qf-border-subtle'}`} />}
            </React.Fragment>
          ))}
        </div>
        <p className="text-xs text-qf-text-muted">Step {step}: {stepLabels[step - 1]}</p>

        {/* Step 1: Enter address */}
        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm text-qf-text-secondary">
              Link another wallet to aggregate your balance.
            </p>
            <div>
              <label className="text-xs font-medium text-qf-text-secondary mb-1.5 block">
                Wallet address to link
              </label>
              <input
                type="text"
                value={walletAddress}
                onChange={(e) => { setWalletAddress(e.target.value); setAddressError('') }}
                placeholder="5... or 0x..."
                className={`w-full border bg-qf-card px-3 py-2 text-sm text-qf-text-primary placeholder:text-qf-text-muted focus:outline-none focus:ring-1 transition-colors ${
                  addressError
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-qf-border-prominent focus:border-qf-accent focus:ring-qf-accent'
                }`}
              />
              {addressError && (
                <p className="text-xs text-red-400 mt-1">{addressError}</p>
              )}
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleStep1Continue}
                className="rounded-md bg-qf-accent px-4 py-2 text-sm font-medium text-black hover:bg-qf-accent-hover transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Sign message */}
        {step === 2 && (
          <div className="space-y-3">
            <p className="text-sm text-qf-text-secondary">
              Sign this message with <span className="font-mono dark:text-qf-accent text-qf-text-primary">{walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}</span> to prove ownership:
            </p>
            <div className="border border-qf-card-border bg-qf-elevated p-3">
              <p className="text-xs text-qf-text-secondary font-mono leading-relaxed break-all">
                "{signMessage}"
              </p>
            </div>
            <button
              onClick={handleCopyMessage}
              className="flex items-center gap-2 text-xs font-medium dark:text-qf-accent text-qf-text-primary hover:text-qf-accent-hover transition-colors"
            >
              {copiedMsg ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy Message
                </>
              )}
            </button>
            <p className="text-xs text-qf-text-muted">
              Switch to that wallet in your extension, sign the message above, then click Continue.
            </p>
            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="text-sm text-qf-text-muted hover:text-qf-text-secondary transition-colors">
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="rounded-md bg-qf-accent px-4 py-2 text-sm font-medium text-black hover:bg-qf-accent-hover transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Paste signature */}
        {step === 3 && (
          <div className="space-y-3">
            <p className="text-sm text-qf-text-secondary">
              Paste the signature from your wallet:
            </p>
            <textarea
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="0x..."
              rows={3}
              className="w-full rounded-lg border border-qf-border-prominent bg-qf-card px-3 py-2 text-sm text-qf-text-primary placeholder:text-qf-text-muted focus:border-qf-accent focus:outline-none focus:ring-1 focus:ring-qf-accent resize-none font-mono"
            />
            <div className="flex justify-between">
              <button onClick={() => setStep(2)} className="text-sm text-qf-text-muted hover:text-qf-text-secondary transition-colors">
                ← Back
              </button>
              <button
                onClick={handleStep3Continue}
                disabled={!signature.trim()}
                className="rounded-lg bg-qf-accent px-4 py-2 text-sm font-medium text-black hover:bg-qf-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === 4 && (
          <div className="space-y-3">
            <p className="text-sm text-qf-text-secondary">
              Review and confirm the wallet link:
            </p>
            <div className="rounded-lg border border-qf-border-subtle bg-qf-elevated p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-qf-text-muted">Wallet to link</span>
                <span className="font-mono text-qf-text-primary text-xs">{walletAddress.slice(0, 10)}...{walletAddress.slice(-8)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-qf-text-muted">Primary wallet</span>
                <span className="font-mono text-qf-text-primary text-xs">{address?.slice(0, 10)}...{address?.slice(-8)}</span>
              </div>
            </div>
            <div className="flex justify-between">
              <button onClick={() => setStep(3)} className="text-sm text-qf-text-muted hover:text-qf-text-secondary transition-colors">
                ← Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-lg bg-qf-accent px-4 py-2 text-sm font-medium text-black hover:bg-qf-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting && (
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
                  </svg>
                )}
                Link Wallet
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

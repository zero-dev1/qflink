import React, { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import type { PodTier } from '@/types'
import { POD_TIER_INFO } from '@/types'
import { formatBalance } from '@/lib/utils'

interface CreatePodModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (name: string, description: string, minBalance: bigint, isPublic: boolean, tier: PodTier, entryFee: bigint, payoutWallet: string) => void | Promise<void>
  userBalance: bigint
}

const TIERS: PodTier[] = ['free', 'pro']

const TIER_LABEL_COLORS: Record<PodTier, string> = {
  free: 'text-qx-text-primary',
  pro: 'text-cyan-600',
}

export const CreatePodModal: React.FC<CreatePodModalProps> = ({ isOpen, onClose, onCreate, userBalance }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [tier, setTier] = useState<PodTier>('free')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [minBalance, setMinBalance] = useState('')
  const [entryFee, setEntryFee] = useState('')
  const [payoutWallet, setPayoutWallet] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [error, setError] = useState('')

  const reset = () => {
    setStep(1)
    setTier('free')
    setName('')
    setDescription('')
    setMinBalance('')
    setEntryFee('')
    setPayoutWallet('')
    setIsPublic(true)
    setError('')
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const tierInfo = POD_TIER_INFO[tier]
  const canAfford = (t: PodTier) => userBalance >= POD_TIER_INFO[t].creationFee

  const handleNext = () => {
    if (step === 1) {
      if (!canAfford(tier)) {
        setError('Insufficient balance for this tier')
        return
      }
      setError('')
      setStep(2)
    } else if (step === 2) {
      if (!name.trim()) {
        setError('Pod name is required')
        return
      }
      if (name.trim().length > 32) {
        setError('Pod name must be 32 characters or less')
        return
      }
      const bal = parseFloat(minBalance || '0')
      if (isNaN(bal) || bal < 0) {
        setError('Invalid minimum balance')
        return
      }
      // Free pods cannot have entry fees
      if (tier === 'free' && entryFee && parseFloat(entryFee) > 0) {
        setError('Free pods cannot charge entry fees. Upgrade to Pro.')
        return
      }
      setError('')
      setStep(3)
    }
  }

  const handleCreate = () => {
    const bal = parseFloat(minBalance || '0')
    const balanceBigInt = BigInt(Math.floor(bal * 1e18))
    const entryFeeBal = parseFloat(entryFee || '0')
    const entryFeeBigInt = BigInt(Math.floor(entryFeeBal * 1e18))
    onCreate(name.trim(), description.trim(), balanceBigInt, isPublic, tier, entryFeeBigInt, payoutWallet.trim())
    reset()
    onClose()
  }

  // Fee breakdown for Pro tier: 95% treasury, 5% burn
  const creationFee = tierInfo.creationFeeDisplay
  const treasuryAmount = creationFee * 95 / 100
  const burnAmount = creationFee * 5 / 100

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={step === 1 ? 'Choose Tier' : step === 2 ? 'Pod Details' : 'Confirm'}
      footer={
        <div className="flex w-full items-center justify-between">
          <div>
            {step > 1 && (
              <Button variant="ghost" onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}>
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleClose}>Cancel</Button>
            {step < 3 ? (
              <Button onClick={handleNext}>Next</Button>
            ) : (
              <Button onClick={handleCreate}>Create Pod</Button>
            )}
          </div>
        </div>
      }
    >
      {/* Step indicator */}
      <div className="mb-5 flex items-center justify-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
              s <= step ? 'bg-cyan-600 text-white' : 'bg-qx-elevated text-qx-text-muted'
            }`}>
              {s}
            </div>
            {s < 3 && <div className={`h-px w-8 ${s < step ? 'bg-cyan-600' : 'bg-qx-border-subtle'}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Choose Tier */}
      {step === 1 && (
        <div className="flex flex-col gap-4">
          <p className="text-xs text-qx-text-muted text-center">
            Your balance: <span className="text-qx-text-primary font-medium">{formatBalance(userBalance)} QF</span>
          </p>
          <div className="grid grid-cols-1 gap-3">
            {TIERS.map((t) => {
              const info = POD_TIER_INFO[t]
              const affordable = canAfford(t)
              const selected = tier === t
              return (
                <button
                  key={t}
                  disabled={!affordable}
                  onClick={() => { setTier(t); setError('') }}
                  className={`relative flex flex-col border p-4 text-left transition-[border-color,transform] duration-150 ${
                    !affordable
                      ? 'cursor-not-allowed border-gray-200 dark:border-gray-800 opacity-40'
                      : selected
                        ? 'border-cyan-600 bg-qx-active-bg'
                        : 'border-gray-200 dark:border-gray-800 hover:border-cyan-600 hover:-translate-y-0.5'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-bold ${TIER_LABEL_COLORS[t]}`}>
                      {info.name} {info.creationFeeDisplay > 0 ? `— ${info.creationFeeDisplay.toLocaleString()} QF` : '— Free'}
                    </span>
                    {selected && affordable && (
                      <div className="h-2.5 w-2.5 rounded-full bg-cyan-600" />
                    )}
                  </div>
                  <ul className="space-y-1">
                    {info.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-qx-text-secondary">
                        <span className="text-cyan-600">✓</span> {f}
                      </li>
                    ))}
                  </ul>
                  {!affordable && (
                    <p className="mt-2 text-xs text-red-400">Insufficient balance</p>
                  )}
                </button>
              )
            })}
          </div>
          {error && <p className="text-xs text-red-400 text-center">{error}</p>}
        </div>
      )}

      {/* Step 2: Pod Details */}
      {step === 2 && (
        <div className="flex flex-col gap-4">
          <Input
            label="Pod Name"
            placeholder="e.g. QF Whales"
            value={name}
            onChange={(e) => { setName(e.target.value); setError('') }}
            error={error && error.includes('name') ? error : undefined}
          />
          <Input
            label="Description"
            placeholder="What is this pod about?"
            value={description}
            onChange={(e) => { setDescription(e.target.value); setError('') }}
          />
          <Input
            label="Minimum Balance (QF)"
            placeholder="e.g. 1000"
            type="number"
            value={minBalance}
            onChange={(e) => { setMinBalance(e.target.value); setError('') }}
            error={error && error.includes('balance') ? error : undefined}
          />
          {tier === 'pro' && (
            <>
              <Input
                label="Entry Fee (QF)"
                placeholder="e.g. 100 (optional)"
                type="number"
                value={entryFee}
                onChange={(e) => { setEntryFee(e.target.value); setError('') }}
                error={error && error.includes('entry') ? error : undefined}
              />
              <p className="text-xs text-qx-text-muted -mt-2">
                One-time fee for members to join. 95% goes to your payout wallet, 5% to treasury.
              </p>
              <Input
                label="Payout Wallet (optional)"
                placeholder="0x... (defaults to your address)"
                value={payoutWallet}
                onChange={(e) => setPayoutWallet(e.target.value)}
              />
            </>
          )}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-qx-text-secondary">Public Pod</label>
            <button
              type="button"
              onClick={() => setIsPublic(!isPublic)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isPublic ? 'bg-cyan-600' : 'bg-qx-border-prominent'}`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${isPublic ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          <p className="text-xs text-qx-text-muted">
            {isPublic ? 'Anyone can discover and join this pod' : 'Only invited members can join'}
          </p>
          {error && !error.includes('name') && !error.includes('balance') && (
            <p className="text-xs text-red-400">{error}</p>
          )}
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === 3 && (
        <div className="flex flex-col gap-4">
          <div className="border border-gray-200 dark:border-gray-800 bg-transparent p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-qx-text-muted">Pod Name</span>
              <span className="text-qx-text-primary font-medium">{name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-qx-text-muted">Tier</span>
              <span className={`font-medium ${TIER_LABEL_COLORS[tier]}`}>{tierInfo.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-qx-text-muted">Min Balance</span>
              <span className="text-qx-text-primary">{minBalance || '0'} QF</span>
            </div>
            {tier === 'pro' && entryFee && (
              <div className="flex justify-between text-sm">
                <span className="text-qx-text-muted">Entry Fee</span>
                <span className="text-qx-text-primary">{entryFee} QF</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-qx-text-muted">Visibility</span>
              <span className="dark:text-qx-text-primary">{isPublic ? 'Public' : 'Private'}</span>
            </div>
          </div>

          {tier === 'pro' && creationFee > 0 && (
            <div className="border border-gray-200 dark:border-gray-800 bg-transparent p-4">
              <p className="text-sm font-medium text-qx-text-primary mb-3">Creation Fee Breakdown</p>
              <div className="space-y-2 font-mono text-sm">
                <div className="flex justify-between">
                  <span className="text-qx-text-muted">Total</span>
                  <span className="text-qx-text-primary font-bold">{creationFee.toLocaleString()} QF</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-qx-text-muted">├─ Treasury (95%)</span>
                  <span className="text-qx-text-secondary">{treasuryAmount.toLocaleString()} QF</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-qx-text-muted">└─ Burned (5%)</span>
                  <span className="text-orange-400">{burnAmount.toLocaleString()} QF</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

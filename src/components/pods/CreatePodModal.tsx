import React, { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import type { PodTier } from '@/types'
import { POD_TIER_INFO } from '@/types'
import type { CustomPod } from '@/types'
import { formatBalance } from '@/lib/utils'

interface CreatePodModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (name: string, description: string, minBalance: bigint, isPublic: boolean, tier: PodTier) => void | Promise<void>
  userBalance: bigint
}

const TIERS: PodTier[] = ['standard', 'premium', 'elite']

const TIER_COLORS: Record<PodTier, string> = {
  standard: 'border-qf-border-subtle hover:border-qf-text-secondary',
  premium: 'border-cyan-500/40 hover:border-cyan-400',
  elite: 'border-yellow-500/40 hover:border-yellow-400',
}

const TIER_SELECTED: Record<PodTier, string> = {
  standard: 'border-qf-accent bg-qf-accent/10',
  premium: 'border-cyan-400 bg-cyan-400/10',
  elite: 'border-yellow-400 bg-yellow-400/10',
}

const TIER_LABEL_COLORS: Record<PodTier, string> = {
  standard: 'text-qf-text-primary',
  premium: 'text-cyan-400',
  elite: 'text-yellow-400',
}

export const CreatePodModal: React.FC<CreatePodModalProps> = ({ isOpen, onClose, onCreate, userBalance }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [tier, setTier] = useState<PodTier>('standard')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [minBalance, setMinBalance] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [error, setError] = useState('')

  const reset = () => {
    setStep(1)
    setTier('standard')
    setName('')
    setDescription('')
    setMinBalance('')
    setIsPublic(true)
    setError('')
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const tierInfo = POD_TIER_INFO[tier]
  const canAfford = (t: PodTier) => userBalance >= POD_TIER_INFO[t].fee

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
      if (name.trim().length > 64) {
        setError('Pod name must be 64 characters or less')
        return
      }
      const bal = parseFloat(minBalance || '0')
      if (isNaN(bal) || bal < 0) {
        setError('Invalid minimum balance')
        return
      }
      setError('')
      setStep(3)
    }
  }

  const handleCreate = () => {
    const bal = parseFloat(minBalance || '0')
    const balanceBigInt = BigInt(Math.floor(bal * 1e18))
    onCreate(name.trim(), description.trim(), balanceBigInt, isPublic, tier)
    reset()
    onClose()
  }

  const treasuryAmount = tierInfo.feeDisplay * 25 / 100
  const burnAmount = tierInfo.feeDisplay * 75 / 100

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
              s <= step ? 'bg-qf-accent text-black' : 'bg-qf-elevated text-qf-text-muted'
            }`}>
              {s}
            </div>
            {s < 3 && <div className={`h-px w-8 ${s < step ? 'bg-qf-accent' : 'bg-qf-border-subtle'}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Choose Tier */}
      {step === 1 && (
        <div className="flex flex-col gap-4">
          <p className="text-xs text-qf-text-muted text-center">
            Your balance: <span className="text-qf-text-primary font-medium">{formatBalance(userBalance)} QF</span>
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
                      ? 'cursor-not-allowed border-qf-card-border opacity-40'
                      : selected
                        ? 'border-qf-accent bg-qf-active-bg'
                        : 'border-qf-card-border hover:border-qf-accent hover:-translate-y-0.5'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-bold ${TIER_LABEL_COLORS[t]}`}>
                      {info.name} — {info.feeDisplay.toLocaleString()} QF
                    </span>
                    {selected && affordable && (
                      <div className="h-2.5 w-2.5 rounded-full bg-qf-accent" />
                    )}
                  </div>
                  <ul className="space-y-1">
                    {info.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-qf-text-secondary">
                        <span className="dark:text-qf-accent text-qf-text-primary">✓</span> {f}
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
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-qf-text-secondary">Public Pod</label>
            <button
              type="button"
              onClick={() => setIsPublic(!isPublic)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isPublic ? 'bg-qf-accent' : 'bg-qf-border-prominent'}`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${isPublic ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          <p className="text-xs text-qf-text-muted">
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
          <div className="border border-qf-card-border bg-qf-card p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-qf-text-muted">Pod Name</span>
              <span className="text-qf-text-primary font-medium">{name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-qf-text-muted">Tier</span>
              <span className={`font-medium ${TIER_LABEL_COLORS[tier]}`}>{tierInfo.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-qf-text-muted">Min Balance</span>
              <span className="text-qf-text-primary">{minBalance || '0'} QF</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-qf-text-muted">Visibility</span>
              <span className="dark:text-qf-text-primary">{isPublic ? 'Public' : 'Private'}</span>
            </div>
          </div>

          <div className="border border-qf-card-border bg-qf-card p-4">
            <p className="text-sm font-medium text-qf-text-primary mb-3">Fee Breakdown</p>
            <div className="space-y-2 font-mono text-sm">
              <div className="flex justify-between">
                <span className="text-qf-text-muted">Total</span>
                <span className="text-qf-text-primary font-bold">{tierInfo.feeDisplay.toLocaleString()} QF</span>
              </div>
              <div className="flex justify-between">
                <span className="text-qf-text-muted">├─ Treasury (25%)</span>
                <span className="text-qf-text-secondary">{treasuryAmount.toLocaleString()} QF</span>
              </div>
              <div className="flex justify-between">
                <span className="text-qf-text-muted">└─ Burned (75%)</span>
                <span className="text-orange-400">{burnAmount.toLocaleString()} QF</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

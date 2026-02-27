import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '@/hooks/useWallet'
import { usePods } from '@/hooks/usePods'
import { useUIStore } from '@/stores/ui'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { formatBalance } from '@/lib/utils'
import { POD_TIER_INFO, POD_CATEGORIES, LIMITS } from '@/types'
import type { PodTier, JoinMethod, PodCategory } from '@/types'

const TIERS: PodTier[] = ['standard', 'premium', 'elite']

const CreatePodPage: React.FC = () => {
  const navigate = useNavigate()
  const { balance, isConnected } = useWallet()
  const { createPod } = usePods()
  const setShowConnectWallet = useUIStore((s) => s.setShowConnectWallet)

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [tier, setTier] = useState<PodTier>('standard')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<PodCategory>('trading')
  const [joinMethod, setJoinMethod] = useState<JoinMethod>('balance')
  const [minBalance, setMinBalance] = useState('')
  const [error, setError] = useState('')

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-3.5rem)] text-center px-6">
        <h2 className="text-xl font-semibold text-qf-text-primary mb-4">Create a Pod</h2>
        <p className="text-sm text-qf-text-muted mb-6">Connect your wallet to create a pod</p>
        <Button onClick={() => setShowConnectWallet(true)}>Connect Wallet</Button>
      </div>
    )
  }

  const tierInfo = POD_TIER_INFO[tier]
  const canAfford = (t: PodTier) => balance >= POD_TIER_INFO[t].fee

  const handleNext = () => {
    if (step === 1) {
      if (!canAfford(tier)) { setError('Insufficient balance for this tier'); return }
      setError('')
      setStep(2)
    } else if (step === 2) {
      if (name.trim().length < LIMITS.MIN_POD_NAME_LENGTH) { setError(`Pod name must be at least ${LIMITS.MIN_POD_NAME_LENGTH} characters`); return }
      if (name.trim().length > LIMITS.MAX_POD_NAME_LENGTH) { setError(`Pod name must be at most ${LIMITS.MAX_POD_NAME_LENGTH} characters`); return }
      if (description.trim().length < LIMITS.MIN_POD_DESCRIPTION_LENGTH) { setError(`Description must be at least ${LIMITS.MIN_POD_DESCRIPTION_LENGTH} characters`); return }
      if (description.trim().length > LIMITS.MAX_POD_DESCRIPTION_LENGTH) { setError(`Description must be at most ${LIMITS.MAX_POD_DESCRIPTION_LENGTH} characters`); return }
      if (joinMethod === 'balance') {
        const bal = parseFloat(minBalance || '0')
        if (isNaN(bal) || bal < 0) { setError('Invalid minimum balance'); return }
      }
      setError('')
      setStep(3)
    }
  }

  const handleCreate = async () => {
    const bal = parseFloat(minBalance || '0')
    const balanceBigInt = BigInt(Math.floor(bal * 1e18))
    const pod = await createPod(name.trim(), description.trim(), balanceBigInt, true, tier)
    if (pod) {
      navigate(`/pods/${pod.id}`)
    } else {
      navigate('/explore')
    }
  }

  const treasuryAmount = tierInfo.feeDisplay * 25 / 100
  const burnAmount = tierInfo.feeDisplay * 75 / 100

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-qf-text-primary">Create a Pod</h1>
      <p className="text-sm text-qf-text-secondary">
        Step {step} of 3: {step === 1 ? 'Choose Your Plan' : step === 2 ? 'Pod Details' : 'Confirm & Pay'}
      </p>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
              s <= step ? 'bg-qf-accent text-qf-accent-text' : 'bg-qf-elevated text-qf-text-muted'
            }`}>
              {s}
            </div>
            {s < 3 && <div className={`h-px w-10 ${s < step ? 'bg-qf-accent' : 'bg-qf-border-subtle'}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Choose Tier */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-xs text-qf-text-muted text-center">
            Your balance: <span className="text-qf-text-primary font-medium">{formatBalance(balance)} QF</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {TIERS.map((t) => {
              const info = POD_TIER_INFO[t]
              const affordable = canAfford(t)
              const selected = tier === t
              return (
                <button
                  key={t}
                  disabled={!affordable}
                  onClick={() => { setTier(t); setError('') }}
                  className={`flex flex-col border p-5 text-left transition-[border-color,transform] duration-150 ${
                    !affordable
                      ? 'cursor-not-allowed border-qf-card-border opacity-40'
                      : selected
                        ? 'border-qf-accent bg-qf-active-bg'
                        : 'border-qf-card-border hover:border-qf-accent hover:-translate-y-0.5'
                  }`}
                >
                  <span className="text-base font-bold text-qf-text-primary">{info.name}</span>
                  <span className="text-2xl font-bold dark:text-qf-accent text-qf-text-primary mt-2">{info.feeDisplay.toLocaleString()} QF</span>
                  <ul className="mt-4 space-y-1.5">
                    {info.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-qf-text-secondary">
                        <span className="dark:text-qf-accent text-qf-text-primary mt-0.5">✓</span> {f}
                      </li>
                    ))}
                  </ul>
                  {!affordable && <p className="mt-3 text-xs text-qf-error">Insufficient balance</p>}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Step 2: Pod Details */}
      {step === 2 && (
        <div className="space-y-4">
          <Input
            label="Pod Name"
            placeholder="e.g. QF Whales"
            value={name}
            onChange={(e) => { setName(e.target.value); setError('') }}
          />
          <Textarea
            label="Description"
            placeholder="What is this pod about?"
            value={description}
            onChange={(e) => { setDescription(e.target.value); setError('') }}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-qf-text-secondary">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as PodCategory)}
              className="h-10 w-full rounded-lg border border-qf-border-prominent bg-qf-card px-3 text-sm text-qf-text-primary focus:border-qf-accent focus:outline-none focus:ring-1 focus:ring-qf-accent"
            >
              {POD_CATEGORIES.map((c) => (
                <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-qf-text-secondary">Join Method</label>
            <div className="flex gap-3">
              <label className={`flex-1 flex items-center gap-2 border p-3 cursor-pointer transition-[border-color] duration-150 ${joinMethod === 'balance' ? 'border-qf-accent bg-qf-active-bg' : 'border-qf-card-border hover:border-qf-accent'}`}>
                <input type="radio" name="joinMethod" checked={joinMethod === 'balance'} onChange={() => setJoinMethod('balance')} className="accent-[#00FFFF]" />
                <div>
                  <p className="text-sm font-medium text-qf-text-primary">Balance-Based</p>
                  <p className="text-xs text-qf-text-muted">Require token holdings</p>
                </div>
              </label>
              <label className={`flex-1 flex items-center gap-2 border p-3 cursor-not-allowed opacity-50 ${joinMethod === 'invite' ? 'border-qf-accent bg-qf-active-bg' : 'border-qf-card-border'}`}>
                <input type="radio" name="joinMethod" checked={joinMethod === 'invite'} disabled className="accent-[#00FFFF]" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-qf-text-primary">Invite-Only</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-qf-elevated text-qf-text-muted">Coming Soon</span>
                  </div>
                  <p className="text-xs text-qf-text-muted">Generate invite links</p>
                </div>
              </label>
            </div>
          </div>
          {joinMethod === 'balance' && (
            <Input
              label="Minimum Balance (QF)"
              placeholder="e.g. 10000"
              type="number"
              value={minBalance}
              onChange={(e) => { setMinBalance(e.target.value); setError('') }}
            />
          )}
        </div>
      )}

      {/* Step 3: Confirm & Pay */}
      {step === 3 && (
        <div className="space-y-4">
          <Card>
            <h3 className="text-sm font-semibold text-qf-text-primary mb-3">Pod Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-qf-text-muted">Name</span><span className="text-qf-text-primary font-medium">{name}</span></div>
              <div className="flex justify-between"><span className="text-qf-text-muted">Tier</span><span className="text-qf-accent font-medium">{tierInfo.name}</span></div>
              <div className="flex justify-between"><span className="text-qf-text-muted">Max Members</span><span className="text-qf-text-primary">{tierInfo.maxMembers === Infinity ? 'Unlimited' : tierInfo.maxMembers}</span></div>
              <div className="flex justify-between"><span className="text-qf-text-muted">Join Method</span><span className="text-qf-text-primary capitalize">{joinMethod === 'balance' ? 'Balance-Based' : 'Invite-Only'}</span></div>
              {joinMethod === 'balance' && (
                <div className="flex justify-between"><span className="text-qf-text-muted">Requirement</span><span className="text-qf-text-primary">{minBalance || '0'} QF</span></div>
              )}
              <div className="flex justify-between"><span className="text-qf-text-muted">Category</span><span className="text-qf-text-primary capitalize">{category}</span></div>
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-qf-text-primary mb-3">Fee Breakdown</h3>
            <div className="space-y-2 text-sm font-mono">
              <div className="flex justify-between">
                <span className="text-qf-text-muted">Creation Fee</span>
                <span className="text-qf-text-primary font-bold">{tierInfo.feeDisplay.toLocaleString()} QF</span>
              </div>
              <div className="flex justify-between">
                <span className="text-qf-text-muted">→ Treasury (25%)</span>
                <span className="text-qf-text-secondary">{treasuryAmount.toLocaleString()} QF</span>
              </div>
              <div className="flex justify-between">
                <span className="text-qf-text-muted">→ Burned (75%)</span>
                <span className="text-orange-400">{burnAmount.toLocaleString()} QF</span>
              </div>
              <div className="border-t border-qf-border-subtle pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-qf-text-muted">Your Balance</span>
                  <span className="text-qf-text-primary">{formatBalance(balance)} QF</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {error && <p className="text-sm text-qf-error text-center">{error}</p>}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between pt-2">
        <div>
          {step > 1 && (
            <Button variant="ghost" onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}>Back</Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate('/explore')}>Cancel</Button>
          {step < 3 ? (
            <Button onClick={handleNext}>Continue</Button>
          ) : (
            <Button onClick={handleCreate}>Create Pod</Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default CreatePodPage

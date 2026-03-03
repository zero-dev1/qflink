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
import type { PodTier, PodCategory } from '@/types'

const TIERS: PodTier[] = ['free', 'pro']

const CreatePodPage: React.FC = () => {
  const navigate = useNavigate()
  const { balance, isConnected } = useWallet()
  const { createPod } = usePods()
  const setShowConnectWallet = useUIStore((s) => s.setShowConnectWallet)

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [tier, setTier] = useState<PodTier>('free')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<PodCategory>('trading')
  const [minBalance, setMinBalance] = useState('')
  const [entryFee, setEntryFee] = useState('')
  const [payoutWallet, setPayoutWallet] = useState('')
  const [error, setError] = useState('')

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-3.5rem)] text-center px-6">
        <h2 className="font-display text-xl font-semibold text-qx-text-primary mb-4">Create a Pod</h2>
        <p className="text-sm text-qx-text-muted mb-6">Connect your wallet to create a pod</p>
        <Button onClick={() => setShowConnectWallet(true)}>Connect Wallet</Button>
      </div>
    )
  }

  const tierInfo = POD_TIER_INFO[tier]
  const canAfford = (t: PodTier) => balance >= POD_TIER_INFO[t].creationFee

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
      const bal = parseFloat(minBalance || '0')
      if (isNaN(bal) || bal < 0) { setError('Invalid minimum balance'); return }
      // Free pods cannot have entry fees
      if (tier === 'free' && entryFee && parseFloat(entryFee) > 0) {
        setError('Free pods cannot charge entry fees. Upgrade to Pro.')
        return
      }
      setError('')
      setStep(3)
    }
  }

  const handleCreate = async () => {
    const bal = parseFloat(minBalance || '0')
    const balanceBigInt = BigInt(Math.floor(bal * 1e18))
    const entryFeeBal = parseFloat(entryFee || '0')
    const entryFeeBigInt = BigInt(Math.floor(entryFeeBal * 1e18))
    const pod = await createPod(name.trim(), description.trim(), balanceBigInt, true, tier, entryFeeBigInt, payoutWallet.trim())
    if (pod) {
      navigate(`/pods/${pod.id}`)
    } else {
      navigate('/explore')
    }
  }

  // Fee breakdown for Pro tier: 95% treasury, 5% burn
  const creationFee = tierInfo.creationFeeDisplay
  const treasuryAmount = creationFee * 95 / 100
  const burnAmount = creationFee * 5 / 100

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
      <h1 className="font-display text-2xl font-semibold text-qx-text-primary">Create a Pod</h1>
      <p className="text-sm text-qx-text-secondary">
        Step {step} of 3: {step === 1 ? 'Choose Your Plan' : step === 2 ? 'Pod Details' : 'Confirm & Pay'}
      </p>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
              s <= step ? 'bg-cyan-600 text-white' : 'bg-qx-elevated text-qx-text-muted'
            }`}>
              {s}
            </div>
            {s < 3 && <div className={`h-px w-10 ${s < step ? 'bg-cyan-600' : 'bg-qx-border-subtle'}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Choose Tier */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-xs text-qx-text-muted text-center">
            Your balance: <span className="text-qx-text-primary font-medium">{formatBalance(balance)} QF</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {TIERS.map((t) => {
              const info = POD_TIER_INFO[t]
              const affordable = canAfford(t)
              const selected = tier === t
              return (
                <button
                  key={t}
                  disabled={!affordable}
                  onClick={() => { setTier(t); setError('') }}
                  className={`relative flex flex-col border p-5 text-left transition-[border-color,transform] duration-150 ${
                    !affordable
                      ? 'cursor-not-allowed border-gray-200 dark:border-gray-800 opacity-40 bg-white dark:bg-[#0a0a0a]'
                      : selected
                        ? 'border-cyan-600 bg-cyan-600'
                        : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0a0a0a] hover:border-cyan-600 hover:-translate-y-0.5'
                  }`}
                >
                  {/* Checkbox for selected card */}
                  {selected && (
                    <div className="absolute top-5 right-5 w-6 h-6 border-2 border-white bg-white flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-600">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  )}
                  
                  <span className={`text-base font-bold ${selected ? 'text-white' : 'text-gray-900 dark:text-gray-400'}`}>{info.name}</span>
                  <span className={`text-2xl font-bold mt-2 ${selected ? 'text-white' : 'text-cyan-600'}`}>
                    {info.creationFeeDisplay > 0 ? `${info.creationFeeDisplay.toLocaleString()} QF` : 'Free'}
                  </span>
                  <ul className="mt-4 space-y-1.5">
                    {info.features.map((f, i) => (
                      <li key={i} className={`flex items-start gap-2 text-xs ${selected ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                        <span className={selected ? 'text-white mt-0.5' : 'text-cyan-600 mt-0.5'}>✓</span> {f}
                      </li>
                    ))}
                  </ul>
                  {!affordable && <p className="mt-3 text-xs text-qx-error">Insufficient balance</p>}
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
            <label className="text-sm font-medium text-qx-text-secondary">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as PodCategory)}
              className="h-10 w-full border border-gray-200 dark:border-gray-800 bg-transparent px-3 text-sm text-qx-text-primary focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600"
            >
              {POD_CATEGORIES.map((c) => (
                <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>
          <Input
            label="Minimum Balance (QF)"
            placeholder="e.g. 10000 (0 for no requirement)"
            type="number"
            value={minBalance}
            onChange={(e) => { setMinBalance(e.target.value); setError('') }}
          />
          {tier === 'pro' && (
            <>
              <Input
                label="Entry Fee (QF)"
                placeholder="e.g. 100 (optional, for paid pods)"
                type="number"
                value={entryFee}
                onChange={(e) => { setEntryFee(e.target.value); setError('') }}
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
        </div>
      )}

      {/* Step 3: Confirm & Pay */}
      {step === 3 && (
        <div className="space-y-4">
          <Card>
            <h3 className="text-sm font-semibold text-qx-text-primary mb-3">Pod Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-qx-text-muted">Name</span><span className="text-qx-text-primary font-medium">{name}</span></div>
              <div className="flex justify-between"><span className="text-qx-text-muted">Tier</span><span className="text-cyan-600 font-medium">{tierInfo.name}</span></div>
              <div className="flex justify-between"><span className="text-qx-text-muted">Max Members</span><span className="text-qx-text-primary">{tierInfo.maxMembers === Infinity ? 'Unlimited' : tierInfo.maxMembers}</span></div>
              <div className="flex justify-between"><span className="text-qx-text-muted">Max Moderators</span><span className="text-qx-text-primary">{tierInfo.maxMods}</span></div>
              <div className="flex justify-between"><span className="text-qx-text-muted">Min Balance</span><span className="text-qx-text-primary">{minBalance || '0'} QF</span></div>
              {tier === 'pro' && entryFee && (
                <div className="flex justify-between"><span className="text-qx-text-muted">Entry Fee</span><span className="text-qx-text-primary">{entryFee} QF</span></div>
              )}
              <div className="flex justify-between"><span className="text-qx-text-muted">Category</span><span className="text-qx-text-primary capitalize">{category}</span></div>
            </div>
          </Card>

          {tier === 'pro' && creationFee > 0 && (
            <Card>
              <h3 className="text-sm font-semibold text-qx-text-primary mb-3">Creation Fee Breakdown</h3>
              <div className="space-y-2 text-sm font-mono">
                <div className="flex justify-between">
                  <span className="text-qx-text-muted">Creation Fee</span>
                  <span className="text-qx-text-primary font-bold">{creationFee.toLocaleString()} QF</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-qx-text-muted">→ Treasury (95%)</span>
                  <span className="text-qx-text-secondary">{treasuryAmount.toLocaleString()} QF</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-qx-text-muted">→ Burned (5%)</span>
                  <span className="text-orange-400">{burnAmount.toLocaleString()} QF</span>
                </div>
                <div className="border-t border-qx-border-subtle pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-qx-text-muted">Your Balance</span>
                    <span className="text-qx-text-primary">{formatBalance(balance)} QF</span>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {error && <p className="text-sm text-qx-error text-center">{error}</p>}

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

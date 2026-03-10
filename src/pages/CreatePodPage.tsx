import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '@/hooks/useWallet'
import { usePods } from '@/hooks/usePods'
import { usePodsStore } from '@/stores/pods'
import { useUIStore } from '@/stores/ui'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { formatBalance } from '@/lib/utils'
import { POD_CATEGORIES, LIMITS } from '@/types'
import type { PodCategory } from '@/types'

const CreatePodPage: React.FC = () => {
  const navigate = useNavigate()
  const { balance, isConnected } = useWallet()
  const { createPod } = usePods()
  const fetchPods = usePodsStore((s) => s.fetchPods)
  const setShowConnectWallet = useUIStore((s) => s.setShowConnectWallet)

  const [step, setStep] = useState<1 | 2>(1)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<PodCategory>('trading')
  const [minBalance, setMinBalance] = useState('')
  const [entryFee, setEntryFee] = useState('')
  const [payoutWallet, setPayoutWallet] = useState('')
  const [error, setError] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  // Creation fee constants
  const CREATION_FEE = 500 // QF
  const TREASURY_AMOUNT = 475 // 95%
  const BURN_AMOUNT = 25 // 5%

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-3.5rem)] text-center px-6">
        <h2 className="font-display text-xl font-semibold text-qx-text-primary mb-4">Create a Pod</h2>
        <p className="text-sm text-qx-text-muted mb-6">Connect your wallet to create a pod</p>
        <Button onClick={() => setShowConnectWallet(true)}>Connect Wallet</Button>
      </div>
    )
  }

  const canAfford = balance >= BigInt(CREATION_FEE) * BigInt(1e18)

  const handleNext = () => {
    if (!canAfford) {
      setError(`Insufficient balance. You need ${CREATION_FEE} QF to create a pod.`)
      return
    }
    if (name.trim().length < LIMITS.MIN_POD_NAME_LENGTH) {
      setError(`Pod name must be at least ${LIMITS.MIN_POD_NAME_LENGTH} characters`)
      return
    }
    if (name.trim().length > LIMITS.MAX_POD_NAME_LENGTH) {
      setError(`Pod name must be at most ${LIMITS.MAX_POD_NAME_LENGTH} characters`)
      return
    }
    if (description.trim().length < LIMITS.MIN_POD_DESCRIPTION_LENGTH) {
      setError(`Description must be at least ${LIMITS.MIN_POD_DESCRIPTION_LENGTH} characters`)
      return
    }
    if (description.trim().length > LIMITS.MAX_POD_DESCRIPTION_LENGTH) {
      setError(`Description must be at most ${LIMITS.MAX_POD_DESCRIPTION_LENGTH} characters`)
      return
    }
    const bal = parseFloat(minBalance || '0')
    if (isNaN(bal) || bal < 0) {
      setError('Invalid minimum balance')
      return
    }
    setError('')
    setStep(2)
  }

  const handleCreate = async () => {
    if (isCreating) return
    setIsCreating(true)
    try {
      const bal = parseFloat(minBalance || '0')
      const balanceBigInt = BigInt(Math.floor(bal * 1e18))
      const entryFeeBal = parseFloat(entryFee || '0')
      const entryFeeBigInt = BigInt(Math.floor(entryFeeBal * 1e18))
      // Get the current name value at call time to avoid stale closure
      const currentName = name.trim()
      await createPod(currentName, description.trim(), balanceBigInt, true, entryFeeBigInt, payoutWallet.trim(), category)
      // fetchPods is called inside createPod hook, navigate to explore
      navigate('/explore')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
      <h1 className="font-display text-2xl font-semibold text-qx-text-primary">Create a Pod</h1>
      <p className="text-sm text-qx-text-secondary">
        Step {step} of 2: {step === 1 ? 'Pod Details' : 'Confirm & Pay'}
      </p>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
              s <= step ? 'bg-cyan-600 text-white' : 'bg-qx-elevated text-qx-text-muted'
            }`}>
              {s}
            </div>
            {s < 2 && <div className={`h-px w-10 ${s < step ? 'bg-cyan-600' : 'bg-qx-border-subtle'}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Pod Details */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-xs text-qx-text-muted text-center">
            Your balance: <span className="text-qx-text-primary font-medium">{formatBalance(balance)} QF</span>
            <span className="mx-2">|</span>
            Creation fee: <span className="text-cyan-600 font-medium">{CREATION_FEE} QF</span>
          </p>

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
            maxLength={200}
            onChange={(e) => { setDescription(e.target.value); setError('') }}
          />
          {description.length >= 180 && (
            <p className={`text-xs ${description.length >= 200 ? 'text-qx-error' : 'text-qx-text-muted'}`}>
              {description.length}/200
            </p>
          )}
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
          <Input
            label="Entry Fee (QF)"
            placeholder="e.g. 100 (optional, 0 for free to join)"
            type="number"
            value={entryFee}
            onChange={(e) => { setEntryFee(e.target.value); setError('') }}
            onWheel={(e) => (e.target as HTMLInputElement).blur()}
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

          {/* Features */}
          <div className="border border-gray-200 dark:border-gray-800 p-4 mt-4">
            <h3 className="text-sm font-semibold text-qx-text-primary mb-2">All pods include:</h3>
            <ul className="space-y-1 text-xs text-qx-text-secondary">
              <li className="flex items-center gap-2"><span className="text-cyan-600">✓</span> Unlimited members</li>
              <li className="flex items-center gap-2"><span className="text-cyan-600">✓</span> Up to 3 moderators</li>
              <li className="flex items-center gap-2"><span className="text-cyan-600">✓</span> Optional entry fees</li>
              <li className="flex items-center gap-2"><span className="text-cyan-600">✓</span> Balance-based access control</li>
            </ul>
          </div>
        </div>
      )}

      {/* Step 2: Confirm & Pay */}
      {step === 2 && (
        <div className="space-y-4">
          <Card>
            <h3 className="text-sm font-semibold text-qx-text-primary mb-3">Pod Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-qx-text-muted">Name</span><span className="text-qx-text-primary font-medium">{name}</span></div>
              <div className="flex justify-between"><span className="text-qx-text-muted">Max Members</span><span className="text-qx-text-primary">Unlimited</span></div>
              <div className="flex justify-between"><span className="text-qx-text-muted">Max Moderators</span><span className="text-qx-text-primary">3</span></div>
              <div className="flex justify-between"><span className="text-qx-text-muted">Min Balance</span><span className="text-qx-text-primary">{minBalance || '0'} QF</span></div>
              {entryFee && parseFloat(entryFee) > 0 && (
                <div className="flex justify-between"><span className="text-qx-text-muted">Entry Fee</span><span className="text-qx-text-primary">{entryFee} QF</span></div>
              )}
              <div className="flex justify-between"><span className="text-qx-text-muted">Category</span><span className="text-qx-text-primary capitalize">{category}</span></div>
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-qx-text-primary mb-3">Creation Fee Breakdown</h3>
            <div className="space-y-2 text-sm font-mono">
              <div className="flex justify-between">
                <span className="text-qx-text-muted">Creation Fee</span>
                <span className="text-qx-text-primary font-bold">{CREATION_FEE.toLocaleString()} QF</span>
              </div>
              <div className="flex justify-between">
                <span className="text-qx-text-muted">→ Treasury (95%)</span>
                <span className="text-qx-text-secondary">{TREASURY_AMOUNT.toLocaleString()} QF</span>
              </div>
              <div className="flex justify-between">
                <span className="text-qx-text-muted">→ Burned (5%)</span>
                <span className="text-orange-400">{BURN_AMOUNT.toLocaleString()} QF</span>
              </div>
              <div className="border-t border-qx-border-subtle pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-qx-text-muted">Your Balance</span>
                  <span className="text-qx-text-primary">{formatBalance(balance)} QF</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {error && <p className="text-sm text-qx-error text-center">{error}</p>}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between pt-2">
        <div>
          {step > 1 && (
            <Button variant="ghost" onClick={() => setStep((s) => (s - 1) as 1 | 2)}>Back</Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate('/explore')}>Cancel</Button>
          {step < 2 ? (
            <Button onClick={handleNext}>Continue</Button>
          ) : (
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? 'Creating...' : `Pay ${CREATION_FEE} QF & Create`}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default CreatePodPage

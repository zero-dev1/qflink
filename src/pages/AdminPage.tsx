import React, { useState, useEffect, useCallback } from 'react'
import { useWallet } from '@/hooks/useWallet'
import { useUIStore } from '@/stores/ui'
import { Spinner } from '@/components/ui/Spinner'
import * as cc from '@/lib/contractCalls'
import { resolveQFName, normalizeQFName } from '@/lib/qns'
import { CONTRACT_ADDRESSES } from '@/lib/contracts'
import { formatExactAmount } from '@/lib/utils'
import { parseEther } from 'viem'

// Owner address from environment (used as fallback while loading)
const OWNER_ADDRESS = (import.meta.env.VITE_OWNER_ADDRESS || '').toLowerCase()
const PAYMENTS_ADDRESS = CONTRACT_ADDRESSES.payments as `0x${string}`

// Contract list for display
const CONTRACTS_LIST = [
  { name: 'Registry', key: 'registry' as const },
  { name: 'Pods Storage', key: 'podsStorage' as const },
  { name: 'Pods Create', key: 'podsCreate' as const },
  { name: 'Pods Create Paid', key: 'podsCreatePaid' as const },
  { name: 'Pods Join', key: 'podsJoin' as const },
  { name: 'Pods Leave', key: 'podsLeave' as const },
  { name: 'Pods Ban', key: 'podsBan' as const },
  { name: 'Pods AddMod', key: 'podsAddMod' as const },
  { name: 'Pods RemoveMod', key: 'podsRemoveMod' as const },
  { name: 'Pods Admin', key: 'podsAdmin' as const },
  { name: 'Pods Reader', key: 'podsReader' as const },
  { name: 'Pods GetPod', key: 'podsGetPod' as const },
  { name: 'Payments', key: 'payments' as const },
  { name: 'Content Store', key: 'contentStore' as const },
  { name: 'Message Index', key: 'messageIndex' as const },
  { name: 'Message Writer', key: 'messageWriter' as const },
  { name: 'Message Reader', key: 'messageReader' as const },
]

// Helper to resolve QNS name or address to address
const resolveToAddress = async (input: string): Promise<`0x${string}` | null> => {
  // Already a valid address
  const trimmed = input.trim()
  if (trimmed.startsWith('0x') && trimmed.length === 42) {
    return trimmed as `0x${string}`
  }
  
  // Use shared helper to normalize QF name (auto-append .qf if needed)
  const normalized = normalizeQFName(trimmed)
  if (!normalized) return null // Input was a raw address but invalid format
  
  try {
    const resolved = await resolveQFName(normalized)
    if (resolved && resolved !== '0x0000000000000000000000000000000000000000') {
      return resolved as `0x${string}`
    }
  } catch (e) {
    console.error('[resolveToAddress] QNS lookup failed:', e)
  }
  
  return null
}

// Stat Card Component
const StatCard: React.FC<{
  label: string
  value: string
  accent?: boolean
  icon: React.ReactNode
  loading?: boolean
}> = ({ label, value, accent, icon, loading }) => (
  <div className="border border-gray-800 bg-transparent p-5 transition-colors hover:border-gray-700">
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">{label}</span>
      <span className="text-gray-600">{icon}</span>
    </div>
    {loading ? (
      <div className="animate-pulse bg-gray-800 h-8 w-24" />
    ) : (
      <p className={`text-2xl font-bold ${accent ? 'text-[#0991B2]' : 'text-white'}`}>{value}</p>
    )}
  </div>
)

// Copy button component
const CopyButton: React.FC<{ text: string; label?: string }> = ({ text, label }) => {
  const [copied, setCopied] = useState(false)
  
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  return (
    <button
      onClick={handleCopy}
      className="text-xs text-gray-500 hover:text-[#0991B2] transition-colors"
      title={label || 'Copy'}
    >
      {copied ? (
        <span className="text-green-500">Copied!</span>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  )
}

// Address display with copy button
const AddressDisplay: React.FC<{ address: string | null; truncate?: boolean }> = ({ address, truncate = false }) => {
  if (!address) return <span className="text-gray-500">—</span>
  
  const display = truncate && address.length > 20
    ? `${address.slice(0, 10)}...${address.slice(-8)}`
    : address
    
  return (
    <div className="flex items-center gap-2">
      <code className="text-sm font-mono text-gray-300" title={address}>
        {display}
      </code>
      <CopyButton text={address} />
    </div>
  )
}

const AdminPage: React.FC = () => {
  const { isConnected, evmAddress } = useWallet()
  const setShowConnectWallet = useUIStore((s) => s.setShowConnectWallet)
  const addToast = useUIStore((s) => s.addToast)
  
  // Contract owner state (fetched live from chain)
  const [contractOwner, setContractOwner] = useState<string | null>(null)
  
  // Fetch owner from contract
  useEffect(() => {
    async function fetchOwner() {
      try {
        const owner = await cc.getPaymentsOwner()
        setContractOwner(owner)
      } catch (err) {
        console.error('[AdminPage] Failed to fetch contract owner:', err)
      }
    }
    fetchOwner()
  }, [])
  
  // Auth check - use live contract owner with env fallback while loading
  const isOwner = evmAddress?.toLowerCase() === (contractOwner?.toLowerCase() || OWNER_ADDRESS)
  
  // Data states
  const [currentTreasury, setCurrentTreasury] = useState<string | null>(null)
  const [currentOwner, setCurrentOwner] = useState<string | null>(null)
  const [podCount, setPodCount] = useState<number>(0)
  const [treasuryBalance, setTreasuryBalance] = useState<bigint>(0n)
  const [paymentsBalance, setPaymentsBalance] = useState<bigint>(0n)
  const [loading, setLoading] = useState(true)
  
  // Economics states
  const [platformFeePct, setPlatformFeePct] = useState<number>(0)
  const [podsCreateFee, setPodsCreateFee] = useState<bigint>(0n)
  const [podsCreateTreasuryShare, setPodsCreateTreasuryShare] = useState<bigint>(0n)
  const [podsCreateBurnShare, setPodsCreateBurnShare] = useState<bigint>(0n)
  const [podsCreateBurnAddress, setPodsCreateBurnAddress] = useState<string>('')
  const [podsCreatePaidFee, setPodsCreatePaidFee] = useState<bigint>(0n)
  const [podsCreatePaidTreasuryShare, setPodsCreatePaidTreasuryShare] = useState<bigint>(0n)
  const [podsCreatePaidBurnShare, setPodsCreatePaidBurnShare] = useState<bigint>(0n)
  const [podsCreatePaidBurnAddress, setPodsCreatePaidBurnAddress] = useState<string>('')
  
  // Form states for economics
  const [newPaymentsSplit, setNewPaymentsSplit] = useState({ creatorShare: '', treasuryShare: '' })
  const [newPodsCreateFee, setNewPodsCreateFee] = useState('')
  const [newPodsCreateSplit, setNewPodsCreateSplit] = useState({ treasuryShare: '', burnShare: '' })
  const [newPodsCreateBurnAddress, setNewPodsCreateBurnAddress] = useState('')
  const [newPodsCreatePaidFee, setNewPodsCreatePaidFee] = useState('')
  const [newPodsCreatePaidSplit, setNewPodsCreatePaidSplit] = useState({ treasuryShare: '', burnShare: '' })
  const [newPodsCreatePaidBurnAddress, setNewPodsCreatePaidBurnAddress] = useState('')
  
  // Loading states
  const [updatingPaymentsSplit, setUpdatingPaymentsSplit] = useState(false)
  const [updatingPodsCreateFee, setUpdatingPodsCreateFee] = useState(false)
  const [updatingPodsCreateSplit, setUpdatingPodsCreateSplit] = useState(false)
  const [updatingPodsCreateBurnAddress, setUpdatingPodsCreateBurnAddress] = useState(false)
  const [updatingPodsCreatePaidFee, setUpdatingPodsCreatePaidFee] = useState(false)
  const [updatingPodsCreatePaidSplit, setUpdatingPodsCreatePaidSplit] = useState(false)
  const [updatingPodsCreatePaidBurnAddress, setUpdatingPodsCreatePaidBurnAddress] = useState(false)
  
  // Form states
  const [newTreasuryInput, setNewTreasuryInput] = useState('')
  const [newOwnerInput, setNewOwnerInput] = useState('')
  const [updatingTreasury, setUpdatingTreasury] = useState(false)
  const [transferringOwnership, setTransferringOwnership] = useState(false)
  const [withdrawingPayments, setWithdrawingPayments] = useState(false)
  const [withdrawingToTreasury, setWithdrawingToTreasury] = useState(false)
  
  // Fetch all admin data
  const fetchData = useCallback(async () => {
    if (!isConnected || !isOwner) return
    
    setLoading(true)
    try {
      const [
        treasury, 
        owner, 
        pods, 
        payBalance,
        paymentsTreasuryShare,
        podsCreateData,
        podsCreatePaidData
      ] = await Promise.all([
        cc.getPaymentsTreasury(),
        cc.getPaymentsOwner(),
        cc.getPodCount(),
        cc.getPaymentsBalance(),
        cc.getPaymentsTreasuryShare(),
        Promise.all([
          cc.getPodsCreateCreationFee(),
          cc.getPodsCreateTreasuryShare(),
          cc.getPodsCreateBurnShare(),
          cc.getPodsCreateBurnAddress()
        ]),
        Promise.all([
          cc.getPodsCreatePaidCreationFee(),
          cc.getPodsCreatePaidTreasuryShare(),
          cc.getPodsCreatePaidBurnShare(),
          cc.getPodsCreatePaidBurnAddress()
        ])
      ])
      
      setCurrentTreasury(treasury)
      setCurrentOwner(owner)
      setPodCount(pods)
      setPaymentsBalance(payBalance)
      
      // Calculate platform fee percentage from treasury share (raw value IS the percentage)
      setPlatformFeePct(Number(paymentsTreasuryShare))
      
      // Set PodsCreate economics
      setPodsCreateFee(podsCreateData[0])
      setPodsCreateTreasuryShare(podsCreateData[1])
      setPodsCreateBurnShare(podsCreateData[2])
      setPodsCreateBurnAddress(podsCreateData[3])
      
      // Set PodsCreatePaid economics
      setPodsCreatePaidFee(podsCreatePaidData[0])
      setPodsCreatePaidTreasuryShare(podsCreatePaidData[1])
      setPodsCreatePaidBurnShare(podsCreatePaidData[2])
      setPodsCreatePaidBurnAddress(podsCreatePaidData[3])
      
      // Fetch treasury balance if treasury exists
      if (treasury && treasury !== '0x0000000000000000000000000000000000000000') {
        // Treasury balance fetching not available in PAPI - set to 0 for now
        setTreasuryBalance(0n)
      }
    } catch (err) {
      console.error('[AdminPage] Error fetching data:', err)
      addToast('error', 'Failed to load admin data')
    } finally {
      setLoading(false)
    }
  }, [isConnected, isOwner, addToast])
  
  // Initial fetch
  useEffect(() => {
    if (isConnected && isOwner) {
      fetchData()
    }
  }, [isConnected, isOwner, fetchData])
  
  // Handle update treasury
  const handleUpdateTreasury = async () => {
    if (!newTreasuryInput.trim()) return
    
    setUpdatingTreasury(true)
    try {
      const addr = await resolveToAddress(newTreasuryInput)
      if (!addr) {
        addToast('error', 'Could not resolve address. Enter a valid 0x address or .qf name.')
        return
      }
      
      const txResult = await cc.setPaymentsTreasury(addr)
      await awaitConfirmation(txResult)
      addToast('success', 'Treasury updated successfully')
      setNewTreasuryInput('')
      await fetchData()
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to update treasury')
    } finally {
      setUpdatingTreasury(false)
    }
  }
  
  // Handle transfer ownership
  const handleTransferOwnership = async () => {
    if (!newOwnerInput.trim()) return
    
    setTransferringOwnership(true)
    try {
      const addr = await resolveToAddress(newOwnerInput)
      if (!addr) {
        addToast('error', 'Could not resolve address. Enter a valid 0x address or .qf name.')
        return
      }
      
      const txResult = await cc.transferPaymentsOwnership(addr)
      await awaitConfirmation(txResult)
      addToast('success', 'Ownership transferred successfully')
      setNewOwnerInput('')
      await fetchData()
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to transfer ownership')
    } finally {
      setTransferringOwnership(false)
    }
  }
  
  // Handle withdraw from payments
  const handleWithdrawPayments = async () => {
    if (paymentsBalance === 0n) return
    
    setWithdrawingPayments(true)
    try {
      const txResult = await cc.withdrawPayments(paymentsBalance)
      await awaitConfirmation(txResult)
      addToast('success', `Withdrawn ${formatExactAmount(paymentsBalance)} QF from Payments`)
      await fetchData()
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to withdraw')
    } finally {
      setWithdrawingPayments(false)
    }
  }
  
  // Handle withdraw to treasury
  const handleWithdrawToTreasury = async () => {
    if (paymentsBalance === 0n) return
    
    setWithdrawingToTreasury(true)
    try {
      const txResult = await cc.withdrawPaymentsToTreasury(paymentsBalance)
      await awaitConfirmation(txResult)
      addToast('success', `Transferred ${formatExactAmount(paymentsBalance)} QF to Treasury`)
      await fetchData()
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to withdraw to treasury')
    } finally {
      setWithdrawingToTreasury(false)
    }
  }
  
  // Helper to await confirmation and throw on failure
  const awaitConfirmation = async (txResult: { confirmation: Promise<{ confirmed: boolean; error?: string }> }) => {
    const result = await txResult.confirmation
    if (!result.confirmed) {
      throw new Error(result.error || 'Transaction failed on-chain')
    }
  }
  
  // Economics handlers
  const handleUpdatePaymentsSplit = async () => {
    if (!newPaymentsSplit.creatorShare || !newPaymentsSplit.treasuryShare) return
    
    setUpdatingPaymentsSplit(true)
    try {
      const creatorShare = BigInt(Math.round(parseFloat(newPaymentsSplit.creatorShare)))
      const treasuryShare = BigInt(Math.round(parseFloat(newPaymentsSplit.treasuryShare)))
      
      if (creatorShare + treasuryShare !== 100n) {
        addToast('error', 'Creator + Treasury must equal 100%')
        setUpdatingPaymentsSplit(false)
        return
      }
      
      const txResult = await cc.setPaymentsSplit(creatorShare, treasuryShare)
      await awaitConfirmation(txResult)
      addToast('success', 'Payments split updated successfully')
      setNewPaymentsSplit({ creatorShare: '', treasuryShare: '' })
      await fetchData()
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to update payments split')
    } finally {
      setUpdatingPaymentsSplit(false)
    }
  }
  
  const handleUpdatePodsCreateFee = async () => {
    if (!newPodsCreateFee) return
    
    setUpdatingPodsCreateFee(true)
    try {
      const fee = parseEther(newPodsCreateFee)
      const txResult = await cc.setPodsCreateCreationFee(fee)
      await awaitConfirmation(txResult)
      addToast('success', 'PodsCreate fee updated successfully')
      setNewPodsCreateFee('')
      await fetchData()
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to update PodsCreate fee')
    } finally {
      setUpdatingPodsCreateFee(false)
    }
  }
  
  const handleUpdatePodsCreateSplit = async () => {
    if (!newPodsCreateSplit.treasuryShare || !newPodsCreateSplit.burnShare) return
    
    setUpdatingPodsCreateSplit(true)
    try {
      const treasuryShare = BigInt(Math.round(parseFloat(newPodsCreateSplit.treasuryShare)))
      const burnShare = BigInt(Math.round(parseFloat(newPodsCreateSplit.burnShare)))
      
      if (treasuryShare + burnShare !== 100n) {
        addToast('error', 'Treasury + Burn must equal 100%')
        setUpdatingPodsCreateSplit(false)
        return
      }
      
      const txResult = await cc.setPodsCreateSplit(treasuryShare, burnShare)
      await awaitConfirmation(txResult)
      addToast('success', 'PodsCreate split updated successfully')
      setNewPodsCreateSplit({ treasuryShare: '', burnShare: '' })
      await fetchData()
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to update PodsCreate split')
    } finally {
      setUpdatingPodsCreateSplit(false)
    }
  }
  
  const handleUpdatePodsCreateBurnAddress = async () => {
    if (!newPodsCreateBurnAddress.trim()) return
    
    setUpdatingPodsCreateBurnAddress(true)
    try {
      const addr = await resolveToAddress(newPodsCreateBurnAddress)
      if (!addr) {
        addToast('error', 'Could not resolve address. Enter a valid 0x address or .qf name.')
        return
      }
      
      const txResult = await cc.setPodsCreateBurnAddress(addr)
      await awaitConfirmation(txResult)
      addToast('success', 'PodsCreate burn address updated successfully')
      setNewPodsCreateBurnAddress('')
      await fetchData()
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to update PodsCreate burn address')
    } finally {
      setUpdatingPodsCreateBurnAddress(false)
    }
  }
  
  const handleUpdatePodsCreatePaidFee = async () => {
    if (!newPodsCreatePaidFee) return
    
    setUpdatingPodsCreatePaidFee(true)
    try {
      const fee = parseEther(newPodsCreatePaidFee)
      const txResult = await cc.setPodsCreatePaidCreationFee(fee)
      await awaitConfirmation(txResult)
      addToast('success', 'PodsCreatePaid fee updated successfully')
      setNewPodsCreatePaidFee('')
      await fetchData()
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to update PodsCreatePaid fee')
    } finally {
      setUpdatingPodsCreatePaidFee(false)
    }
  }
  
  const handleUpdatePodsCreatePaidSplit = async () => {
    if (!newPodsCreatePaidSplit.treasuryShare || !newPodsCreatePaidSplit.burnShare) return
    
    setUpdatingPodsCreatePaidSplit(true)
    try {
      const treasuryShare = BigInt(Math.round(parseFloat(newPodsCreatePaidSplit.treasuryShare)))
      const burnShare = BigInt(Math.round(parseFloat(newPodsCreatePaidSplit.burnShare)))
      
      if (treasuryShare + burnShare !== 100n) {
        addToast('error', 'Treasury + Burn must equal 100%')
        setUpdatingPodsCreatePaidSplit(false)
        return
      }
      
      const txResult = await cc.setPodsCreatePaidSplit(treasuryShare, burnShare)
      await awaitConfirmation(txResult)
      addToast('success', 'PodsCreatePaid split updated successfully')
      setNewPodsCreatePaidSplit({ treasuryShare: '', burnShare: '' })
      await fetchData()
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to update PodsCreatePaid split')
    } finally {
      setUpdatingPodsCreatePaidSplit(false)
    }
  }
  
  const handleUpdatePodsCreatePaidBurnAddress = async () => {
    if (!newPodsCreatePaidBurnAddress.trim()) return
    
    setUpdatingPodsCreatePaidBurnAddress(true)
    try {
      const addr = await resolveToAddress(newPodsCreatePaidBurnAddress)
      if (!addr) {
        addToast('error', 'Could not resolve address. Enter a valid 0x address or .qf name.')
        return
      }
      
      const txResult = await cc.setPodsCreatePaidBurnAddress(addr)
      await awaitConfirmation(txResult)
      addToast('success', 'PodsCreatePaid burn address updated successfully')
      setNewPodsCreatePaidBurnAddress('')
      await fetchData()
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to update PodsCreatePaid burn address')
    } finally {
      setUpdatingPodsCreatePaidBurnAddress(false)
    }
  }
  
  // Not connected
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-6 bg-[#0a0a0a]">
        <h2 className="text-xl font-semibold text-white mb-4">Admin Access</h2>
        <p className="text-sm text-gray-500 mb-6">Connect your wallet to access admin functions</p>
        <button
          onClick={() => setShowConnectWallet(true)}
          className="bg-[#0991B2] px-6 py-3 text-sm font-semibold text-white hover:bg-[#0880A0] transition-colors"
        >
          Connect Wallet
        </button>
      </div>
    )
  }
  
  // Not owner
  if (!isOwner) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-6 bg-[#0a0a0a]">
        <div className="w-16 h-16 border border-red-500/30 bg-red-500/10 flex items-center justify-center mb-4">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">Unauthorized</h2>
        <p className="text-sm text-gray-500">Owner wallet required</p>
        <p className="text-xs text-gray-600 mt-2 font-mono">Connected: {evmAddress}</p>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Admin</h1>
          <p className="text-sm text-gray-500">Platform management and contract administration</p>
        </div>
        
        {/* Section 1: Treasury Management */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Treasury Management</h2>
          <div className="border border-gray-800 bg-[#0d0d14] p-6 space-y-4">
            {/* Current Treasury */}
            <div className="flex items-center justify-between py-3 border-b border-gray-800">
              <span className="text-sm text-gray-400">Current Treasury</span>
              <AddressDisplay address={currentTreasury} />
            </div>
            
            {/* Current Owner */}
            <div className="flex items-center justify-between py-3 border-b border-gray-800">
              <span className="text-sm text-gray-400">Current Owner</span>
              <AddressDisplay address={currentOwner} />
            </div>
            
            {/* Update Treasury */}
            <div className="pt-2">
              <label className="text-xs text-gray-500 uppercase tracking-wider block mb-2">Update Treasury</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="New treasury address or .qf name"
                  value={newTreasuryInput}
                  onChange={(e) => setNewTreasuryInput(e.target.value)}
                  disabled={updatingTreasury}
                  className="flex-1 h-10 border border-gray-800 bg-white/5 px-3 text-sm text-white placeholder:text-gray-600 focus:border-[#0991B2] focus:outline-none focus:ring-1 focus:ring-[#0991B2] transition-colors disabled:opacity-50"
                />
                <button
                  onClick={handleUpdateTreasury}
                  disabled={updatingTreasury || !newTreasuryInput.trim()}
                  className="bg-[#0991B2] px-6 py-2 text-sm font-semibold text-white hover:bg-[#0880A0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {updatingTreasury && <Spinner size="sm" />}
                  Update Treasury
                </button>
              </div>
            </div>
            
            {/* Transfer Ownership */}
            <div className="pt-2">
              <label className="text-xs text-gray-500 uppercase tracking-wider block mb-2">Transfer Ownership</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="New owner address or .qf name"
                  value={newOwnerInput}
                  onChange={(e) => setNewOwnerInput(e.target.value)}
                  disabled={transferringOwnership}
                  className="flex-1 h-10 border border-gray-800 bg-white/5 px-3 text-sm text-white placeholder:text-gray-600 focus:border-[#0991B2] focus:outline-none focus:ring-1 focus:ring-[#0991B2] transition-colors disabled:opacity-50"
                />
                <button
                  onClick={handleTransferOwnership}
                  disabled={transferringOwnership || !newOwnerInput.trim()}
                  className="bg-[#0991B2] px-6 py-2 text-sm font-semibold text-white hover:bg-[#0880A0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {transferringOwnership && <Spinner size="sm" />}
                  Transfer Ownership
                </button>
              </div>
            </div>
          </div>
        </section>
        
        {/* Section 2: Economics */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Economics</h2>
          
          {/* Entry Fee Economics (Payments) */}
          <div className="border border-gray-800 bg-[#0d0d14] p-6 mb-6">
            <h3 className="text-md font-semibold text-white mb-4">Entry Fee Economics (Payments)</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-800">
                <span className="text-sm text-gray-400">Creator Share</span>
                <span className="text-sm text-white">{100 - platformFeePct}%</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-gray-800">
                <span className="text-sm text-gray-400">Treasury Share</span>
                <span className="text-sm text-white">{platformFeePct}%</span>
              </div>
            </div>
            
            <div className="pt-2">
              <label className="text-xs text-gray-500 uppercase tracking-wider block mb-2">Update Split</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Creator %"
                  value={newPaymentsSplit.creatorShare}
                  onChange={(e) => setNewPaymentsSplit(prev => ({ ...prev, creatorShare: e.target.value }))}
                  disabled={updatingPaymentsSplit}
                  className="flex-1 h-10 border border-gray-800 bg-white/5 px-3 text-sm text-white placeholder:text-gray-600 focus:border-[#0991B2] focus:outline-none focus:ring-1 focus:ring-[#0991B2] transition-colors disabled:opacity-50"
                />
                <input
                  type="number"
                  placeholder="Treasury %"
                  value={newPaymentsSplit.treasuryShare}
                  onChange={(e) => setNewPaymentsSplit(prev => ({ ...prev, treasuryShare: e.target.value }))}
                  disabled={updatingPaymentsSplit}
                  className="flex-1 h-10 border border-gray-800 bg-white/5 px-3 text-sm text-white placeholder:text-gray-600 focus:border-[#0991B2] focus:outline-none focus:ring-1 focus:ring-[#0991B2] transition-colors disabled:opacity-50"
                />
                <button
                  onClick={handleUpdatePaymentsSplit}
                  disabled={updatingPaymentsSplit || !newPaymentsSplit.creatorShare || !newPaymentsSplit.treasuryShare}
                  className="bg-[#0991B2] px-6 py-2 text-sm font-semibold text-white hover:bg-[#0880A0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {updatingPaymentsSplit && <Spinner size="sm" />}
                  Update Split
                </button>
              </div>
            </div>
          </div>
          
          {/* Pod Creation Economics */}
          <div className="border border-gray-800 bg-[#0d0d14] p-6 mb-6">
            <h3 className="text-md font-semibold text-white mb-4">Pod Creation Economics</h3>
            
            {/* PodsCreate */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-300 mb-3">PodsCreate (Free Pods)</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="flex items-center justify-between py-3 border-b border-gray-800">
                  <span className="text-sm text-gray-400">Creation Fee</span>
                  <span className="text-sm text-white">{formatExactAmount(podsCreateFee)} QF</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-800">
                  <span className="text-sm text-gray-400">Treasury Share</span>
                  <span className="text-sm text-white">{Number(podsCreateTreasuryShare)}%</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-800">
                  <span className="text-sm text-gray-400">Burn Share</span>
                  <span className="text-sm text-white">{Number(podsCreateBurnShare)}%</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-800">
                  <span className="text-sm text-gray-400">Burn Address</span>
                  <AddressDisplay address={podsCreateBurnAddress} truncate />
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider block mb-2">Update Creation Fee</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="New fee in QF (e.g. 500)"
                      value={newPodsCreateFee}
                      onChange={(e) => setNewPodsCreateFee(e.target.value)}
                      disabled={updatingPodsCreateFee}
                      className="flex-1 h-10 border border-gray-800 bg-white/5 px-3 text-sm text-white placeholder:text-gray-600 focus:border-[#0991B2] focus:outline-none focus:ring-1 focus:ring-[#0991B2] transition-colors disabled:opacity-50"
                    />
                    <button
                      onClick={handleUpdatePodsCreateFee}
                      disabled={updatingPodsCreateFee || !newPodsCreateFee}
                      className="bg-[#0991B2] px-6 py-2 text-sm font-semibold text-white hover:bg-[#0880A0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {updatingPodsCreateFee && <Spinner size="sm" />}
                      Update Fee
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider block mb-2">Update Split</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Treasury %"
                      value={newPodsCreateSplit.treasuryShare}
                      onChange={(e) => setNewPodsCreateSplit(prev => ({ ...prev, treasuryShare: e.target.value }))}
                      disabled={updatingPodsCreateSplit}
                      className="flex-1 h-10 border border-gray-800 bg-white/5 px-3 text-sm text-white placeholder:text-gray-600 focus:border-[#0991B2] focus:outline-none focus:ring-1 focus:ring-[#0991B2] transition-colors disabled:opacity-50"
                    />
                    <input
                      type="number"
                      placeholder="Burn %"
                      value={newPodsCreateSplit.burnShare}
                      onChange={(e) => setNewPodsCreateSplit(prev => ({ ...prev, burnShare: e.target.value }))}
                      disabled={updatingPodsCreateSplit}
                      className="flex-1 h-10 border border-gray-800 bg-white/5 px-3 text-sm text-white placeholder:text-gray-600 focus:border-[#0991B2] focus:outline-none focus:ring-1 focus:ring-[#0991B2] transition-colors disabled:opacity-50"
                    />
                    <button
                      onClick={handleUpdatePodsCreateSplit}
                      disabled={updatingPodsCreateSplit || !newPodsCreateSplit.treasuryShare || !newPodsCreateSplit.burnShare}
                      className="bg-[#0991B2] px-6 py-2 text-sm font-semibold text-white hover:bg-[#0880A0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {updatingPodsCreateSplit && <Spinner size="sm" />}
                      Update Split
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider block mb-2">Update Burn Address</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="New burn address or .qf name"
                      value={newPodsCreateBurnAddress}
                      onChange={(e) => setNewPodsCreateBurnAddress(e.target.value)}
                      disabled={updatingPodsCreateBurnAddress}
                      className="flex-1 h-10 border border-gray-800 bg-white/5 px-3 text-sm text-white placeholder:text-gray-600 focus:border-[#0991B2] focus:outline-none focus:ring-1 focus:ring-[#0991B2] transition-colors disabled:opacity-50"
                    />
                    <button
                      onClick={handleUpdatePodsCreateBurnAddress}
                      disabled={updatingPodsCreateBurnAddress || !newPodsCreateBurnAddress.trim()}
                      className="bg-[#0991B2] px-6 py-2 text-sm font-semibold text-white hover:bg-[#0880A0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {updatingPodsCreateBurnAddress && <Spinner size="sm" />}
                      Update Address
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* PodsCreatePaid */}
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-3">PodsCreatePaid (Paid Pods)</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="flex items-center justify-between py-3 border-b border-gray-800">
                  <span className="text-sm text-gray-400">Creation Fee</span>
                  <span className="text-sm text-white">{formatExactAmount(podsCreatePaidFee)} QF</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-800">
                  <span className="text-sm text-gray-400">Treasury Share</span>
                  <span className="text-sm text-white">{Number(podsCreatePaidTreasuryShare)}%</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-800">
                  <span className="text-sm text-gray-400">Burn Share</span>
                  <span className="text-sm text-white">{Number(podsCreatePaidBurnShare)}%</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-800">
                  <span className="text-sm text-gray-400">Burn Address</span>
                  <AddressDisplay address={podsCreatePaidBurnAddress} truncate />
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider block mb-2">Update Creation Fee</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="New fee in QF (e.g. 500)"
                      value={newPodsCreatePaidFee}
                      onChange={(e) => setNewPodsCreatePaidFee(e.target.value)}
                      disabled={updatingPodsCreatePaidFee}
                      className="flex-1 h-10 border border-gray-800 bg-white/5 px-3 text-sm text-white placeholder:text-gray-600 focus:border-[#0991B2] focus:outline-none focus:ring-1 focus:ring-[#0991B2] transition-colors disabled:opacity-50"
                    />
                    <button
                      onClick={handleUpdatePodsCreatePaidFee}
                      disabled={updatingPodsCreatePaidFee || !newPodsCreatePaidFee}
                      className="bg-[#0991B2] px-6 py-2 text-sm font-semibold text-white hover:bg-[#0880A0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {updatingPodsCreatePaidFee && <Spinner size="sm" />}
                      Update Fee
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider block mb-2">Update Split</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Treasury %"
                      value={newPodsCreatePaidSplit.treasuryShare}
                      onChange={(e) => setNewPodsCreatePaidSplit(prev => ({ ...prev, treasuryShare: e.target.value }))}
                      disabled={updatingPodsCreatePaidSplit}
                      className="flex-1 h-10 border border-gray-800 bg-white/5 px-3 text-sm text-white placeholder:text-gray-600 focus:border-[#0991B2] focus:outline-none focus:ring-1 focus:ring-[#0991B2] transition-colors disabled:opacity-50"
                    />
                    <input
                      type="number"
                      placeholder="Burn %"
                      value={newPodsCreatePaidSplit.burnShare}
                      onChange={(e) => setNewPodsCreatePaidSplit(prev => ({ ...prev, burnShare: e.target.value }))}
                      disabled={updatingPodsCreatePaidSplit}
                      className="flex-1 h-10 border border-gray-800 bg-white/5 px-3 text-sm text-white placeholder:text-gray-600 focus:border-[#0991B2] focus:outline-none focus:ring-1 focus:ring-[#0991B2] transition-colors disabled:opacity-50"
                    />
                    <button
                      onClick={handleUpdatePodsCreatePaidSplit}
                      disabled={updatingPodsCreatePaidSplit || !newPodsCreatePaidSplit.treasuryShare || !newPodsCreatePaidSplit.burnShare}
                      className="bg-[#0991B2] px-6 py-2 text-sm font-semibold text-white hover:bg-[#0880A0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {updatingPodsCreatePaidSplit && <Spinner size="sm" />}
                      Update Split
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider block mb-2">Update Burn Address</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="New burn address or .qf name"
                      value={newPodsCreatePaidBurnAddress}
                      onChange={(e) => setNewPodsCreatePaidBurnAddress(e.target.value)}
                      disabled={updatingPodsCreatePaidBurnAddress}
                      className="flex-1 h-10 border border-gray-800 bg-white/5 px-3 text-sm text-white placeholder:text-gray-600 focus:border-[#0991B2] focus:outline-none focus:ring-1 focus:ring-[#0991B2] transition-colors disabled:opacity-50"
                    />
                    <button
                      onClick={handleUpdatePodsCreatePaidBurnAddress}
                      disabled={updatingPodsCreatePaidBurnAddress || !newPodsCreatePaidBurnAddress.trim()}
                      className="bg-[#0991B2] px-6 py-2 text-sm font-semibold text-white hover:bg-[#0880A0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {updatingPodsCreatePaidBurnAddress && <Spinner size="sm" />}
                      Update Address
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Section 3: Platform Stats */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Platform Stats</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Pods"
              value={podCount.toLocaleString()}
              accent
              loading={loading}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
              }
            />
            <StatCard
              label="Treasury Balance"
              value={`${formatExactAmount(treasuryBalance)} QF`}
              loading={loading}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              }
            />
            <StatCard
              label="Payments Contract Balance"
              value={`${formatExactAmount(paymentsBalance)} QF`}
              loading={loading}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
              }
            />
            <StatCard
              label="Platform Fee"
              value={`${platformFeePct}%`}
              accent
              loading={loading}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              }
            />
          </div>
        </section>
        
        {/* Section 4: Contract Addresses */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Deployed Contracts</h2>
          <div className="border border-gray-800 bg-[#0d0d14] overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800 bg-white/[0.02]">
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">Address</th>
                  <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">Copy</th>
                </tr>
              </thead>
              <tbody>
                {CONTRACTS_LIST.map((contract) => {
                  const address = CONTRACT_ADDRESSES[contract.key]
                  return (
                    <tr key={contract.key} className="border-b border-gray-800 last:border-b-0 hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-sm text-gray-300">{contract.name}</td>
                      <td className="px-4 py-3">
                        <code className="text-sm font-mono text-gray-400" title={address}>
                          {address.slice(0, 20)}...{address.slice(-8)}
                        </code>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <CopyButton text={address} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
        
        {/* Section 5: Contract Authorization (Skipped - no isAuthorized view function) */}
        {/* 
          TODO: Add isAuthorized view function to contracts
          The contracts have setAuthorized but no public getter for checking authorization status.
          Without isAuthorized(address) view function, we cannot display authorization badges.
        */}
        
        {/* Section 6: Quick Actions */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
          <div className="border border-gray-800 bg-[#0d0d14] p-6">
            <div className="flex flex-wrap gap-4">
              <button
                onClick={handleWithdrawPayments}
                disabled={withdrawingPayments || paymentsBalance === 0n}
                className="bg-[#0991B2] px-6 py-3 text-sm font-semibold text-white hover:bg-[#0880A0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {withdrawingPayments && <Spinner size="sm" />}
                Withdraw from Payments
                {paymentsBalance > 0n && ` (${formatExactAmount(paymentsBalance)} QF)`}
              </button>
              
              <button
                onClick={handleWithdrawToTreasury}
                disabled={withdrawingToTreasury || paymentsBalance === 0n || !currentTreasury}
                className="bg-[#0991B2] px-6 py-3 text-sm font-semibold text-white hover:bg-[#0880A0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {withdrawingToTreasury && <Spinner size="sm" />}
                Withdraw to Treasury
                {paymentsBalance > 0n && ` (${formatExactAmount(paymentsBalance)} QF)`}
              </button>
            </div>
            
            {paymentsBalance === 0n && (
              <p className="text-xs text-gray-500 mt-4">
                Payments contract has no balance to withdraw. All funds are automatically distributed to creators and treasury.
              </p>
            )}
          </div>
        </section>
        
        {/* Footer */}
        <div className="pt-8 border-t border-gray-800">
          <p className="text-xs text-gray-600">
            Owner Address: <code className="font-mono">{contractOwner || OWNER_ADDRESS || 'Loading...'}</code>
          </p>
        </div>
      </div>
    </div>
  )
}

export default AdminPage

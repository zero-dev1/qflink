// src/pages/Admin.tsx
// Design System §20 — Admin panel: Fee config, revenue splits, contract diagnostics
import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Shield, Loader2, Settings, DollarSign, Flame, Info } from 'lucide-react';
import { useWalletStore } from '@/stores/wallet';
import { useToastStore } from '@/stores/toast';
import {
  getPodsCreateCreationFee,
  getPodsCreateTreasuryShare,
  getPodsCreateBurnShare,
  getPodsCreateBurnAddress,
  getPodsCreateOwner,
  setPodsCreateCreationFee,
  setPodsCreateSplit,
  setPodsCreateBurnAddress,
  getPodsCreatePaidCreationFee,
  getPodsCreatePaidTreasuryShare,
  getPodsCreatePaidBurnShare,
  getPodsCreatePaidBurnAddress,
  setPodsCreatePaidCreationFee,
  setPodsCreatePaidSplit,
  setPodsCreatePaidBurnAddress,
  getPaymentsOwner,
  getPaymentsTreasury,
  getPaymentsBalance,
  getPaymentsCreatorShare,
  getPaymentsTreasuryShare,
  setPaymentsSplit,
  setPaymentsTreasury,
} from '@/lib/contractCalls';
import { CONTRACT_ADDRESSES } from '@/lib/contracts';
import { formatExactAmount, formatBalance, truncateAddress, cn } from '@/lib/utils';
import { hapticSuccess, hapticError, hapticTap } from '@/lib/feedback';

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

interface ContractFees {
  creationFee: bigint;
  treasuryShare: bigint;
  burnShare: bigint;
  burnAddress: string;
}

interface PaymentsData {
  owner: string | null;
  treasury: string | null;
  balance: bigint;
  creatorShare: bigint;
  treasuryShare: bigint;
}

export default function Admin() {
  const { isConnected, evmAddress } = useWalletStore();
  const addToast = useToastStore((s) => s.addToast);

  const [isLoading, setIsLoading] = useState(true);

  // Contract data
  const [freeContract, setFreeContract] = useState<ContractFees | null>(null);
  const [paidContract, setPaidContract] = useState<ContractFees | null>(null);
  const [payments, setPayments] = useState<PaymentsData | null>(null);

  // Saving states
  const [savingField, setSavingField] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!isConnected || !evmAddress) return;
    setIsLoading(true);
    try {
      // Ownership check is now handled by AdminLayout — skip guard, load data directly

      // Check per-contract ownership for diagnostics
      const [freeOwner, paymentsOwnerAddr] = await Promise.all([
        getPodsCreateOwner().catch(() => null),
        getPaymentsOwner().catch(() => null),
      ]);
      const myAddr = evmAddress.toLowerCase();
      if (freeOwner && (freeOwner as string).toLowerCase() !== myAddr) {
        console.warn('[Admin] podsCreate owner mismatch:', freeOwner, 'vs connected:', myAddr);
      }
      if (paymentsOwnerAddr && (paymentsOwnerAddr as string).toLowerCase() !== myAddr) {
        console.warn('[Admin] payments owner mismatch:', paymentsOwnerAddr, 'vs connected:', myAddr);
      }

      // Load all contract data in parallel, individually caught
      const [freeFee, freeTreasury, freeBurn, freeBurnAddr] = await Promise.all([
        getPodsCreateCreationFee().catch(() => 0n),
        getPodsCreateTreasuryShare().catch(() => 0n),
        getPodsCreateBurnShare().catch(() => 0n),
        getPodsCreateBurnAddress().catch(() => ''),
      ]);
      console.log('[Admin] Free contract:', { fee: freeFee, treasury: freeTreasury, burn: freeBurn, burnAddr: freeBurnAddr });
      setFreeContract({
        creationFee: freeFee,
        treasuryShare: freeTreasury,
        burnShare: freeBurn,
        burnAddress: typeof freeBurnAddr === 'string' ? freeBurnAddr.toLowerCase() : '',
      });

      const [paidFee, paidTreasury, paidBurn, paidBurnAddr] = await Promise.all([
        getPodsCreatePaidCreationFee().catch(() => 0n),
        getPodsCreatePaidTreasuryShare().catch(() => 0n),
        getPodsCreatePaidBurnShare().catch(() => 0n),
        getPodsCreatePaidBurnAddress().catch(() => ''),
      ]);
      console.log('[Admin] Paid contract:', { fee: paidFee, treasury: paidTreasury, burn: paidBurn, burnAddr: paidBurnAddr });
      setPaidContract({
        creationFee: paidFee,
        treasuryShare: paidTreasury,
        burnShare: paidBurn,
        burnAddress: typeof paidBurnAddr === 'string' ? paidBurnAddr.toLowerCase() : '',
      });

      const [paymentsOwner, paymentsTreasury, paymentsBal, paymentsCreatorSh, paymentsTreasurySh] = await Promise.all([
        getPaymentsOwner().catch(() => null),
        getPaymentsTreasury().catch(() => null),
        getPaymentsBalance().catch(() => 0n),
        getPaymentsCreatorShare().catch(() => 0n),
        getPaymentsTreasuryShare().catch(() => 0n),
      ]);
      setPayments({
        owner: paymentsOwner,
        treasury: paymentsTreasury,
        balance: paymentsBal,
        creatorShare: paymentsCreatorSh,
        treasuryShare: paymentsTreasurySh,
      });
    } catch (err) {
      console.error('[Admin] Failed to load:', err);
      addToast('error', 'Failed to load admin data');
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, evmAddress, addToast]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Save handlers ──

  const handleSetFee = async (contract: 'free' | 'paid', valueQf: string) => {
    const parsed = parseFloat(valueQf);
    if (isNaN(parsed) || parsed < 0) { addToast('error', 'Invalid fee'); return; }
    const feeWei = BigInt(Math.round(parsed * 1e18));
    const key = `${contract}-fee`;
    setSavingField(key);
    try {
      hapticTap();
      const result = contract === 'free'
        ? await setPodsCreateCreationFee(feeWei)
        : await setPodsCreatePaidCreationFee(feeWei);
      const confirmation = await result.confirmation;
      if (confirmation.confirmed) {
        hapticSuccess();
        addToast('success', `${contract === 'free' ? 'Free' : 'Paid'} creation fee updated`);
        loadData();
      } else {
        console.error(`[Admin] ${contract} fee tx failed:`, confirmation.error);
        hapticError();
        addToast('error', confirmation.error || 'Transaction failed on chain');
      }
    } catch (err: any) {
      console.error(`[Admin] ${contract} fee error:`, err?.message || err);
      hapticError();
      addToast('error', err?.message?.includes('rejected') ? 'Transaction rejected' : `Failed: ${err?.message?.slice(0, 80) || 'Unknown error'}`);
    } finally {
      setSavingField(null);
    }
  };

  const handleSetSplit = async (contract: 'free' | 'paid', treasuryPct: string, burnPct: string) => {
    const t = parseInt(treasuryPct, 10);
    const b = parseInt(burnPct, 10);
    if (isNaN(t) || isNaN(b) || t < 0 || b < 0 || t + b > 100) {
      addToast('error', 'Invalid split — must total ≤ 100%');
      return;
    }
    const key = `${contract}-split`;
    setSavingField(key);
    try {
      hapticTap();
      const result = contract === 'free'
        ? await setPodsCreateSplit(BigInt(t), BigInt(b))
        : await setPodsCreatePaidSplit(BigInt(t), BigInt(b));
      const confirmation = await result.confirmation;
      if (confirmation.confirmed) {
        hapticSuccess();
        addToast('success', 'Split updated');
        loadData();
      } else {
        console.error(`[Admin] ${contract} split tx failed:`, confirmation.error);
        hapticError();
        addToast('error', confirmation.error || 'Transaction failed on chain');
      }
    } catch (err: any) {
      console.error(`[Admin] ${contract} split error:`, err?.message || err);
      hapticError();
      addToast('error', err?.message?.includes('rejected') ? 'Transaction rejected' : `Failed: ${err?.message?.slice(0, 80) || 'Unknown error'}`);
    } finally {
      setSavingField(null);
    }
  };

  const handleSetPaymentsSplit = async (creatorPct: string, treasuryPct: string) => {
    const c = parseInt(creatorPct, 10);
    const t = parseInt(treasuryPct, 10);
    if (isNaN(c) || isNaN(t) || c < 0 || t < 0 || c + t > 100) {
      addToast('error', 'Invalid split');
      return;
    }
    setSavingField('payments-split');
    try {
      hapticTap();
      const result = await setPaymentsSplit(BigInt(c), BigInt(t));
      const confirmation = await result.confirmation;
      if (confirmation.confirmed) {
        hapticSuccess();
        addToast('success', 'Payments split updated');
        loadData();
      } else {
        console.error('[Admin] payments split tx failed:', confirmation.error);
        hapticError();
        addToast('error', confirmation.error || 'Transaction failed on chain');
      }
    } catch (err: any) {
      console.error('[Admin] payments split error:', err?.message || err);
      hapticError();
      addToast('error', err?.message?.includes('rejected') ? 'Transaction rejected' : `Failed: ${err?.message?.slice(0, 80) || 'Unknown error'}`);
    } finally {
      setSavingField(null);
    }
  };

  // ── Guards (ownership check is in AdminLayout — only loading/data guard here) ──

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <Loader2 size={24} className="text-cyan-primary animate-spin" />
        <p className="mt-3 text-body-sm text-text-tertiary">Loading admin data...</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
        className="max-w-content px-6 md:px-8 py-8"
      >
        {/* Header */}
        <motion.div variants={fadeUp} className="mb-6">
          <div className="flex items-center gap-3">
            <Shield size={20} className="text-cyan-primary" />
            <h1 className="font-display text-h1 text-text-primary">Admin</h1>
          </div>
          <p className="text-caption text-text-tertiary mt-1 ml-8">Tap <span className="border-b border-dashed border-white/[0.15] px-0.5">underlined values</span> to edit</p>
        </motion.div>

        {/* Zone 1 — Free Pod Creation Fees */}
        <motion.div variants={fadeUp} className="rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden mb-4">
          <div className="h-1 bg-cyan-primary/50" />
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign size={16} className="text-cyan-primary" />
              <h2 className="text-h3 font-sans font-semibold text-text-primary">Free Pod Creation</h2>
            </div>
            <div className="space-y-3">
              <AdminRow
                label="Creation fee"
                value={freeContract ? `${formatBalance(freeContract.creationFee, 18, 2)} QF` : '—'}
                editable
                saving={savingField === 'free-fee'}
                onSave={(v) => handleSetFee('free', v)}
                placeholder="e.g. 1"
              />
              <AdminRow
                label="Treasury share"
                value={freeContract ? `${Number(freeContract.treasuryShare)}%` : '—'}
              />
              <AdminRow
                label="Burn share"
                value={freeContract ? `${Number(freeContract.burnShare)}%` : '—'}
              />
              <AdminSplitRow
                label="Update split"
                saving={savingField === 'free-split'}
                onSave={(t, b) => handleSetSplit('free', t, b)}
                currentTreasury={freeContract ? Number(freeContract.treasuryShare).toString() : ''}
                currentBurn={freeContract ? Number(freeContract.burnShare).toString() : ''}
              />
              <AdminRow
                label="Burn address"
                value={freeContract?.burnAddress ? truncateAddress(freeContract.burnAddress, 'evm') : '—'}
              />
            </div>
          </div>
        </motion.div>

        {/* Zone 2 — Paid Pod Creation Fees */}
        <motion.div variants={fadeUp} className="rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden mb-4">
          <div className="h-1 bg-badge-pioneer/50" />
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign size={16} className="text-badge-pioneer" />
              <h2 className="text-h3 font-sans font-semibold text-text-primary">Paid Pod Creation</h2>
            </div>
            <div className="space-y-3">
              <AdminRow
                label="Creation fee"
                value={paidContract ? `${formatBalance(paidContract.creationFee, 18, 2)} QF` : '—'}
                editable
                saving={savingField === 'paid-fee'}
                onSave={(v) => handleSetFee('paid', v)}
                placeholder="e.g. 2"
              />
              <AdminRow
                label="Treasury share"
                value={paidContract ? `${Number(paidContract.treasuryShare)}%` : '—'}
              />
              <AdminRow
                label="Burn share"
                value={paidContract ? `${Number(paidContract.burnShare)}%` : '—'}
              />
              <AdminSplitRow
                label="Update split"
                saving={savingField === 'paid-split'}
                onSave={(t, b) => handleSetSplit('paid', t, b)}
                currentTreasury={paidContract ? Number(paidContract.treasuryShare).toString() : ''}
                currentBurn={paidContract ? Number(paidContract.burnShare).toString() : ''}
              />
              <AdminRow
                label="Burn address"
                value={paidContract?.burnAddress ? truncateAddress(paidContract.burnAddress, 'evm') : '—'}
              />
            </div>
          </div>
        </motion.div>

        {/* Zone 3 — Payments Contract */}
        <motion.div variants={fadeUp} className="rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden mb-4">
          <div className="h-1 bg-success/50" />
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Flame size={16} className="text-success" />
              <h2 className="text-h3 font-sans font-semibold text-text-primary">Payments</h2>
            </div>
            <div className="space-y-3">
              <AdminRow label="Contract balance" value={payments ? `${formatBalance(payments.balance, 18, 4)} QF` : '—'} />
              <AdminRow label="Creator share" value={payments ? `${Number(payments.creatorShare)}%` : '—'} />
              <AdminRow label="Treasury share" value={payments ? `${Number(payments.treasuryShare)}%` : '—'} />
              <AdminSplitRow
                label="Update payments split"
                saving={savingField === 'payments-split'}
                onSave={(c, t) => handleSetPaymentsSplit(c, t)}
                currentTreasury={payments ? Number(payments.creatorShare).toString() : ''}
                currentBurn={payments ? Number(payments.treasuryShare).toString() : ''}
                labelA="Creator %"
                labelB="Treasury %"
              />
              <AdminRow label="Treasury address" value={payments?.treasury ? truncateAddress(payments.treasury, 'evm') : '—'} />
              <AdminRow label="Owner" value={payments?.owner ? truncateAddress(payments.owner, 'evm') : '—'} />
            </div>
          </div>
        </motion.div>

        {/* Zone 4 — Contract Addresses (read-only) */}
        <motion.div variants={fadeUp} className="rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden mb-4">
          <div className="h-1 bg-white/[0.10]" />
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Info size={16} className="text-text-tertiary" />
              <h2 className="text-h3 font-sans font-semibold text-text-primary">Contract Addresses</h2>
            </div>
            <div className="space-y-2 text-caption">
              {Object.entries(CONTRACT_ADDRESSES).map(([name, addr]) => (
                <div key={name} className="flex items-center justify-between py-1">
                  <span className="text-text-tertiary">{name}</span>
                  <span className="text-text-secondary font-mono text-[11px]">{truncateAddress(addr, 'evm', 6)}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Refresh button */}
        <motion.div variants={fadeUp} className="mt-4 text-center">
          <button
            onClick={loadData}
            className="h-10 px-6 rounded-xl bg-white/[0.04] border border-white/[0.06] text-label text-text-secondary hover:text-text-primary hover:bg-white/[0.06] transition-colors active:scale-[0.98]"
          >
            Refresh data
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}

// ─── Admin Row ──────────────────────────────────────────────────────
function AdminRow({
  label,
  value,
  editable,
  saving,
  onSave,
  placeholder,
}: {
  label: string;
  value: string;
  editable?: boolean;
  saving?: boolean;
  onSave?: (value: string) => void;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  const handleEdit = () => {
    setEditValue(value.replace(/[^0-9.]/g, ''));
    setEditing(true);
  };

  const handleSave = () => {
    onSave?.(editValue);
    setEditing(false);
  };

  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-body-sm text-text-secondary">{label}</span>
      {editing ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder={placeholder}
            className="w-24 h-8 rounded-lg bg-white/[0.03] border border-white/[0.08] px-2 text-body-sm text-text-primary outline-none text-right focus:border-cyan-primary/40"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
          />
          <button onClick={handleSave} disabled={saving} className="text-caption text-cyan-primary hover:text-cyan-hover disabled:text-text-tertiary">
            {saving ? <Loader2 size={12} className="animate-spin" /> : 'Save'}
          </button>
          <button onClick={() => setEditing(false)} className="text-caption text-text-tertiary hover:text-text-secondary">✕</button>
        </div>
      ) : (
        <button
          onClick={editable ? handleEdit : undefined}
          className={cn(
            'text-label text-text-primary tabular-nums',
            editable && 'border-b border-dashed border-white/[0.15] hover:text-cyan-primary hover:border-cyan-primary/40 transition-colors cursor-text active:scale-[0.98] pb-0.5',
            !editable && 'cursor-default',
          )}
          title={editable ? 'Tap to edit' : undefined}
        >
          {value}
        </button>
      )}
    </div>
  );
}

// ─── Admin Split Row (two inputs) ───────────────────────────────────
function AdminSplitRow({
  label,
  saving,
  onSave,
  currentTreasury,
  currentBurn,
  labelA = 'Treasury %',
  labelB = 'Burn %',
}: {
  label: string;
  saving?: boolean;
  onSave: (a: string, b: string) => void;
  currentTreasury: string;
  currentBurn: string;
  labelA?: string;
  labelB?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [valA, setValA] = useState(currentTreasury);
  const [valB, setValB] = useState(currentBurn);

  const handleOpen = () => {
    setValA(currentTreasury);
    setValB(currentBurn);
    setEditing(true);
  };

  return editing ? (
    <div className="py-2 space-y-2">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="text-caption text-text-tertiary block mb-1">{labelA}</label>
          <input
            type="text"
            value={valA}
            onChange={(e) => setValA(e.target.value)}
            className="w-full h-8 rounded-lg bg-white/[0.03] border border-white/[0.08] px-2 text-body-sm text-text-primary outline-none focus:border-cyan-primary/40"
          />
        </div>
        <div className="flex-1">
          <label className="text-caption text-text-tertiary block mb-1">{labelB}</label>
          <input
            type="text"
            value={valB}
            onChange={(e) => setValB(e.target.value)}
            className="w-full h-8 rounded-lg bg-white/[0.03] border border-white/[0.08] px-2 text-body-sm text-text-primary outline-none focus:border-cyan-primary/40"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => { onSave(valA, valB); setEditing(false); }}
          disabled={saving}
          className="h-8 px-4 rounded-lg bg-cyan-primary/10 text-caption text-cyan-primary hover:bg-cyan-primary/20 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : 'Apply'}
        </button>
        <button onClick={() => setEditing(false)} className="text-caption text-text-tertiary hover:text-text-secondary">Cancel</button>
      </div>
    </div>
  ) : (
    <div className="flex items-center justify-between py-2">
      <span className="text-body-sm text-text-tertiary">{label}</span>
      <button
        onClick={handleOpen}
        className="text-caption text-cyan-primary hover:text-cyan-hover transition-colors active:scale-[0.98]"
      >
        <Settings size={14} />
      </button>
    </div>
  );
}

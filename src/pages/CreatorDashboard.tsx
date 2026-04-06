// src/pages/CreatorDashboard.tsx
// Design System §19 — Three zones: Pod Pulse, Members, Economics
import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useWalletStore } from '@/stores/wallet';
import { useToastStore } from '@/stores/toast';
import { useCountUp } from '@/hooks/useCountUp';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  getPod,
  getCreator,
  getEntryFee,
  setEntryFee as setEntryFeeContract,
  getPodMemberCount,
  getPaymentsBalance,
  getPaymentsCreatorShare,
  getPaymentsTreasuryShare,
} from '@/lib/contractCalls';
import type { PodData } from '@/lib/contractCalls';
import { formatExactAmount, formatCompactBalance, truncateAddress, cn } from '@/lib/utils';
import { getCategoryColor } from '@/lib/categories';

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

interface RevenueData {
  contractBalance: bigint;
  creatorShare: bigint;
  treasuryShare: bigint;
}

export default function CreatorDashboard() {
  const { podId: podIdParam } = useParams<{ podId: string }>();
  const navigate = useNavigate();
  const { isConnected, evmAddress } = useWalletStore();
  const addToast = useToastStore((s) => s.addToast);

  const [pod, setPod] = useState<PodData | null>(null);
  const [isCreator, setIsCreator] = useState<boolean | null>(null);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [entryFee, setEntryFee] = useState<bigint | null>(null);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Inline edit states
  const [editingFee, setEditingFee] = useState(false);
  const [editingThreshold, setEditingThreshold] = useState(false);
  const [isSavingFee, setIsSavingFee] = useState(false);

  const handleSaveFee = async (newValue: string) => {
    if (podId === null) return;
    const parsed = parseFloat(newValue);
    if (isNaN(parsed) || parsed < 0) {
      addToast('error', 'Invalid fee value');
      return;
    }
    setIsSavingFee(true);
    try {
      const feeWei = BigInt(Math.floor(parsed * 1e18));
      const result = await setEntryFeeContract(podId, feeWei);
      const confirmation = await result.confirmation;
      if (confirmation.confirmed) {
        setEntryFee(feeWei);
        setEditingFee(false);
        addToast('success', 'Entry fee updated');
      } else {
        addToast('error', confirmation.error || 'Transaction failed');
      }
    } catch (err) {
      addToast('error', 'Failed to update entry fee');
    } finally {
      setIsSavingFee(false);
    }
  };

  const podId = podIdParam ? parseInt(podIdParam, 10) : null;

  useEffect(() => {
    if (!isConnected || !evmAddress || podId === null || isNaN(podId)) return;
    let cancelled = false;
    setIsLoading(true);

    async function loadDashboard() {
      try {
        const [podData, creator, fee, members, contractBal, creatorSh, treasurySh] = await Promise.all([
          getPod(podId!), getCreator(podId!), getEntryFee(podId!), getPodMemberCount(podId!),
          getPaymentsBalance(), getPaymentsCreatorShare(), getPaymentsTreasuryShare(),
        ]);
        if (cancelled) return;
        setPod(podData);
        setEntryFee(fee);
        setMemberCount(members);
        setRevenue({ contractBalance: contractBal, creatorShare: creatorSh, treasuryShare: treasurySh });
        setIsCreator(creator?.toLowerCase() === evmAddress?.toLowerCase());
      } catch (err) {
        if (!cancelled) addToast('error', 'Failed to load dashboard data');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadDashboard();
    return () => { cancelled = true; };
  }, [isConnected, evmAddress, podId, addToast]);

  if (!isConnected) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-6 text-center">
        <p className="text-body text-text-secondary">Connect your wallet to manage your pod</p>
        <Link to="/connect" className="mt-4 text-label text-cyan-primary hover:text-cyan-hover transition-colors">Connect →</Link>
      </div>
    );
  }

  if (podId === null || isNaN(podId)) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-6 text-center">
        <p className="text-body text-text-secondary">Invalid pod ID</p>
        <Link to="/explore" className="mt-4 text-label text-cyan-primary hover:text-cyan-hover transition-colors">Explore pods →</Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-content px-6 md:px-8 py-8">
          <Skeleton className="h-5 w-32 mb-6" />
          <Skeleton className="h-40 w-full rounded-xl mb-4" />
          <Skeleton className="h-28 w-full rounded-xl mb-4" />
          <Skeleton className="h-36 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!pod) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-6 text-center">
        <p className="text-body text-text-secondary">Pod not found</p>
        <Link to="/explore" className="mt-4 text-label text-cyan-primary hover:text-cyan-hover transition-colors">Explore pods →</Link>
      </div>
    );
  }

  if (isCreator === false) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-6 text-center">
        <p className="text-body text-text-secondary">You are not the creator of this pod</p>
        <Link to={`/pod/${podId}`} className="mt-4 text-label text-cyan-primary hover:text-cyan-hover transition-colors">Go to pod →</Link>
      </div>
    );
  }

  const animatedBalance = useCountUp(
    revenue ? Number(revenue.contractBalance) / 1e18 : 0,
    800,
    !isLoading && revenue !== null,
  );

  const catColor = getCategoryColor(pod.category || 'Social');

  return (
    <div className="h-full overflow-y-auto">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
        className="max-w-content px-6 md:px-8 py-8"
      >
        {/* Back link */}
        <Link to={`/pod/${podId}`} className="text-label text-text-secondary hover:text-text-primary transition-colors inline-flex items-center gap-1 active:scale-[0.98]">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to pod
        </Link>

        {/* §19.1 — Zone 1: Pod Pulse */}
        <motion.div variants={fadeUp} className="mt-6 rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
          <div className="h-1" style={{ backgroundColor: catColor }} />
          <div className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <h1 className="font-display text-h1 text-text-primary">{pod.name}</h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-pill text-[10px] font-medium" style={{ backgroundColor: `${catColor}15`, color: catColor }}>
                {pod.category}
              </span>
            </div>

            <div className="flex items-center gap-2 text-body-sm text-text-secondary">
              <span>{memberCount ?? '—'} members</span>
            </div>

            {/* Inline-editable values */}
            <div className="mt-4 space-y-3">
              <InlineEditRow
                label="Entry fee"
                value={entryFee !== null && entryFee > 0n ? `${formatExactAmount(entryFee)} QF` : 'Free'}
                isEditing={editingFee}
                isSaving={isSavingFee}
                onEdit={() => setEditingFee(true)}
                onCancel={() => setEditingFee(false)}
                onSave={handleSaveFee}
              />
              <InlineEditRow
                label="Token gate"
                value={pod.threshold > 0n ? `${formatExactAmount(pod.threshold)} QF` : 'None'}
                isEditing={editingThreshold}
                onEdit={() => setEditingThreshold(true)}
                onCancel={() => setEditingThreshold(false)}
              />
            </div>
          </div>
        </motion.div>

        {/* §19.2 — Zone 2: Members */}
        <motion.div variants={fadeUp} className="mt-4 rounded-xl bg-white/[0.02] border border-white/[0.06] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-h3 font-sans font-semibold text-text-primary">Members</h2>
            <span className="text-label text-text-secondary">{memberCount ?? '—'}</span>
          </div>
          <p className="text-body-sm text-text-tertiary">
            Member list with promote/ban actions coming soon.
          </p>
        </motion.div>

        {/* §19.3 — Zone 3: Economics */}
        <motion.div variants={fadeUp} className="mt-4 rounded-xl bg-white/[0.02] border border-white/[0.06] p-5">
          <h2 className="text-h3 font-sans font-semibold text-text-primary mb-4">Economics</h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <span className="text-body-sm text-text-secondary">Revenue</span>
              <span className="text-label text-text-primary tabular-nums">
                {revenue ? `${animatedBalance.toFixed(1)} QF` : '—'}
              </span>
            </div>

            {entryFee !== null && entryFee > 0n && memberCount !== null && (
              <div className="flex items-center justify-between py-2 text-caption text-text-tertiary">
                <span>Context</span>
                <span>{memberCount} × {formatExactAmount(entryFee)} QF = {formatExactAmount(entryFee * BigInt(memberCount))} QF</span>
              </div>
            )}

            <div className="flex items-center justify-between py-2">
              <span className="text-body-sm text-text-secondary">Creator share</span>
              <span className="text-label text-success">{revenue ? `${Number(revenue.creatorShare)}%` : '—'}</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-body-sm text-text-secondary">Treasury share</span>
              <span className="text-label text-text-secondary">{revenue ? `${Number(revenue.treasuryShare)}%` : '—'}</span>
            </div>

            {/* Inline withdraw action */}
            <div className="pt-3 border-t border-white/[0.06]">
              <button aria-label="Withdraw creator earnings" className="h-10 px-6 rounded-xl bg-white/[0.04] border border-white/[0.06] text-label text-text-secondary hover:text-text-primary hover:bg-white/[0.06] transition-colors active:scale-[0.98]">
                Withdraw
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

// ─── Inline edit row (tap-to-edit) ──────────────────────────────────
function InlineEditRow({
  label,
  value,
  isEditing,
  isSaving,
  onEdit,
  onCancel,
  onSave,
}: {
  label: string;
  value: string;
  isEditing: boolean;
  isSaving?: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave?: (newValue: string) => void;
}) {
  const [editValue, setEditValue] = useState(value === 'Free' || value === 'None' ? '' : value.replace(' QF', ''));

  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-body-sm text-text-secondary">{label}</span>
      {isEditing ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-20 h-8 rounded-lg bg-white/[0.03] border border-white/[0.08] px-2 text-body-sm text-text-primary outline-none text-right"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') onSave?.(editValue); if (e.key === 'Escape') onCancel(); }}
          />
          <button
            onClick={() => onSave?.(editValue)}
            disabled={isSaving}
            className="text-caption text-cyan-primary hover:text-cyan-hover transition-colors disabled:text-text-tertiary"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          <button onClick={onCancel} className="text-caption text-text-tertiary hover:text-text-secondary">Cancel</button>
        </div>
      ) : (
        <button onClick={onEdit} className="text-label text-text-primary hover:text-cyan-primary transition-colors active:scale-[0.98]">
          {value}
        </button>
      )}
    </div>
  );
}

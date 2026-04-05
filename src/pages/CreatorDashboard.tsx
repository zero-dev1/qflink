// src/pages/CreatorDashboard.tsx
import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useWalletStore } from '@/stores/wallet';
import { usePodsStore } from '@/stores/pods';
import { useToastStore } from '@/stores/toast';
import { useCountUp } from '@/hooks/useCountUp';
import { Avatar } from '@/components/ui/Avatar';
import { StatCard } from '@/components/ui/StatCard';
import { BadgePill } from '@/components/ui/BadgePill';
import { Skeleton } from '@/components/ui/Skeleton';
import { CopyButton } from '@/components/ui/CopyButton';
import { Button } from '@/components/ui/Button';
import {
  getPod,
  getCreator,
  getEntryFee,
  getPodMemberCount,
  getPaymentsBalance,
  getPaymentsCreatorShare,
  getPaymentsTreasuryShare,
  isMember,
} from '@/lib/contractCalls';
import type { PodData } from '@/lib/contractCalls';
import { reverseResolve } from '@/lib/qns';
import {
  formatBalance,
  formatExactAmount,
  formatCompactBalance,
  truncateAddress,
} from '@/lib/utils';

// ── Stagger animation ───────────────────────────────────────────────
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// ── Revenue data from chain ─────────────────────────────────────────
interface RevenueData {
  contractBalance: bigint;
  creatorShare: bigint;   // percentage basis points
  treasuryShare: bigint;  // percentage basis points
}

export default function CreatorDashboard() {
  const { podId: podIdParam } = useParams<{ podId: string }>();
  const navigate = useNavigate();
  const { isConnected, evmAddress } = useWalletStore();
  const addToast = useToastStore((s) => s.addToast);

  const [pod, setPod] = useState<PodData | null>(null);
  const [isCreator, setIsCreator] = useState<boolean | null>(null); // null = loading
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [entryFee, setEntryFee] = useState<bigint | null>(null);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const podId = podIdParam ? parseInt(podIdParam, 10) : null;

  // Fetch all dashboard data
  useEffect(() => {
    if (!isConnected || !evmAddress || podId === null || isNaN(podId)) return;

    let cancelled = false;
    setIsLoading(true);

    async function loadDashboard() {
      try {
        // Parallel fetches
        const [podData, creator, fee, members, contractBal, creatorSh, treasurySh] =
          await Promise.all([
            getPod(podId!),
            getCreator(podId!),
            getEntryFee(podId!),
            getPodMemberCount(podId!),
            getPaymentsBalance(),
            getPaymentsCreatorShare(),
            getPaymentsTreasuryShare(),
          ]);

        if (cancelled) return;

        setPod(podData);
        setEntryFee(fee);
        setMemberCount(members);
        setRevenue({
          contractBalance: contractBal,
          creatorShare: creatorSh,
          treasuryShare: treasurySh,
        });

        // Check if current user is the creator
        const userIsCreator =
          creator?.toLowerCase() === evmAddress?.toLowerCase();
        setIsCreator(userIsCreator);
      } catch (err) {
        console.error('Failed to load creator dashboard:', err);
        if (!cancelled) {
          addToast('error', 'Failed to load dashboard data');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [isConnected, evmAddress, podId, addToast]);

  // ── Disconnected ──
  if (!isConnected) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <p className="text-body text-text-secondary">
          Connect your wallet to manage your pod
        </p>
        <Link
          to="/connect"
          className="mt-4 text-label text-cyan-primary hover:text-cyan-hover transition-colors"
        >
          Connect →
        </Link>
      </div>
    );
  }

  // ── Invalid pod ID ──
  if (podId === null || isNaN(podId)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <p className="text-body text-text-secondary">Invalid pod ID</p>
        <Link
          to="/explore"
          className="mt-4 text-label text-cyan-primary hover:text-cyan-hover transition-colors"
        >
          Explore pods →
        </Link>
      </div>
    );
  }

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="max-w-content mx-auto px-6 md:px-8 py-8">
        <Skeleton className="h-5 w-32 mb-6" />
        <Skeleton className="h-40 w-full rounded-lg mb-4" />
        <Skeleton className="h-28 w-full rounded-lg mb-4" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    );
  }

  // ── Not found ──
  if (!pod) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <p className="text-body text-text-secondary">Pod not found</p>
        <Link
          to="/explore"
          className="mt-4 text-label text-cyan-primary hover:text-cyan-hover transition-colors"
        >
          Explore pods →
        </Link>
      </div>
    );
  }

  // ── Not the creator ──
  if (isCreator === false) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <p className="text-body text-text-secondary">
          You are not the creator of this pod
        </p>
        <Link
          to={`/pod/${podId}`}
          className="mt-4 text-label text-cyan-primary hover:text-cyan-hover transition-colors"
        >
          Go to pod →
        </Link>
      </div>
    );
  }

  // ── Creator Dashboard ──
  const animatedBalance = useCountUp(
    revenue ? Number(revenue.contractBalance) / 1e18 : 0,
    800,
    !isLoading && revenue !== null,
  );

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="max-w-content mx-auto px-6 md:px-8 py-8"
    >
      {/* Back link */}
      <Link
        to={`/pod/${podId}`}
        className="text-label text-text-secondary hover:text-text-primary transition-colors inline-flex items-center gap-1"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M10 12L6 8L10 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Back to pod
      </Link>

      {/* ─── Overview Card ───────────────────────────────────── */}
      <motion.div
        variants={fadeUp}
        className="mt-6 rounded-lg bg-surface-2 border border-border-subtle p-4 md:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-display text-h1 text-text-primary">{pod.name}</h1>
              <BadgePill
                label={pod.tier === 1 ? 'Pro' : 'Free'}
                variant={pod.tier === 1 ? 'success' : 'cyan'}
              />
            </div>
            {pod.description && (
              <p className="mt-2 text-body text-text-secondary">
                {pod.description}
              </p>
            )}
            <div className="mt-3 flex items-center gap-4 text-body-sm text-text-tertiary">
              <span>{pod.category}</span>
              <span>·</span>
              <span>{pod.isPublic ? 'Public' : 'Private'}</span>
              <span>·</span>
              <span>Pod #{String(podId)}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ─── Revenue Card ────────────────────────────────────── */}
      <motion.div
        variants={fadeUp}
        className="mt-4 rounded-lg bg-surface-2 border border-border-subtle p-4 md:p-6"
      >
        <h2 className="font-display text-h2 text-text-primary mb-4">Revenue</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            value={
              revenue
                ? formatCompactBalance(BigInt(Math.floor(animatedBalance * 1e18)))
                : '—'
            }
            label="Contract Balance"
            color="default"
          />
          <StatCard
            value={
              revenue ? `${Number(revenue.creatorShare)}%` : '—'
            }
            label="Creator Share"
            color="success"
          />
          <StatCard
            value={
              revenue ? `${Number(revenue.treasuryShare)}%` : '—'
            }
            label="Treasury Share"
            color="cyan"
          />
        </div>

        {entryFee !== null && entryFee > 0n && (
          <div className="mt-4 pt-4 border-t border-border-subtle">
            <div className="flex items-center justify-between">
              <p className="text-body-sm text-text-secondary">Entry Fee</p>
              <p className="text-label text-text-primary">
                {formatExactAmount(entryFee)} QF
              </p>
            </div>
          </div>
        )}
      </motion.div>

      {/* ─── Members Card ────────────────────────────────────── */}
      <motion.div
        variants={fadeUp}
        className="mt-4 rounded-lg bg-surface-2 border border-border-subtle p-4 md:p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-h2 text-text-primary">Members</h2>
          <span className="text-label text-text-secondary">
            {memberCount !== null ? memberCount : '—'}
          </span>
        </div>

        <p className="text-body-sm text-text-tertiary">
          Member list coming soon. Current count is read from chain.
        </p>
      </motion.div>

      {/* ─── Settings Card (read-only from chain) ────────────── */}
      <motion.div
        variants={fadeUp}
        className="mt-4 rounded-lg bg-surface-2 border border-border-subtle p-4 md:p-6"
      >
        <h2 className="font-display text-h2 text-text-primary mb-4">Settings</h2>

        <div className="space-y-4">
          <SettingRow
            label="Token Gate"
            value={
              pod.threshold > 0n
                ? `${formatExactAmount(pod.threshold)} QF` 
                : 'None'
            }
          />
          <SettingRow
            label="Entry Fee"
            value={
              entryFee !== null && entryFee > 0n
                ? `${formatExactAmount(entryFee)} QF` 
                : 'Free'
            }
          />
          <SettingRow
            label="Category"
            value={pod.category}
          />
          <SettingRow
            label="Visibility"
            value={pod.isPublic ? 'Public' : 'Private'}
          />
          <SettingRow
            label="Tier"
            value={pod.tier === 1 ? 'Pro' : 'Free'}
          />
          <SettingRow
            label="Pod ID"
            value={`#${String(podId)}`}
          />
          <SettingRow
            label="Creator"
            value={truncateAddress(pod.creator, 'evm')}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── SettingRow sub-component ────────────────────────────────────────
function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 gap-1">
      <p className="text-body-sm text-text-secondary">{label}</p>
      <div className="flex items-center gap-2">
        <p className="text-label text-text-primary break-all sm:break-normal">{value}</p>
        <span className="text-caption text-text-tertiary whitespace-nowrap">from chain</span>
      </div>
    </div>
  );
}

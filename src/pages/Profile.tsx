// src/pages/Profile.tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useWalletStore } from '@/stores/wallet';
import { usePodsStore } from '@/stores/pods';
import { Avatar } from '@/components/ui/Avatar';
import { CopyButton } from '@/components/ui/CopyButton';
import { StatCard } from '@/components/ui/StatCard';
import { BadgePill } from '@/components/ui/BadgePill';
import { Skeleton } from '@/components/ui/Skeleton';
import { PodListItem } from '@/components/home/PodListItem';
import { formatBalance, formatCompactBalance } from '@/lib/utils';
import { getProfile } from '@/lib/contractCalls';
import type { UserProfile } from '@/lib/contractCalls';

// ── Stagger container for card entrance ─────────────────────────────
const stagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function Profile() {
  const { isConnected, qnsName, evmAddress, address, balance } = useWalletStore();
  const { pods, userPodIds, isLoadingPods, fetchPods, fetchUserPods, getPodById } = usePodsStore();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Fetch on-chain profile + user pods
  useEffect(() => {
    if (!isConnected || !evmAddress) return;

    setIsLoadingProfile(true);
    getProfile(evmAddress as `0x${string}`)
      .then((p) => setProfile(p))
      .catch(() => {})
      .finally(() => setIsLoadingProfile(false));

    fetchPods();
    fetchUserPods();
  }, [isConnected, evmAddress, fetchPods, fetchUserPods]);

  // Compute created pods
  const createdPods = pods.filter(
    (p) => p.creator === evmAddress?.toLowerCase()
  );

  // Display name
  const displayName = qnsName
    ? qnsName.replace('.qf', '')
    : evmAddress
      ? `${evmAddress.slice(0, 6)}...${evmAddress.slice(-4)}` 
      : '—';

  const displaySuffix = qnsName ? (
    <span className="text-cyan-primary">.qf</span>
  ) : null;

  // ── Disconnected ──
  if (!isConnected) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <p className="text-body text-text-secondary">
          Connect your wallet to view your profile
        </p>
        <Link
          to="/connect"
          className="mt-4 text-label text-cyan-primary hover:text-cyan-hover transition-colors"
        >
          Connect →
        </Link>
        </div>
      </div>
    );
  }

  // ── Connected ──
  return (
    <div className="h-full overflow-y-auto">
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="max-w-content mx-auto px-6 md:px-8 py-8"
      >
      {/* ─── Identity Card ───────────────────────────────────── */}
      <motion.div
        variants={fadeUp}
        whileHover={{ y: -2 }}
        transition={{ y: { duration: 0.2 } }}
        className="rounded-lg bg-surface-2 border border-border-subtle p-6"
      >
        <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-5">
          {isLoadingProfile ? (
            <Skeleton className="h-20 w-20 rounded-full" />
          ) : (
            <Avatar address={evmAddress || ''} size={80} />
          )}
          <div className="flex-1 min-w-0 text-center md:text-left">
            {isLoadingProfile ? (
              <div className="space-y-2">
                <Skeleton className="h-7 w-40" />
                <Skeleton className="h-4 w-24" />
              </div>
            ) : (
              <>
                <h1 className="font-display text-h1 text-text-primary">
                  {displayName}{displaySuffix}
                </h1>

                {/* On-chain display name if different from QNS */}
                {profile?.displayName && profile.displayName !== qnsName?.replace('.qf', '') && (
                  <p className="mt-0.5 text-body-sm text-text-secondary">
                    {profile.displayName}
                  </p>
                )}
              </>
            )}

            {/* Bio placeholder — QNS text records not yet available */}
            {!isLoadingProfile && !qnsName ? (
              <a
                href="https://dotqf.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex text-label text-cyan-primary hover:text-cyan-hover transition-colors"
              >
                Claim your .qf name →
              </a>
            ) : !isLoadingProfile && qnsName ? (
              <a
                href="https://dotqf.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex text-body-sm text-text-tertiary hover:text-text-secondary transition-colors"
              >
                Edit profile on dotqf.xyz →
              </a>
            ) : null}

            {/* Badges */}
            {!isLoadingProfile && (
              <div className="mt-3 flex flex-wrap gap-2">
                {profile && <BadgePill label="Registered" variant="cyan" />}
                {createdPods.length > 0 && <BadgePill label="Creator" variant="success" />}
                {userPodIds.length > 0 && <BadgePill label="Member" variant="cyan" />}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ─── Addresses Card ──────────────────────────────────── */}
      <motion.div
        variants={fadeUp}
        whileHover={{ y: -2 }}
        transition={{ y: { duration: 0.2 } }}
        className="mt-4 rounded-lg bg-surface-2 border border-border-subtle p-6"
      >
        <h2 className="font-display text-h2 text-text-primary mb-4">Addresses</h2>

        <div className="space-y-4">
          {/* SS58 */}
          <div>
            <p className="text-caption text-text-tertiary mb-1">Substrate (SS58)</p>
            <div className="flex items-center gap-2 bg-surface-3 rounded-sm px-3 py-2">
              <p className="text-mono text-text-secondary truncate flex-1 select-all text-[11px] md:text-body-sm">
                {address || '—'}
              </p>
              {address && (
                <CopyButton text={address} label="SS58 address copied" />
              )}
            </div>
          </div>

          {/* EVM */}
          <div>
            <p className="text-caption text-text-tertiary mb-1">EVM (Derived)</p>
            <div className="flex items-center gap-2 bg-surface-3 rounded-sm px-3 py-2">
              <p className="text-mono text-text-secondary truncate flex-1 select-all text-[11px] md:text-body-sm">
                {evmAddress || '—'}
              </p>
              {evmAddress && (
                <CopyButton text={evmAddress} label="EVM address copied" />
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ─── Stats Card ──────────────────────────────────────── */}
      <motion.div
        variants={fadeUp}
        whileHover={{ y: -2 }}
        transition={{ y: { duration: 0.2 } }}
        className="mt-4 rounded-lg bg-surface-2 border border-border-subtle p-6"
      >
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            value={balance > 0n ? formatCompactBalance(balance) : '0'}
            label="Balance (QF)"
            color="cyan"
            isLoading={isLoadingProfile}
          />
          <StatCard
            value={String(userPodIds.length)}
            label="Pods Joined"
            isLoading={isLoadingPods}
          />
          <StatCard
            value={String(createdPods.length)}
            label="Pods Created"
            isLoading={isLoadingPods}
          />
        </div>
      </motion.div>

      {/* ─── Your Pods (compact activity list) ───────────────── */}
      {userPodIds.length > 0 && (
        <motion.div
          variants={fadeUp}
          whileHover={{ y: -2 }}
          transition={{ y: { duration: 0.2 } }}
          className="mt-4 rounded-lg bg-surface-2 border border-border-subtle p-6"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-h2 text-text-primary">Your Pods</h2>
            <Link
              to="/explore"
              className="text-label text-cyan-primary hover:text-cyan-hover transition-colors"
            >
              View all →
            </Link>
          </div>

          <div className="flex flex-col gap-1 -mx-4">
            {userPodIds.slice(0, 5).map((podId) => {
              const pod = getPodById(podId);
              if (!pod) return null;
              return (
                <PodListItem
                  key={podId}
                  podId={podId}
                  name={pod.name}
                  category={pod.category}
                  memberCount={pod.memberCount}
                />
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ─── Created Pods quick access ───────────────────────── */}
      {createdPods.length > 0 && (
        <motion.div
          variants={fadeUp}
          whileHover={{ y: -2 }}
          transition={{ y: { duration: 0.2 } }}
          className="mt-4 rounded-lg bg-surface-2 border border-border-subtle p-6"
        >
          <h2 className="font-display text-h2 text-text-primary mb-3">Created Pods</h2>
          <div className="flex flex-col gap-2">
            {createdPods.map((pod) => (
              <div
                key={Number(pod.id)}
                className="flex items-center justify-between px-4 py-3 rounded-lg hover:bg-surface-3 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-surface-3 flex items-center justify-center shrink-0">
                    <span className="text-body-sm text-text-secondary">
                      {pod.category.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-label text-text-primary truncate">{pod.name}</p>
                    <p className="text-caption text-text-tertiary">
                      {pod.memberCount} members
                    </p>
                  </div>
                </div>
                <Link
                  to={`/creator/${pod.id}`}
                  className="text-label text-cyan-primary hover:text-cyan-hover transition-colors shrink-0"
                >
                  Manage →
                </Link>
              </div>
            ))}
          </div>
        </motion.div>
      )}
      </motion.div>
    </div>
  );
}

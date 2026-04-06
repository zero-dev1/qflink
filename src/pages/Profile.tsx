// src/pages/Profile.tsx
// Design System §18 — Identity surface
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Crown, Shield, FlaskConical, Megaphone, Zap, Lock, LockOpen } from 'lucide-react';
import { useWalletStore } from '@/stores/wallet';
import { usePodsStore } from '@/stores/pods';
import { useModeStore } from '@/stores/mode';
import { Avatar } from '@/components/ui/Avatar';
import { CopyButton } from '@/components/ui/CopyButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatBalance, formatCompactBalance, cn } from '@/lib/utils';
import { getProfile } from '@/lib/contractCalls';
import type { UserProfile } from '@/lib/contractCalls';
import { getBadgesForName, type UserBadge } from '@/lib/badges';
import { getCategoryColor } from '@/lib/categories';

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function Profile() {
  const navigate = useNavigate();
  const { isConnected, qnsName, evmAddress, address, balance, encryptionKeyPair, disconnect } = useWalletStore();
  const { pods, userPodIds, isLoadingPods, fetchPods, fetchUserPods, getPodById } = usePodsStore();
  const { instantActive, privacyActive, getInstantRemaining } = useModeStore();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [showAddresses, setShowAddresses] = useState(false);

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

  useEffect(() => {
    if (!qnsName) { setBadges([]); return; }
    getBadgesForName(qnsName).then(setBadges).catch(() => setBadges([]));
  }, [qnsName]);

  const createdPods = pods.filter((p) => p.creator === evmAddress?.toLowerCase());
  const userPods = pods.filter((p) => userPodIds.includes(Number(p.id)));
  const firstName = qnsName ? qnsName.replace('.qf', '') : null;

  // Badge color for avatar ring
  const badgeColor = badges.length > 0 ? badges[0].color : '#06B6D4';

  if (!isConnected) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-6 text-center">
        <p className="text-body text-text-secondary">Connect your wallet to view your profile</p>
        <Link to="/connect" className="mt-4 text-label text-cyan-primary hover:text-cyan-hover transition-colors">Connect →</Link>
      </div>
    );
  }

  // Instant remaining text
  const instantRemaining = instantActive ? Math.ceil(getInstantRemaining() / 60000) : 0;

  return (
    <div className="h-full overflow-y-auto">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
        className="max-w-content px-6 md:px-8 py-8"
      >
        {/* §18.1 — Identity Hero */}
        <motion.div variants={fadeUp} className="flex flex-col items-center md:items-start md:flex-row gap-5 mb-8">
          {isLoadingProfile ? (
            <Skeleton className="h-24 w-24 rounded-full" />
          ) : (
            <div className="relative">
              <div
                className="w-24 h-24 rounded-full overflow-hidden border-[3px]"
                style={{ borderColor: badgeColor }}
              >
                <Avatar address={evmAddress || ''} size={80} className="w-full h-full" />
              </div>
              {/* Pulsing ring if no .qf name */}
              {!qnsName && (
                <div className="absolute inset-0 rounded-full border-2 border-cyan-primary animate-border-pulse pointer-events-none" />
              )}
            </div>
          )}

          <div className="flex-1 min-w-0 text-center md:text-left">
            {isLoadingProfile ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-40" />
                <Skeleton className="h-4 w-24" />
              </div>
            ) : (
              <>
                {/* .qf split render */}
                <h1 className="font-display text-h1 text-text-primary">
                  {firstName ? (
                    <>{firstName}<span className="text-cyan-primary">.qf</span></>
                  ) : evmAddress ? (
                    `${evmAddress.slice(0, 6)}...${evmAddress.slice(-4)}`
                  ) : '—'}
                </h1>

                {/* On-chain display name */}
                {profile?.displayName && profile.displayName !== firstName && (
                  <p className="mt-0.5 text-body-sm text-text-secondary">{profile.displayName}</p>
                )}

                {/* QNS badges — real on-chain only */}
                {badges.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2 justify-center md:justify-start">
                    {badges.map((badge) => (
                      <span
                        key={badge.type}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-caption font-medium"
                        style={{ backgroundColor: `${badge.color}15`, color: badge.color, border: `1px solid ${badge.color}30` }}
                      >
                        {badge.icon === 'crown' && <Crown size={12} strokeWidth={1.5} />}
                        {badge.icon === 'shield' && <Shield size={12} strokeWidth={1.5} />}
                        {badge.icon === 'flask' && <FlaskConical size={12} strokeWidth={1.5} />}
                        {badge.icon === 'megaphone' && <Megaphone size={12} strokeWidth={1.5} />}
                        {badge.label}
                      </span>
                    ))}
                  </div>
                )}

                {/* Edit link */}
                {qnsName ? (
                  <a href="https://dotqf.xyz" target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex text-body-sm text-text-tertiary hover:text-text-secondary transition-colors">
                    Edit on dotqf.xyz →
                  </a>
                ) : (
                  <a href="https://dotqf.xyz" target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex text-label text-cyan-primary hover:text-cyan-hover transition-colors">
                    Claim your .qf name →
                  </a>
                )}
              </>
            )}
          </div>
        </motion.div>

        {/* §18.2 — Session Status Strip */}
        <motion.div variants={fadeUp} className="mb-6 flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <span className="text-caption text-text-secondary inline-flex items-center gap-1">
            <Zap size={12} strokeWidth={1.5} /> Instant: {instantActive ? `${instantRemaining}m` : 'Off'}
          </span>
          <span className="text-white/[0.10]">·</span>
          <span className="text-caption text-text-secondary inline-flex items-center gap-1">
            <Lock size={12} strokeWidth={1.5} /> Privacy: {privacyActive ? 'On' : 'Off'}
          </span>
          <span className="text-white/[0.10]">·</span>
          <span className="text-caption text-text-secondary">
            Balance: {formatCompactBalance(balance)} QF
          </span>
        </motion.div>

        {/* §18.3 — Activity Summary */}
        <motion.div variants={fadeUp} className="mb-6 rounded-xl bg-white/[0.02] border border-white/[0.06] p-5">
          <p className="text-body text-text-primary">
            Member of <strong>{userPodIds.length}</strong> {userPodIds.length === 1 ? 'pod' : 'pods'}
            {' · '}Created <strong>{createdPods.length}</strong> {createdPods.length === 1 ? 'pod' : 'pods'}
          </p>
          {createdPods.length > 0 && (
            <div className="mt-3 flex flex-col gap-1">
              {createdPods.map((pod) => (
                <div key={Number(pod.id)} className="flex items-center justify-between py-1.5">
                  <span className="text-label text-text-secondary truncate">{pod.name}</span>
                  <Link to={`/creator/${pod.id}`} className="text-caption text-cyan-primary hover:text-cyan-hover shrink-0 active:scale-[0.98]">
                    Manage →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* §18.4 — Your Pods (compact list) */}
        {userPods.length > 0 && (
          <motion.div variants={fadeUp} className="mb-6">
            <h2 className="text-label text-text-secondary mb-3">Your Pods</h2>
            <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] divide-y divide-white/[0.04] overflow-hidden">
              {userPods.slice(0, 5).map((pod) => (
                <button
                  key={Number(pod.id)}
                  onClick={() => navigate(`/pod/${pod.id}`)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors active:scale-[0.98]"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-caption font-bold text-white shrink-0"
                    style={{ backgroundColor: getCategoryColor(pod.category) }}
                  >
                    {pod.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-label text-text-primary truncate">{pod.name}</p>
                    <p className="text-caption text-text-tertiary">{pod.memberCount} members</p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* §18.5 — Addresses (collapsed by default) */}
        <motion.div variants={fadeUp} className="mb-6">
          <button
            onClick={() => setShowAddresses(!showAddresses)}
            aria-expanded={showAddresses}
            aria-label={showAddresses ? 'Hide wallet addresses' : 'Show wallet addresses'}
            className="flex items-center gap-2 text-label text-text-secondary hover:text-text-primary transition-colors active:scale-[0.98]"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={cn('transition-transform', showAddresses && 'rotate-90')}>
              <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Addresses
          </button>

          {showAddresses && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3 space-y-3">
              <div>
                <p className="text-caption text-text-tertiary mb-1">Substrate (SS58)</p>
                <div className="flex items-center gap-2 bg-white/[0.02] rounded-lg px-3 py-2">
                  <p className="text-mono text-text-secondary truncate flex-1 select-all text-[11px]">{address || '—'}</p>
                  {address && <CopyButton text={address} label="SS58 address copied" />}
                </div>
              </div>
              <div>
                <p className="text-caption text-text-tertiary mb-1">EVM (Derived)</p>
                <div className="flex items-center gap-2 bg-white/[0.02] rounded-lg px-3 py-2">
                  <p className="text-mono text-text-secondary truncate flex-1 select-all text-[11px]">{evmAddress || '—'}</p>
                  {evmAddress && <CopyButton text={evmAddress} label="EVM address copied" />}
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* §18.6 — Encryption Status */}
        <motion.div variants={fadeUp} className="mb-8">
          <p className="text-body-sm text-text-secondary">
            {encryptionKeyPair ? (
              <span className="inline-flex items-center gap-1"><Lock size={12} strokeWidth={1.5} /> Encryption key active</span>
            ) : (
              <span className="text-text-tertiary inline-flex items-center gap-1"><LockOpen size={12} strokeWidth={1.5} /> Encryption not set up — connect wallet to derive keys</span>
            )}
          </p>
        </motion.div>

        {/* §18.7 — Disconnect (red text link at bottom) */}
        <motion.div variants={fadeUp}>
          <button
            onClick={() => { disconnect(); navigate('/'); }}
            className="text-label text-error hover:text-red-400 transition-colors active:scale-[0.98]"
          >
            Disconnect wallet
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}

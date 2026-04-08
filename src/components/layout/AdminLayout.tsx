// src/components/layout/AdminLayout.tsx
// Standalone admin layout — outside AppLayout, own sidebar with admin nav
import { useState, useEffect, useCallback } from 'react';
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, DollarSign, Flame, Info, ChevronLeft, Loader2, AlertTriangle } from 'lucide-react';
import { useWalletStore } from '@/stores/wallet';
import { getPodsCreateOwner } from '@/lib/contractCalls';
import { truncateAddress, cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/admin', icon: Shield, label: 'Overview', end: true },
  { to: '/admin/fees', icon: DollarSign, label: 'Pod Fees' },
  { to: '/admin/payments', icon: Flame, label: 'Payments' },
  { to: '/admin/contracts', icon: Info, label: 'Contracts' },
];

const SPRING = { type: 'spring' as const, damping: 28, stiffness: 260 };

export function AdminLayout() {
  const navigate = useNavigate();
  const { isConnected, evmAddress } = useWalletStore();
  const [isOwner, setIsOwner] = useState<boolean | null>(null);
  const [ownerAddress, setOwnerAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkOwnership = useCallback(async () => {
    if (!isConnected || !evmAddress) {
      setIsOwner(false);
      setIsLoading(false);
      return;
    }
    try {
      const raw = await getPodsCreateOwner();
      const owner = (raw as string).toLowerCase();
      setOwnerAddress(owner);
      setIsOwner(owner === evmAddress.toLowerCase());
    } catch {
      setIsOwner(false);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, evmAddress]);

  useEffect(() => { checkOwnership(); }, [checkOwnership]);

  // Guards
  if (!isConnected) {
    return (
      <div className="h-screen bg-base flex flex-col items-center justify-center px-6 text-center">
        <Shield size={32} className="text-text-tertiary mb-4" />
        <p className="text-body text-text-secondary">Connect your wallet to access admin</p>
        <Link to="/connect" className="mt-4 text-label text-cyan-primary hover:text-cyan-hover transition-colors">Connect →</Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-screen bg-base flex flex-col items-center justify-center">
        <Loader2 size={24} className="text-cyan-primary animate-spin" />
        <p className="mt-3 text-body-sm text-text-tertiary">Checking ownership...</p>
      </div>
    );
  }

  if (isOwner === false) {
    return (
      <div className="h-screen bg-base flex flex-col items-center justify-center px-6 text-center">
        <AlertTriangle size={32} className="text-warning mb-4" />
        <p className="text-body text-text-secondary">Access denied — not the contract owner</p>
        <p className="text-caption text-text-tertiary mt-2">
          Owner: {ownerAddress ? truncateAddress(ownerAddress, 'evm') : 'unknown'}
        </p>
        <Link to="/home" className="mt-4 text-label text-cyan-primary hover:text-cyan-hover transition-colors">Back to Home →</Link>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-base overflow-hidden">
      {/* Admin sidebar */}
      <motion.aside
        className="hidden md:flex h-screen w-[220px] shrink-0 flex-col bg-white/[0.02] backdrop-blur-md border-r border-white/[0.06]"
        initial={{ x: -220 }}
        animate={{ x: 0 }}
        transition={SPRING}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center h-14 px-4 gap-2 border-b border-white/[0.06]">
          <Shield size={16} className="text-cyan-primary" />
          <span className="font-display text-label text-text-primary font-semibold">Admin</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-label transition-colors active:scale-[0.98]',
                  isActive
                    ? 'bg-white/[0.06] text-text-primary'
                    : 'text-text-secondary hover:bg-white/[0.03] hover:text-text-primary'
                )
              }
            >
              <item.icon size={16} className="shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Back to app */}
        <div className="shrink-0 px-3 py-3 border-t border-white/[0.06]">
          <button
            onClick={() => navigate('/home')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-caption text-text-tertiary hover:text-text-secondary hover:bg-white/[0.03] transition-colors w-full active:scale-[0.98]"
          >
            <ChevronLeft size={14} />
            <span>Back to QFLink</span>
          </button>
        </div>
      </motion.aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {/* Mobile back bar */}
        <div className="md:hidden flex items-center gap-2 h-12 px-4 border-b border-white/[0.06] shrink-0">
          <button onClick={() => navigate('/home')} className="text-text-tertiary hover:text-text-secondary">
            <ChevronLeft size={18} />
          </button>
          <Shield size={14} className="text-cyan-primary" />
          <span className="text-label text-text-primary font-medium">Admin</span>
        </div>
        <Outlet />
      </main>
    </div>
  );
}

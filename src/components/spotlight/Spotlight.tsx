// src/components/spotlight/Spotlight.tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useSpotlightStore } from '@/stores/spotlight';
import { useWalletStore } from '@/stores/wallet';
import { usePodsStore } from '@/stores/pods';
import { resolveQFName } from '@/lib/qns';
import { cn } from '@/lib/utils';

interface SpotlightAction {
  id: string;
  label: string;
  description?: string;
  icon: string; // emoji or single char
  category: 'navigation' | 'action' | 'search';
  onSelect: () => void;
}

export function Spotlight() {
  const { isOpen, close } = useSpotlightStore();
  const { isConnected } = useWalletStore();
  const { pods } = usePodsStore();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        useSpotlightStore.getState().toggle();
      }
      if (e.key === 'Escape' && isOpen) {
        close();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, close]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setResolvedAddress(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // QNS resolution
  useEffect(() => {
    if (!query || !query.includes('.qf')) {
      setResolvedAddress(null);
      return;
    }

    const timeout = setTimeout(async () => {
      setIsResolving(true);
      try {
        const addr = await resolveQFName(query.trim());
        setResolvedAddress(addr);
      } catch {
        setResolvedAddress(null);
      }
      setIsResolving(false);
    }, 400);

    return () => clearTimeout(timeout);
  }, [query]);

  // Build actions list
  const buildActions = useCallback((): SpotlightAction[] => {
    const actions: SpotlightAction[] = [];
    const q = query.toLowerCase().trim();

    // Navigation
    const navItems = [
      { id: 'nav-home', label: 'Home', description: 'Go to dashboard', icon: '⌂', path: '/home' },
      { id: 'nav-explore', label: 'Explore', description: 'Browse pods', icon: '◎', path: '/explore' },
      { id: 'nav-messages', label: 'Messages', description: 'Direct messages', icon: '✉', path: '/messages' },
      { id: 'nav-profile', label: 'Profile', description: 'Your identity', icon: '○', path: '/profile' },
    ];

    if (isConnected) {
      navItems.forEach((item) => {
        if (!q || item.label.toLowerCase().includes(q)) {
          actions.push({
            ...item,
            category: 'navigation',
            onSelect: () => { navigate(item.path); close(); },
          });
        }
      });
    }

    // Pod search
    if (q && pods.length > 0) {
      const matchingPods = pods
        .filter((p) => p.name.toLowerCase().includes(q))
        .slice(0, 3);
      matchingPods.forEach((pod) => {
        actions.push({
          id: `pod-${pod.id}`,
          label: pod.name,
          description: `${pod.memberCount} members · ${pod.category}`,
          icon: '◈',
          category: 'search',
          onSelect: () => { navigate(`/pod/${pod.id}`); close(); },
        });
      });
    }

    // QNS name → DM
    if (resolvedAddress) {
      actions.push({
        id: 'qns-dm',
        label: `Message ${query.trim()}`,
        description: `Open DM with ${resolvedAddress.slice(0, 8)}...`,
        icon: '→',
        category: 'action',
        onSelect: () => { navigate(`/dm/${resolvedAddress}`); close(); },
      });
    }

    // Quick actions
    if (isConnected && (!q || 'new message'.includes(q))) {
      actions.push({
        id: 'action-new-dm',
        label: 'New message',
        description: 'Start a conversation',
        icon: '+',
        category: 'action',
        onSelect: () => { navigate('/messages'); close(); },
      });
    }

    return actions;
  }, [query, isConnected, pods, resolvedAddress, navigate, close]);

  const actions = buildActions();

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, actions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && actions[selectedIndex]) {
      e.preventDefault();
      actions[selectedIndex].onSelect();
    }
  };

  // Reset selection when actions change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            onClick={close}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed top-[20%] inset-x-0 z-[61] flex justify-center px-4"
          >
            <div className="w-full max-w-lg bg-surface-2/80 backdrop-blur-md border border-white/[0.08] rounded-xl overflow-hidden">
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 h-14 border-b border-white/[0.06]">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-text-tertiary shrink-0">
                  <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M12 12L16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search pods, names, or navigate..."
                  className="flex-1 bg-transparent text-body text-text-primary placeholder:text-text-tertiary outline-none"
                />
                <kbd className="hidden md:flex items-center h-6 px-1.5 rounded bg-white/[0.06] text-[11px] text-text-tertiary font-mono">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div className="max-h-72 overflow-y-auto py-2">
                {isResolving && (
                  <div className="px-4 py-3 flex items-center gap-3">
                    <div className="h-4 w-4 border-2 border-border-medium border-t-cyan-primary rounded-full animate-spin" />
                    <span className="text-body-sm text-text-secondary">Resolving {query}...</span>
                  </div>
                )}

                {actions.length === 0 && !isResolving && query && (
                  <div className="px-4 py-8 text-center">
                    <p className="text-body-sm text-text-tertiary">No results for "{query}"</p>
                  </div>
                )}

                {actions.length === 0 && !query && (
                  <div className="px-4 py-3">
                    <p className="text-caption text-text-tertiary mb-3">Quick actions</p>
                    {isConnected ? (
                      <p className="text-body-sm text-text-secondary">Type a pod name, .qf name, or page to navigate</p>
                    ) : (
                      <p className="text-body-sm text-text-secondary">Connect your wallet to access all features</p>
                    )}
                  </div>
                )}

                {actions.map((action, i) => (
                  <button
                    key={action.id}
                    onClick={action.onSelect}
                    onMouseEnter={() => setSelectedIndex(i)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                      i === selectedIndex ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]',
                    )}
                  >
                    <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0">
                      <span className="text-sm text-text-secondary">{action.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-label text-text-primary truncate">{action.label}</p>
                      {action.description && (
                        <p className="text-caption text-text-tertiary truncate">{action.description}</p>
                      )}
                    </div>
                    {i === selectedIndex && (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-text-tertiary shrink-0">
                        <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

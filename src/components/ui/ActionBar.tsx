// src/components/ui/ActionBar.tsx
// Unified command surface — replaces Spotlight.tsx and NewMessageModal.tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useWalletStore } from '@/stores/wallet';
import { usePodsStore } from '@/stores/pods';
import { useModeStore } from '@/stores/mode';
import { resolveQFName } from '@/lib/qns';
import { isValidAddress } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';
import { create } from 'zustand';

// ─── Store ──────────────────────────────────────────────────────────
export interface ActionBarState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export const useActionBarStore = create<ActionBarState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
}));

// ─── Types ──────────────────────────────────────────────────────────
interface ActionResult {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  category: 'people' | 'pods' | 'actions';
  onSelect: () => void;
}

// ─── Inline variant for Messages page ───────────────────────────────
export function ActionBarInline({
  onSelectPerson,
}: {
  onSelectPerson: (address: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // QNS / address resolution
  useEffect(() => {
    setResolvedAddress(null);
    const trimmed = query.trim();
    if (!trimmed) return;

    if (isValidAddress(trimmed)) {
      setResolvedAddress(trimmed.toLowerCase());
      return;
    }

    if (!trimmed.includes('.qf') && !trimmed.endsWith('.qf')) return;

    setIsResolving(true);
    const timer = setTimeout(async () => {
      try {
        const addr = await resolveQFName(trimmed);
        setResolvedAddress(addr);
      } catch {
        setResolvedAddress(null);
      }
      setIsResolving(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (address: string) => {
    onSelectPerson(address);
    setQuery('');
    setResolvedAddress(null);
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-3 h-11 px-4 rounded-xl bg-white/[0.03] border border-white/[0.06] focus-within:border-cyan-border transition-colors">
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          className="text-text-tertiary shrink-0"
        >
          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Message or search..."
          className="flex-1 bg-transparent text-body text-text-primary placeholder:text-text-tertiary outline-none"
        />
        {isResolving && (
          <div className="h-4 w-4 border-2 border-white/[0.10] border-t-cyan-primary rounded-full animate-spin shrink-0" />
        )}
      </div>

      {/* Resolved person dropdown */}
      <AnimatePresence>
        {resolvedAddress && !isResolving && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute left-0 right-0 top-full mt-1 z-10 rounded-lg bg-surface-3/90 backdrop-blur-md border border-white/[0.08] overflow-hidden"
          >
            <button
              onClick={() => handleSelect(resolvedAddress)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors active:scale-[0.98]"
            >
              <Avatar address={resolvedAddress} size={32} />
              <div className="flex-1 min-w-0 text-left">
                <p className="text-label text-text-primary truncate">
                  {query.trim().endsWith('.qf') ? (
                    <>
                      {query.trim().slice(0, -3)}
                      <span className="text-cyan-primary">.qf</span>
                    </>
                  ) : (
                    `${resolvedAddress.slice(0, 6)}...${resolvedAddress.slice(-4)}`
                  )}
                </p>
              </div>
              <span className="text-caption text-cyan-primary">Message →</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Floating overlay variant (⌘K) ────────────────────────────────
export function ActionBar() {
  const { isOpen, close } = useActionBarStore();
  const { isConnected } = useWalletStore();
  const { pods } = usePodsStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global ⌘K handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        useActionBarStore.getState().toggle();
      }
      if (e.key === 'Escape' && isOpen) {
        close();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, close]);

  // Focus + reset on open
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
    setResolvedAddress(null);
    if (!query) return;

    const trimmed = query.trim();
    if (isValidAddress(trimmed)) {
      setResolvedAddress(trimmed.toLowerCase());
      return;
    }
    if (!trimmed.includes('.qf')) return;

    setIsResolving(true);
    const timer = setTimeout(async () => {
      try {
        const addr = await resolveQFName(trimmed);
        setResolvedAddress(addr);
      } catch {
        setResolvedAddress(null);
      }
      setIsResolving(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  // Build results
  const buildResults = useCallback((): ActionResult[] => {
    const results: ActionResult[] = [];
    const q = query.toLowerCase().trim();

    // People — QNS resolved
    if (resolvedAddress) {
      results.push({
        id: 'person-dm',
        label: `Message ${query.trim()}`,
        description: `${resolvedAddress.slice(0, 8)}...`,
        icon: <Avatar address={resolvedAddress} size={24} />,
        category: 'people',
        onSelect: () => {
          navigate(`/dm/${resolvedAddress}`);
          close();
        },
      });
    }

    // Pods
    if (q && pods.length > 0) {
      pods
        .filter((p) => p.name.toLowerCase().includes(q))
        .slice(0, 4)
        .forEach((pod) => {
          results.push({
            id: `pod-${pod.id}`,
            label: pod.name,
            description: `${pod.memberCount} members · ${pod.category}`,
            icon: (
              <div className="w-6 h-6 rounded-full bg-white/[0.06] flex items-center justify-center text-caption font-medium text-text-secondary">
                {pod.name[0]}
              </div>
            ),
            category: 'pods',
            onSelect: () => {
              navigate(`/pod/${pod.id}`);
              close();
            },
          });
        });
    }

    // Context-aware defaults (no query)
    if (!q && isConnected) {
      const page = location.pathname;

      if (page.startsWith('/home') || page === '/home') {
        results.push({
          id: 'jump-messages',
          label: 'Messages',
          description: 'Jump to conversations',
          icon: <IconChat />,
          category: 'actions',
          onSelect: () => { navigate('/messages'); close(); },
        });
        results.push({
          id: 'jump-explore',
          label: 'Explore',
          description: 'Discover pods',
          icon: <IconCompass />,
          category: 'actions',
          onSelect: () => { navigate('/explore'); close(); },
        });
      }
    }

    // Quick actions
    if (isConnected) {
      if (!q || 'create pod'.includes(q) || 'new pod'.includes(q)) {
        results.push({
          id: 'action-create-pod',
          label: 'Create a Pod',
          icon: <IconPlus />,
          category: 'actions',
          onSelect: () => { navigate('/explore'); close(); },
        });
      }
      if (!q || 'instant'.includes(q)) {
        results.push({
          id: 'action-instant',
          label: 'Toggle Instant Mode',
          icon: <span className="text-sm">⚡</span>,
          category: 'actions',
          onSelect: () => {
            const store = useModeStore.getState();
            if (store.instantActive) store.deactivateInstant();
            else store.activateInstant('30m');
            close();
          },
        });
      }
      if (!q || 'privacy'.includes(q)) {
        results.push({
          id: 'action-privacy',
          label: 'Toggle Privacy Mode',
          icon: <span className="text-sm">🔒</span>,
          category: 'actions',
          onSelect: () => {
            useModeStore.getState().togglePrivacy();
            close();
          },
        });
      }
      if (q && 'disconnect'.includes(q)) {
        results.push({
          id: 'action-disconnect',
          label: 'Disconnect',
          description: 'Disconnect wallet',
          icon: <span className="text-sm text-error">⏻</span>,
          category: 'actions',
          onSelect: () => {
            useWalletStore.getState().disconnect();
            navigate('/');
            close();
          },
        });
      }
    }

    // Navigation fallbacks
    if (q) {
      const navItems = [
        { id: 'nav-home', label: 'Home', path: '/home', icon: <IconHome /> },
        { id: 'nav-explore', label: 'Explore', path: '/explore', icon: <IconCompass /> },
        { id: 'nav-messages', label: 'Messages', path: '/messages', icon: <IconChat /> },
        { id: 'nav-profile', label: 'Profile', path: '/profile', icon: <IconProfile /> },
      ];
      navItems
        .filter((n) => n.label.toLowerCase().includes(q))
        .forEach((item) => {
          if (!results.find((r) => r.id === item.id)) {
            results.push({
              ...item,
              category: 'actions',
              onSelect: () => { navigate(item.path); close(); },
            });
          }
        });
    }

    return results;
  }, [query, isConnected, pods, resolvedAddress, navigate, close, location.pathname]);

  const results = buildResults();

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      results[selectedIndex].onSelect();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % Math.max(results.length, 1));
    }
  };

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

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-[20%] inset-x-0 z-[61] flex justify-center px-4"
          >
            <div className="w-full max-w-modal bg-white/[0.04] backdrop-blur-md border border-white/[0.08] rounded-xl overflow-hidden shadow-2xl">
              {/* Input */}
              <div className="flex items-center gap-3 px-4 h-14 border-b border-white/[0.06]">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  className="text-text-tertiary shrink-0"
                >
                  <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M12 12L16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search pods, names, or actions..."
                  className="flex-1 bg-transparent text-body text-text-primary placeholder:text-text-tertiary outline-none"
                />
                {isResolving && (
                  <div className="h-4 w-4 border-2 border-white/[0.10] border-t-cyan-primary rounded-full animate-spin" />
                )}
                <kbd className="hidden md:flex items-center h-6 px-1.5 rounded bg-white/[0.06] text-[11px] text-text-tertiary font-mono">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div className="max-h-72 overflow-y-auto py-2">
                {results.length === 0 && !isResolving && query && (
                  <div className="px-4 py-8 text-center">
                    <p className="text-body-sm text-text-tertiary">
                      No results for "{query}"
                    </p>
                  </div>
                )}

                {results.length === 0 && !query && (
                  <div className="px-4 py-3">
                    <p className="text-caption text-text-tertiary mb-1">
                      Quick actions
                    </p>
                    <p className="text-body-sm text-text-secondary">
                      {isConnected
                        ? 'Type a pod name, .qf name, or action'
                        : 'Connect your wallet to access all features'}
                    </p>
                  </div>
                )}

                {results.map((result, i) => (
                  <button
                    key={result.id}
                    onClick={result.onSelect}
                    onMouseEnter={() => setSelectedIndex(i)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors active:scale-[0.98]',
                      i === selectedIndex
                        ? 'bg-white/[0.04]'
                        : 'hover:bg-white/[0.02]'
                    )}
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0">
                      {result.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-label text-text-primary truncate">
                        {result.label}
                      </p>
                      {result.description && (
                        <p className="text-caption text-text-tertiary truncate">
                          {result.description}
                        </p>
                      )}
                    </div>
                    {i === selectedIndex && (
                      <span className="text-caption text-text-tertiary">↵</span>
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

// ─── Mini icons ─────────────────────────────────────────────────────
function IconHome() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-text-secondary">
      <path d="M2 8L8 2L14 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 7V13H12V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconCompass() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-text-secondary">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 6L7 7L6 10L9 9L10 6Z" fill="currentColor" />
    </svg>
  );
}

function IconChat() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-text-secondary">
      <path d="M2 3H14V11H9L6 14V11H2V3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function IconProfile() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-text-secondary">
      <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 14C2 11.5 4.5 10 8 10C11.5 10 14 11.5 14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-text-secondary">
      <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

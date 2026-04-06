// src/components/pods/PodComposer.tsx
// Design System §15 — 6-beat pod creation with live preview
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CATEGORIES, getCategoryColor } from '@/lib/categories';
import { cn } from '@/lib/utils';

interface PodComposerProps {
  onClose: () => void;
  onLaunch: (data: PodComposerData) => void;
  isLaunching?: boolean;
}

export interface PodComposerData {
  name: string;
  category: string;
  isTokenGated: boolean;
  threshold: number;
  price: number;
  description: string;
}

type Beat = 1 | 2 | 3 | 4 | 5 | 6;

export function PodComposer({ onClose, onLaunch, isLaunching = false }: PodComposerProps) {
  const [beat, setBeat] = useState<Beat>(1);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [isTokenGated, setIsTokenGated] = useState(false);
  const [threshold, setThreshold] = useState(0);
  const [price, setPrice] = useState(0);
  const [description, setDescription] = useState('');

  const canAdvance = () => {
    switch (beat) {
      case 1: return name.trim().length > 0;
      case 2: return category.length > 0;
      case 3: return true;
      case 4: return true;
      case 5: return true;
      case 6: return true;
    }
  };

  const advance = () => {
    if (beat < 6 && canAdvance()) setBeat((beat + 1) as Beat);
  };

  const handleLaunch = () => {
    onLaunch({ name: name.trim(), category, isTokenGated, threshold, price, description: description.trim() });
  };

  const catColor = category ? getCategoryColor(category) : '#06B6D4';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 10 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-surface-3 border border-white/[0.08] rounded-xl w-full max-w-[640px] max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col md:flex-row">
          {/* Left: Composer beats */}
          <div className="flex-1 p-6 flex flex-col items-center justify-center min-h-[300px]">
            <AnimatePresence mode="wait">
              {/* Beat 1 — Name */}
              {beat === 1 && (
                <BeatPanel key="beat-1">
                  <p className="text-caption text-text-tertiary mb-4">Name your pod</p>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value.slice(0, 32))}
                    placeholder="Pod name..."
                    autoFocus
                    className="w-full text-center bg-transparent outline-none font-display text-h1 text-text-primary placeholder:text-text-tertiary"
                    onKeyDown={(e) => e.key === 'Enter' && advance()}
                  />
                </BeatPanel>
              )}

              {/* Beat 2 — Category */}
              {beat === 2 && (
                <BeatPanel key="beat-2">
                  <p className="text-caption text-text-tertiary mb-4">Choose a category</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => { setCategory(cat); setBeat(3); }}
                        className={cn(
                          'h-9 px-4 rounded-pill text-label transition-all active:scale-[0.96]',
                          category === cat
                            ? 'text-white'
                            : 'bg-white/[0.03] border border-white/[0.06] text-text-secondary hover:bg-white/[0.06]'
                        )}
                        style={category === cat ? { backgroundColor: getCategoryColor(cat) } : undefined}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </BeatPanel>
              )}

              {/* Beat 3 — Access */}
              {beat === 3 && (
                <BeatPanel key="beat-3">
                  <p className="text-caption text-text-tertiary mb-4">Who can join?</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setIsTokenGated(false); advance(); }}
                      className={cn(
                        'flex-1 h-12 rounded-xl text-label transition-all active:scale-[0.98]',
                        !isTokenGated ? 'bg-cyan-primary text-text-on-cyan' : 'bg-white/[0.03] border border-white/[0.06] text-text-secondary hover:bg-white/[0.06]'
                      )}
                    >
                      Open to all
                    </button>
                    <button
                      onClick={() => setIsTokenGated(true)}
                      className={cn(
                        'flex-1 h-12 rounded-xl text-label transition-all active:scale-[0.98]',
                        isTokenGated ? 'bg-cyan-primary text-text-on-cyan' : 'bg-white/[0.03] border border-white/[0.06] text-text-secondary hover:bg-white/[0.06]'
                      )}
                    >
                      Token-gated
                    </button>
                  </div>
                  {isTokenGated && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4">
                      <input
                        type="number"
                        value={threshold || ''}
                        onChange={(e) => setThreshold(Number(e.target.value))}
                        placeholder="Minimum QF balance..."
                        className="w-full h-11 rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 text-body text-text-primary placeholder:text-text-tertiary outline-none text-center"
                      />
                      <button onClick={advance} className="mt-3 mx-auto block text-label text-cyan-primary hover:text-cyan-hover active:scale-[0.98]">
                        Continue →
                      </button>
                    </motion.div>
                  )}
                </BeatPanel>
              )}

              {/* Beat 4 — Price */}
              {beat === 4 && (
                <BeatPanel key="beat-4">
                  <p className="text-caption text-text-tertiary mb-4">Entry fee</p>
                  <div className="flex items-center gap-2 justify-center">
                    <input
                      type="number"
                      value={price || ''}
                      onChange={(e) => setPrice(Number(e.target.value))}
                      placeholder="0"
                      autoFocus
                      className="w-24 bg-transparent outline-none font-display text-h1 text-text-primary text-center placeholder:text-text-tertiary"
                      onKeyDown={(e) => e.key === 'Enter' && advance()}
                    />
                    <span className="text-h2 text-text-tertiary">QF</span>
                  </div>
                </BeatPanel>
              )}

              {/* Beat 5 — Description */}
              {beat === 5 && (
                <BeatPanel key="beat-5">
                  <p className="text-caption text-text-tertiary mb-4">Describe your pod (optional)</p>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value.slice(0, 280))}
                    placeholder="What's this pod about..."
                    autoFocus
                    rows={3}
                    className="w-full bg-transparent outline-none text-body text-text-primary placeholder:text-text-tertiary resize-none text-center"
                  />
                  <p className="text-caption text-text-tertiary mt-1">{description.length}/280</p>
                </BeatPanel>
              )}

              {/* Beat 6 — Launch */}
              {beat === 6 && (
                <BeatPanel key="beat-6">
                  <p className="text-caption text-text-tertiary mb-6">Ready to launch</p>
                  <button
                    onClick={handleLaunch}
                    disabled={isLaunching}
                    className="h-12 px-8 rounded-pill bg-cyan-primary text-text-on-cyan text-label font-medium hover:bg-cyan-hover transition-colors active:scale-[0.98] disabled:opacity-50"
                  >
                    {isLaunching ? (
                      <span className="flex items-center gap-2">
                        <div className="h-4 w-4 border-2 border-white/[0.10] border-t-text-on-cyan rounded-full animate-spin" />
                        Launching...
                      </span>
                    ) : (
                      'Launch Pod · 500 QF'
                    )}
                  </button>
                </BeatPanel>
              )}
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex items-center gap-4 mt-6">
              {beat > 1 && (
                <button
                  onClick={() => setBeat((beat - 1) as Beat)}
                  className="text-caption text-text-tertiary hover:text-text-secondary active:scale-[0.98]"
                >
                  ← Back
                </button>
              )}
              {beat < 6 && beat !== 2 && (
                <button
                  onClick={advance}
                  disabled={!canAdvance()}
                  className="text-label text-cyan-primary hover:text-cyan-hover disabled:text-text-tertiary active:scale-[0.98]"
                >
                  Continue →
                </button>
              )}
            </div>
          </div>

          {/* Right: Live preview card */}
          <div className="w-full md:w-[240px] p-6 border-t md:border-t-0 md:border-l border-white/[0.06] flex items-center justify-center">
            <div className="w-full rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
              {/* Preview strip */}
              <div className="h-1" style={{ backgroundColor: catColor }} />
              <div className="p-3">
                {category && (
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-pill text-[10px] font-medium mb-1.5"
                    style={{ backgroundColor: `${catColor}15`, color: catColor }}
                  >
                    {category}
                  </span>
                )}
                <p className="text-label text-text-primary truncate">{name || 'Your pod'}</p>
                {description && (
                  <p className="text-caption text-text-secondary truncate mt-1">{description}</p>
                )}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.04]">
                  <span className="text-[10px] text-text-tertiary">👥 0</span>
                  <span className="text-[10px] text-text-secondary">
                    {price > 0 ? `${price} QF` : 'Free'}
                    {isTokenGated && threshold > 0 ? ` · 🔒 ${threshold}+ QF` : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-text-tertiary hover:text-text-secondary hover:bg-white/[0.04] active:scale-[0.96]"
          aria-label="Close"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </motion.div>
    </motion.div>
  );
}

function BeatPanel({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="w-full text-center"
    >
      {children}
    </motion.div>
  );
}

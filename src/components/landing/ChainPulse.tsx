// src/components/landing/ChainPulse.tsx
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVisibilityPolling } from '@/hooks/useVisibilityPolling';

interface BlockBadge {
  id: number;
  number: number;
}

export function ChainPulse() {
  const [blocks, setBlocks] = useState<BlockBadge[]>([]);
  const [synced, setSynced] = useState(true);
  const blockCounter = useRef(58_196_750);
  const nextId = useRef(0);
  const initialized = useRef(false);

  // Initialize with 5 blocks (once)
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const initial: BlockBadge[] = [];
    for (let i = 0; i < 5; i++) {
      initial.push({ id: nextId.current++, number: blockCounter.current + i });
    }
    blockCounter.current += 5;
    setBlocks(initial);
  }, []);

  // Tick new blocks — pauses when tab hidden, fires immediately on return
  useVisibilityPolling(
    () => {
      if (!initialized.current) return;
      const newBlock: BlockBadge = {
        id: nextId.current++,
        number: blockCounter.current++,
      };
      setBlocks((prev) => [...prev.slice(-4), newBlock]);
    },
    6000,
  );

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Block badges row */}
      <div className="flex items-center gap-2 overflow-hidden">
        <AnimatePresence mode="popLayout">
          {blocks.map((block) => (
            <motion.div
              key={block.id}
              initial={{ opacity: 0, scale: 0.8, x: 40 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: -40 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="relative flex flex-col items-center px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] overflow-hidden"
            >
              <span className="text-[10px] text-text-tertiary font-medium uppercase tracking-wider">
                Block
              </span>
              <span className="text-body-sm text-text-primary font-mono tabular-nums">
                #{block.number.toLocaleString()}
              </span>
              {/* Single shimmer sweep on entry */}
              <motion.span
                initial={{ x: '-100%' }}
                animate={{ x: '200%' }}
                transition={{ duration: 1, delay: 0.2 }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-primary/10 to-transparent pointer-events-none"
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Synced indicator */}
      <div className="flex items-center gap-1.5" role="status" aria-label="Network sync status">
        <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" aria-hidden="true" />
        <span className="text-caption text-text-tertiary">
          Synced to QF Network
        </span>
      </div>
    </div>
  );
}

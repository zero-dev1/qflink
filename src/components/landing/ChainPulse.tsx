// src/components/landing/ChainPulse.tsx
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BlockBadge {
  id: number;
  number: number;
}

export function ChainPulse() {
  const [blocks, setBlocks] = useState<BlockBadge[]>([]);
  const [synced, setSynced] = useState(true);
  const blockCounter = useRef(58_196_750); // Starting block, will be replaced with real data
  const nextId = useRef(0);

  useEffect(() => {
    // Initialize with 5 blocks
    const initial: BlockBadge[] = [];
    for (let i = 0; i < 5; i++) {
      initial.push({ id: nextId.current++, number: blockCounter.current + i });
    }
    blockCounter.current += 5;
    setBlocks(initial);

    // Add new block every 6 seconds (QF Network ~6s block time)
    const interval = setInterval(() => {
      const newBlock: BlockBadge = {
        id: nextId.current++,
        number: blockCounter.current++,
      };
      setBlocks((prev) => [...prev.slice(-4), newBlock]); // Keep last 5
    }, 6000);

    return () => clearInterval(interval);
  }, []);

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
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
        <span className="text-caption text-text-tertiary">
          Synced to QF Network
        </span>
      </div>
    </div>
  );
}

// src/components/home/QnsNudgeCard.tsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';

export function QnsNudgeCard() {
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('qflink-qns-nudge-dismissed') === 'true';
  });

  if (dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem('qflink-qns-nudge-dismissed', 'true');
    setDismissed(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="bg-surface-2 border border-border-subtle border-l-2 border-l-cyan-primary rounded-lg p-4 flex items-center gap-4 relative"
    >
      <div className="flex-1 min-w-0">
        <p className="text-body text-text-primary">
          Claim your <span className="text-cyan-primary">.qf</span> name
        </p>
        <p className="text-body-sm text-text-secondary mt-0.5">
          Get a human-readable identity on QF Network
        </p>
      </div>
      <a
        href="https://dotqf.xyz"
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 h-8 px-4 rounded-md bg-cyan-muted text-cyan-primary text-label font-medium inline-flex items-center hover:bg-cyan-primary hover:text-text-on-cyan transition-colors"
      >
        Get a name
      </a>
      <Button
        variant="icon"
        onClick={handleDismiss}
        className="absolute top-2 right-2"
      >
        ×
      </Button>
    </motion.div>
  );
}

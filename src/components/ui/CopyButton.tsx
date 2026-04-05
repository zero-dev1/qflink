// src/components/ui/CopyButton.tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { copyToClipboard } from '@/lib/utils';
import { useToastStore } from '@/stores/toast';
import { cn } from '@/lib/utils';

interface CopyButtonProps {
  text: string;
  label?: string;       // toast message, e.g. "SS58 address copied"
  className?: string;
}

export function CopyButton({ text, label = 'Copied', className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const addToast = useToastStore((s) => s.addToast);

  const handleCopy = async () => {
    try {
      await copyToClipboard(text);
      setCopied(true);
      addToast('success', label);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      addToast('error', 'Failed to copy');
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'h-8 w-8 rounded-sm flex items-center justify-center',
        'text-text-tertiary hover:text-text-secondary hover:bg-surface-3',
        'transition-colors duration-150',
        className,
      )}
      aria-label="Copy to clipboard"
    >
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.svg
            key="check"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ duration: 0.15 }}
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="text-success"
          >
            <path
              d="M3 8.5L6.5 12L13 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.svg>
        ) : (
          <motion.svg
            key="copy"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ duration: 0.15 }}
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
          >
            <rect
              x="5"
              y="5"
              width="8"
              height="8"
              rx="1.5"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M3 11V3.5C3 2.67 3.67 2 4.5 2H11"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </motion.svg>
        )}
      </AnimatePresence>
    </button>
  );
}

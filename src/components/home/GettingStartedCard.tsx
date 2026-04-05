// src/components/home/GettingStartedCard.tsx
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGettingStartedStore } from '@/stores/gettingStarted';
import { Button } from '@/components/ui/Button';

interface Step {
  key: 'hasConnected' | 'hasJoinedPod' | 'hasSentMessage';
  label: string;
  link: string;
  linkLabel: string;
}

const STEPS: Step[] = [
  { key: 'hasConnected', label: 'Connect your wallet', link: '/connect', linkLabel: 'Connect →' },
  { key: 'hasJoinedPod', label: 'Join a pod', link: '/explore', linkLabel: 'Explore pods →' },
  { key: 'hasSentMessage', label: 'Send a message', link: '/messages', linkLabel: 'Start a conversation →' },
];

export function GettingStartedCard() {
  const { hasConnected, hasJoinedPod, hasSentMessage, dismissed, dismiss, isComplete } =
    useGettingStartedStore();

  if (dismissed || isComplete()) return null;

  const stepState: Record<string, boolean> = { hasConnected, hasJoinedPod, hasSentMessage };

  // Find the first incomplete step for the active CTA
  const firstIncompleteIndex = STEPS.findIndex((s) => !stepState[s.key]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="bg-surface-2 border border-border-subtle rounded-lg p-5 relative"
    >
      {/* Dismiss */}
      <Button
        variant="icon"
        onClick={dismiss}
        className="absolute top-3 right-3"
      >
        ×
      </Button>

      <h3 className="text-h3 font-sans font-semibold text-text-primary mb-4">
        Getting started
      </h3>

      <div className="flex flex-col gap-3">
        {STEPS.map((step, i) => {
          const done = stepState[step.key];
          const isNext = i === firstIncompleteIndex;

          return (
            <div key={step.key} className="flex items-center gap-3">
              {/* Checkmark circle */}
              <div
                className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center ${
                  done
                    ? 'bg-cyan-primary'
                    : 'border border-border-medium'
                }`}
              >
                {done && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2.5 6L5 8.5L9.5 3.5"
                      stroke="#050505"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>

              {/* Label */}
              <div className="flex-1 min-w-0">
                <span
                  className={`text-body ${
                    done ? 'text-text-secondary line-through' : 'text-text-primary'
                  }`}
                >
                  {step.label}
                </span>
                {isNext && !done && (
                  <Link
                    to={step.link}
                    className="ml-2 text-label text-cyan-primary hover:text-cyan-hover transition-colors"
                  >
                    {step.linkLabel}
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-1 bg-surface-3 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-cyan-primary rounded-full"
          initial={{ width: 0 }}
          animate={{
            width: `${
              ([hasConnected, hasJoinedPod, hasSentMessage].filter(Boolean).length / 3) * 100
            }%`,
          }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
    </motion.div>
  );
}

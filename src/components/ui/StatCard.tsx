// src/components/ui/StatCard.tsx
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

interface StatCardProps {
  value: string;
  label: string;
  color?: 'default' | 'success' | 'error' | 'cyan';
  isLoading?: boolean;
  className?: string;
}

const colorMap = {
  default: 'text-text-primary',
  success: 'text-success',
  error: 'text-error',
  cyan: 'text-cyan-primary',
};

export function StatCard({ value, label, color = 'default', isLoading, className }: StatCardProps) {
  if (isLoading) {
    return (
      <div className={cn('text-center', className)}>
        <Skeleton className="h-7 w-16 mx-auto mb-1" />
        <Skeleton className="h-3 w-20 mx-auto" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn('text-center', className)}
    >
      <p className={cn('font-display text-h2', colorMap[color])}>
        {value}
      </p>
      <p className="text-caption text-text-tertiary mt-0.5">{label}</p>
    </motion.div>
  );
}

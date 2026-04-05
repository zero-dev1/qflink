// src/components/ui/BadgePill.tsx
import { cn } from '@/lib/utils';

interface BadgePillProps {
  label: string;
  variant?: 'cyan' | 'success' | 'warning';
  className?: string;
}

const variantStyles = {
  cyan: 'bg-cyan-muted text-cyan-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
};

export function BadgePill({ label, variant = 'cyan', className }: BadgePillProps) {
  return (
    <span
      className={cn(
        'relative inline-flex items-center h-6 px-3 rounded-pill text-caption font-medium overflow-hidden',
        variantStyles[variant],
        className,
      )}
    >
      {label}
      {/* One-time shimmer sweep on mount */}
      <span
        className="absolute inset-0 animate-badge-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent bg-[length:200%_100%] pointer-events-none"
      />
    </span>
  );
}

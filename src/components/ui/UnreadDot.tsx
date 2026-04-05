// src/components/ui/UnreadDot.tsx
import { cn } from '@/lib/utils';

interface UnreadDotProps {
  count?: number;
  showCount?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export function UnreadDot({ count = 0, showCount = false, className, size = 'sm' }: UnreadDotProps) {
  if (count <= 0) return null;

  if (showCount) {
    return (
      <span
        className={cn(
          'inline-flex items-center justify-center rounded-pill bg-cyan-primary text-on-cyan font-medium animate-unread-pulse',
          size === 'sm' ? 'h-[18px] min-w-[18px] px-1 text-[10px]' : 'h-5 min-w-5 px-1.5 text-[11px]',
          className,
        )}
      >
        {count > 99 ? '99+' : count}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-block rounded-full bg-cyan-primary animate-unread-pulse',
        size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5',
        className,
      )}
    />
  );
}

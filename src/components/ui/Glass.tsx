// src/components/ui/Glass.tsx
import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

interface GlassProps extends React.HTMLAttributes<HTMLDivElement> {
  intensity?: 'subtle' | 'medium' | 'strong';
  children: React.ReactNode;
}

const intensityMap = {
  subtle: 'bg-white/[0.02] backdrop-blur-lg border-white/[0.06]',
  medium: 'bg-white/[0.04] backdrop-blur-xl border-white/[0.08]',
  strong: 'bg-white/[0.06] backdrop-blur-2xl border-white/[0.10]',
};

export const Glass = forwardRef<HTMLDivElement, GlassProps>(
  ({ intensity = 'subtle', className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'border rounded-lg',
          intensityMap[intensity],
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Glass.displayName = 'Glass';

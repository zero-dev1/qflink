import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-md bg-surface-2 animate-shimmer bg-[length:200%_100%]",
        "bg-gradient-to-r from-surface-2 via-surface-3 to-surface-2",
        className
      )}
    />
  );
}

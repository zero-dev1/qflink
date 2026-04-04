import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import * as jdenticon from "jdenticon";

interface AvatarProps {
  address: string;
  size?: 24 | 32 | 48 | 80;
  className?: string;
}

const pxMap = { 24: "h-6 w-6", 32: "h-8 w-8", 48: "h-12 w-12", 80: "h-20 w-20" };

export function Avatar({ address, size = 32, className }: AvatarProps) {
  const svgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (svgRef.current && address) {
      svgRef.current.innerHTML = jdenticon.toSvg(address, size);
    }
  }, [address, size]);

  return (
    <div
      ref={svgRef}
      className={cn(
        "rounded-full border border-border-subtle overflow-hidden shrink-0 bg-surface-2",
        pxMap[size],
        className
      )}
    />
  );
}

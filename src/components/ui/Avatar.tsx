import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import * as jdenticon from "jdenticon";
import { resolveAvatar } from "@/lib/qns";

interface AvatarProps {
  address: string;
  size?: 24 | 32 | 48 | 80;
  className?: string;
}

const pxMap = { 24: "h-6 w-6", 32: "h-8 w-8", 48: "h-12 w-12", 80: "h-20 w-20" };

// Module-level cache so resolved URLs persist across mounts
const resolvedUrls = new Map<string, string | null>();

export function Avatar({ address, size = 32, className }: AvatarProps) {
  const svgRef = useRef<HTMLDivElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() => resolvedUrls.get(address.toLowerCase()) ?? null);
  const [imgError, setImgError] = useState(false);

  // Resolve QNS avatar URL
  useEffect(() => {
    if (!address) return;
    const lower = address.toLowerCase();

    // Already resolved (including null = no avatar)
    if (resolvedUrls.has(lower)) {
      setAvatarUrl(resolvedUrls.get(lower)!);
      return;
    }

    let cancelled = false;
    resolveAvatar(lower).then((url) => {
      resolvedUrls.set(lower, url);
      if (!cancelled) setAvatarUrl(url);
    }).catch(() => {
      resolvedUrls.set(lower, null);
    });
    return () => { cancelled = true; };
  }, [address]);

  // Jdenticon fallback
  useEffect(() => {
    if (svgRef.current && address && (!avatarUrl || imgError)) {
      svgRef.current.innerHTML = jdenticon.toSvg(address, size);
    }
  }, [address, size, avatarUrl, imgError]);

  // If we have a valid avatar URL, render an image
  if (avatarUrl && !imgError) {
    return (
      <img
        src={avatarUrl}
        alt=""
        onError={() => setImgError(true)}
        className={cn(
          "rounded-full border border-border-subtle overflow-hidden shrink-0 bg-surface-2 object-cover",
          pxMap[size],
          className
        )}
      />
    );
  }

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

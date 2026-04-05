// src/components/home/PodListItem.tsx
import { Link } from 'react-router-dom';
import { formatTimestamp } from '@/lib/utils';

interface PodListItemProps {
  podId: number;
  name: string;
  category: string;
  memberCount: number;
  lastMessage?: string;
  lastMessageTime?: number;
}

export function PodListItem({
  podId,
  name,
  category,
  memberCount,
  lastMessage,
  lastMessageTime,
}: PodListItemProps) {
  return (
    <Link
      to={`/pod/${podId}`}
      className="flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-surface-2 transition-colors duration-150"
    >
      {/* Pod icon — category-based color dot */}
      <div className="w-10 h-10 rounded-lg bg-surface-3 flex items-center justify-center shrink-0">
        <span className="text-body-sm text-text-secondary">
          {category.charAt(0).toUpperCase()}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        {/* Name row */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-label text-text-primary truncate">{name}</p>
          {lastMessageTime && lastMessageTime > 0 ? (
            <span className="text-caption text-text-tertiary shrink-0">
              {formatTimestamp(lastMessageTime)}
            </span>
          ) : null}
        </div>

        {/* Preview row */}
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className="text-body-sm text-text-secondary truncate">
            {lastMessage || `${memberCount} members`}
          </p>
        </div>
      </div>
    </Link>
  );
}

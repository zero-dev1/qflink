// src/pages/Messages.tsx
// Design System §16 — No "Messages" title. ActionBar inline at top.
import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useWalletStore } from '@/stores/wallet';
import { useMessagesStore } from '@/stores/messages';
import { useUnreadStore } from '@/stores/unread';
import { useVisibilityPolling } from '@/hooks/useVisibilityPolling';
import { ConversationRow } from '@/components/messages/ConversationRow';
import { ActionBarInline } from '@/components/ui/ActionBar';
import { Skeleton } from '@/components/ui/Skeleton';
import { ProfileSheet } from '@/components/ui/ProfileSheet';

export default function Messages() {
  const navigate = useNavigate();
  const { isConnected } = useWalletStore();
  const conversations = useMessagesStore((s) => s.conversations);
  const isLoadingConversations = useMessagesStore((s) => s.isLoadingConversations);
  const [profileSheetAddress, setProfileSheetAddress] = useState<string | null>(null);


  // Disconnected state
  if (!isConnected) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-6 text-center">
        <p className="text-body text-text-secondary">Connect your wallet to view messages</p>
        <Link to="/connect" className="mt-4 text-label text-cyan-primary hover:text-cyan-hover transition-colors">
          Connect →
        </Link>
      </div>
    );
  }

  if (isLoadingConversations) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-content px-6 md:px-8 py-6">
          <Skeleton className="h-11 w-full rounded-xl mb-4" />
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-content px-6 md:px-8 py-6">
        {/* §16.1 — ActionBar inline at top */}
        <ActionBarInline
          onSelectPerson={(address) => navigate(`/dm/${address.toLowerCase()}`)}
        />

        {/* Conversation list */}
        <div className="mt-4">
          {conversations.length > 0 ? (
            <div className="flex flex-col gap-0.5">
              {conversations.map((conv) => (
                <ConversationRow
                  key={conv.address}
                  conversation={conv}
                  onClick={() => navigate(`/dm/${conv.address}`)}
                  onAvatarTap={(addr) => setProfileSheetAddress(addr)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl bg-white/[0.02] border border-dashed border-white/[0.08] p-12 text-center mt-8">
              <p className="text-body text-text-secondary">
                Your conversations will appear here.
              </p>
              <p className="mt-2 text-body-sm text-text-tertiary">
                Type a .qf name above to start.
              </p>
            </div>
          )}
        </div>

        {/* §11 — Avatar-as-portal */}
        {profileSheetAddress && (
          <ProfileSheet
            address={profileSheetAddress}
            isOpen={!!profileSheetAddress}
            onClose={() => setProfileSheetAddress(null)}
          />
        )}
      </div>
    </div>
  );
}

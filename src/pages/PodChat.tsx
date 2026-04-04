import { useParams, Link } from "react-router-dom";
import { useWalletStore } from "@/stores/wallet";

export default function PodChat() {
  const { id } = useParams<{ id: string }>();
  const { isConnected } = useWalletStore();

  if (!isConnected) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <p className="text-body text-text-secondary">Connect your wallet to view this pod</p>
        <Link to="/connect" className="mt-4 text-label text-cyan-primary hover:text-cyan-hover transition-colors">
          Connect →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-14 px-6 flex items-center border-b border-border-subtle shrink-0">
        <h2 className="font-display text-h2 text-text-primary">Pod {id}</h2>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <p className="text-body-sm text-text-tertiary text-center">Messages will appear here</p>
      </div>

      {/* Chat input */}
      <div className="px-6 py-3 border-t border-border-subtle shrink-0">
        <div className="h-12 rounded-md bg-surface-2 border border-border-medium px-4 flex items-center">
          <span className="text-body text-text-tertiary">Message Pod {id}...</span>
        </div>
      </div>
    </div>
  );
}

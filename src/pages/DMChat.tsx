import { useParams, Link } from "react-router-dom";
import { useWalletStore } from "@/stores/wallet";

export default function DMChat() {
  const { address } = useParams<{ address: string }>();
  const { isConnected } = useWalletStore();

  if (!isConnected) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <p className="text-body text-text-secondary">Connect your wallet to view this conversation</p>
        <Link to="/connect" className="mt-4 text-label text-cyan-primary hover:text-cyan-hover transition-colors">
          Connect →
        </Link>
      </div>
    );
  }

  const short = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Unknown";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-14 px-6 flex items-center gap-3 border-b border-border-subtle shrink-0">
        <Link to="/messages" className="text-text-secondary hover:text-text-primary transition-colors">
          ←
        </Link>
        <h2 className="font-display text-h2 text-text-primary">{short}</h2>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 flex items-center justify-center">
        <p className="text-body-sm text-text-tertiary">
          This is the beginning of your conversation with {short}
        </p>
      </div>

      {/* Chat input */}
      <div className="px-6 py-3 border-t border-border-subtle shrink-0">
        <div className="h-12 rounded-md bg-surface-2 border border-border-medium px-4 flex items-center">
          <span className="text-body text-text-tertiary">Message {short}...</span>
        </div>
      </div>
    </div>
  );
}

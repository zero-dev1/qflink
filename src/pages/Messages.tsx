import { useWalletStore } from "@/stores/wallet";
import { Link } from "react-router-dom";

export default function Messages() {
  const { isConnected } = useWalletStore();

  if (!isConnected) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <p className="text-body text-text-secondary">Connect your wallet to view messages</p>
        <Link to="/connect" className="mt-4 text-label text-cyan-primary hover:text-cyan-hover transition-colors">
          Connect →
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-content mx-auto px-6 md:px-8 py-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-h1 text-text-primary">Messages</h1>
        <button className="text-label text-cyan-primary hover:text-cyan-hover transition-colors">
          + New message
        </button>
      </div>

      <div className="mt-6 rounded-lg bg-surface-2 border border-border-subtle p-6 text-center">
        <p className="text-body text-text-secondary">No conversations yet</p>
        <p className="mt-2 text-body-sm text-text-tertiary">
          Start a conversation by sending a message to any .qf name or address
        </p>
      </div>
    </div>
  );
}

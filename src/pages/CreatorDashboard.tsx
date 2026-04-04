import { useParams, Link } from "react-router-dom";
import { useWalletStore } from "@/stores/wallet";

export default function CreatorDashboard() {
  const { podId } = useParams<{ podId: string }>();
  const { isConnected } = useWalletStore();

  if (!isConnected) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <p className="text-body text-text-secondary">Connect your wallet to manage your pod</p>
        <Link to="/connect" className="mt-4 text-label text-cyan-primary hover:text-cyan-hover transition-colors">
          Connect →
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-content mx-auto px-6 md:px-8 py-8">
      <Link to={`/pod/${podId}`} className="text-label text-cyan-primary hover:text-cyan-hover transition-colors">
        ← Back to Pod {podId}
      </Link>

      <div className="mt-6 rounded-lg bg-surface-2 border border-border-subtle p-6">
        <h1 className="font-display text-h1 text-text-primary">Creator Dashboard</h1>
        <p className="mt-2 text-body text-text-secondary">
          Pod management and revenue details will appear here
        </p>
      </div>
    </div>
  );
}

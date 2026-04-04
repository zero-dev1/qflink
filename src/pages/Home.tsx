import { useWalletStore } from "@/stores/wallet";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/Skeleton";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function Home() {
  const { isConnected, qnsName, evmAddress } = useWalletStore();

  const displayName = qnsName
    ? (<>{qnsName.replace(".qf", "")}<span className="text-cyan-primary">.qf</span></>)
    : evmAddress
    ? `${evmAddress.slice(0, 6)}...${evmAddress.slice(-4)}` 
    : "";

  if (!isConnected) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-h1 text-text-primary">Welcome to QFLink</h1>
        <p className="mt-2 text-body text-text-secondary">Connect your wallet to get started</p>
        <Link
          to="/connect"
          className="mt-6 h-10 px-6 rounded-md bg-cyan-primary text-text-on-cyan text-label font-medium inline-flex items-center hover:bg-cyan-hover transition-colors"
        >
          Connect Wallet
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-content mx-auto px-6 md:px-8 py-8">
      <h1 className="font-display text-h1 text-text-primary">
        {getGreeting()}, {displayName}
      </h1>

      {/* Your Pods — placeholder */}
      <section className="mt-8">
        <h2 className="font-display text-h2 text-text-primary">Your Pods</h2>
        <div className="mt-4 rounded-lg bg-surface-2 border border-border-subtle p-6 text-center">
          <p className="text-body text-text-secondary">You haven't joined any pods yet</p>
          <Link to="/explore" className="mt-3 inline-flex text-label text-cyan-primary hover:text-cyan-hover transition-colors">
            Explore pods →
          </Link>
        </div>
      </section>

      {/* Recent Messages — placeholder */}
      <section className="mt-8">
        <h2 className="font-display text-h2 text-text-primary">Recent Messages</h2>
        <div className="mt-4 rounded-lg bg-surface-2 border border-border-subtle p-6 text-center">
          <p className="text-body text-text-secondary">No messages yet</p>
          <Link to="/messages" className="mt-3 inline-flex text-label text-cyan-primary hover:text-cyan-hover transition-colors">
            Start a conversation →
          </Link>
        </div>
      </section>
    </div>
  );
}

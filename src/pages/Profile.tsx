import { useWalletStore } from "@/stores/wallet";
import { Avatar } from "@/components/ui/Avatar";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/Skeleton";

export default function Profile() {
  const { isConnected, qnsName, evmAddress, address, balance } = useWalletStore();

  if (!isConnected) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <p className="text-body text-text-secondary">Connect your wallet to view your profile</p>
        <Link to="/connect" className="mt-4 text-label text-cyan-primary hover:text-cyan-hover transition-colors">
          Connect →
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-content mx-auto px-6 md:px-8 py-8">
      {/* Identity card */}
      <div className="rounded-lg bg-surface-2 border border-border-subtle p-6 flex items-start gap-5">
        <Avatar address={evmAddress || ""} size={80} />
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-h1 text-text-primary">
            {qnsName ? (
              <>{qnsName.replace(".qf", "")}<span className="text-cyan-primary">.qf</span></>
            ) : (
              evmAddress ? `${evmAddress.slice(0, 6)}...${evmAddress.slice(-4)}` : "—"
            )}
          </h1>
          {!qnsName && (
            <a
              href="https://dotqf.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex text-label text-cyan-primary hover:text-cyan-hover transition-colors"
            >
              Claim your .qf name →
            </a>
          )}
        </div>
      </div>

      {/* Addresses card */}
      <div className="mt-4 rounded-lg bg-surface-2 border border-border-subtle p-6">
        <h2 className="font-display text-h2 text-text-primary mb-4">Addresses</h2>
        <div className="space-y-3">
          <div>
            <p className="text-caption text-text-tertiary">Substrate (SS58)</p>
            <p className="text-mono text-text-secondary truncate">{address || "—"}</p>
          </div>
          <div>
            <p className="text-caption text-text-tertiary">EVM (Derived)</p>
            <p className="text-mono text-text-secondary truncate">{evmAddress || "—"}</p>
          </div>
        </div>
      </div>

      {/* Stats card */}
      <div className="mt-4 rounded-lg bg-surface-2 border border-border-subtle p-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="font-display text-h2 text-text-primary">
              {(balance / BigInt(10 ** 18)).toLocaleString()}
            </p>
            <p className="text-caption text-text-tertiary">Balance (QF)</p>
          </div>
          <div>
            <p className="font-display text-h2 text-text-primary">—</p>
            <p className="text-caption text-text-tertiary">Pods Joined</p>
          </div>
          <div>
            <p className="font-display text-h2 text-text-primary">—</p>
            <p className="text-caption text-text-tertiary">Pods Created</p>
          </div>
        </div>
      </div>
    </div>
  );
}

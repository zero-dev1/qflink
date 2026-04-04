import { useWalletStore } from "@/stores/wallet";
import { Skeleton } from "@/components/ui/Skeleton";

export default function Explore() {
  const { isConnected } = useWalletStore();

  return (
    <div className="max-w-content-wide mx-auto px-6 md:px-8 py-8">
      <h1 className="font-display text-h1 text-text-primary">Explore</h1>

      {/* Search bar placeholder */}
      <div className="mt-6 h-11 rounded-md bg-surface-2 border border-border-medium px-4 flex items-center">
        <span className="text-text-tertiary text-body">Search pods...</span>
      </div>

      {/* Official section placeholder */}
      <section className="mt-8">
        <h2 className="font-display text-h2 text-text-primary">Official</h2>
        <p className="text-caption text-text-tertiary">by QF Network</p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg bg-surface-2 border border-border-subtle p-5">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="mt-3 h-4 w-full" />
              <Skeleton className="mt-1 h-4 w-2/3" />
            </div>
          ))}
        </div>
      </section>

      {/* Community section placeholder */}
      <section className="mt-8">
        <h2 className="font-display text-h2 text-text-primary">Community</h2>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg bg-surface-2 border border-border-subtle p-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="mt-2 h-3 w-full" />
              <Skeleton className="mt-1 h-3 w-1/2" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

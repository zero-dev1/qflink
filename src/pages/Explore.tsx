import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { usePodsStore, PodData } from '@/stores/pods';
import { useWalletStore } from '@/stores/wallet';
import { useToastStore } from '@/stores/toast';
import { PodCard } from '@/components/pods/PodCard';
import { PodDetailModal } from '@/components/pods/PodDetailModal';
import { Skeleton } from '@/components/ui/Skeleton';

export default function Explore() {
  const navigate = useNavigate();
  const { isConnected } = useWalletStore();
  const { 
    pods, 
    userPodIds, 
    isLoadingPods, 
    isJoining, 
    fetchPods, 
    fetchUserPods, 
    joinPod,
    isUserMember 
  } = usePodsStore();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedPod, setSelectedPod] = useState<PodData | null>(null);

  // Fetch data on mount
  useEffect(() => {
    fetchPods();
    if (isConnected) {
      fetchUserPods();
    }
  }, [fetchPods, fetchUserPods, isConnected]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter pods
  const filteredPods = useMemo(() => {
    if (!debouncedQuery) return pods;
    
    const query = debouncedQuery.toLowerCase();
    return pods.filter(pod => 
      pod.name.toLowerCase().includes(query) ||
      pod.description.toLowerCase().includes(query) ||
      pod.category.toLowerCase().includes(query)
    );
  }, [pods, debouncedQuery]);

  // Split into official and community
  const { officialPods, communityPods } = useMemo(() => {
    const sorted = [...filteredPods].sort((a, b) => Number(a.id) - Number(b.id));
    return {
      officialPods: sorted.slice(0, 3),
      communityPods: sorted.slice(3)
    };
  }, [filteredPods]);

  const handleJoin = async () => {
    if (!selectedPod) return;
    
    const success = await joinPod(Number(selectedPod.id));
    if (success) {
      navigate(`/pod/${selectedPod.id}`);
    }
  };

  const handleEnter = () => {
    if (!selectedPod) return;
    navigate(`/pod/${selectedPod.id}`);
  };

  return (
    <div className="max-w-content-wide mx-auto px-6 md:px-8 py-8">
      <h1 className="font-display text-h1 text-text-primary">Explore</h1>

      {/* Search bar */}
      <input
        type="text"
        placeholder="Search pods..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="mt-6 h-11 w-full rounded-md bg-surface-2 border border-border-medium px-4 text-body text-text-primary placeholder:text-text-tertiary outline-none focus:border-cyan-border transition-colors"
      />

      {/* Official section */}
      <section className="mt-8">
        <h2 className="font-display text-h2 text-text-primary">Official</h2>
        <p className="text-caption text-text-tertiary">by QF Network</p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {isLoadingPods ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="rounded-lg bg-surface-2 border border-border-subtle p-5">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="mt-3 h-4 w-full" />
                <Skeleton className="mt-1 h-4 w-2/3" />
              </div>
            ))
          ) : officialPods.length > 0 ? (
            officialPods.map((pod) => (
              <PodCard
                key={pod.id}
                pod={pod}
                isOfficial
                onClick={() => setSelectedPod(pod)}
              />
            ))
          ) : (
            !isLoadingPods && debouncedQuery && (
              <p className="text-body text-text-secondary col-span-3 text-center">
                No official pods found
              </p>
            )
          )}
        </div>
      </section>

      {/* Community section */}
      <section className="mt-8">
        <h2 className="font-display text-h2 text-text-primary">Community</h2>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {isLoadingPods ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="rounded-lg bg-surface-2 border border-border-subtle p-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="mt-2 h-3 w-full" />
                <Skeleton className="mt-1 h-3 w-1/2" />
              </div>
            ))
          ) : communityPods.length > 0 ? (
            communityPods.map((pod) => (
              <PodCard
                key={pod.id}
                pod={pod}
                onClick={() => setSelectedPod(pod)}
              />
            ))
          ) : (
            !isLoadingPods && (
              <p className="text-body text-text-secondary col-span-3 text-center mt-8">
                {debouncedQuery ? "No pods found" : "No community pods available"}
              </p>
            )
          )}
        </div>
      </section>

      {/* Modal */}
      <AnimatePresence>
        {selectedPod && (
          <PodDetailModal
            pod={selectedPod}
            onClose={() => setSelectedPod(null)}
            isConnected={isConnected}
            isUserMember={isUserMember(Number(selectedPod.id))}
            isJoining={isJoining === Number(selectedPod.id)}
            onJoin={handleJoin}
            onEnter={handleEnter}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

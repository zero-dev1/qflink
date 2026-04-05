import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
    podFetchError,
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

  // Error state handling
  if (podFetchError && !isLoadingPods) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <p className="text-body text-text-secondary">Failed to load pods</p>
        <button
          onClick={() => fetchPods()}
          className="mt-4 text-label text-cyan-primary hover:text-cyan-hover transition-colors"
        >
          Try again →
        </button>
      </div>
    );
  }

  return (
    <>
      {isLoadingPods ? (
      <div className="h-full overflow-y-auto">
        <div className="max-w-content-wide mx-auto px-4 md:px-8 py-8">
          <Skeleton className="h-10 w-full rounded-default mb-6" /> {/* search bar */}
          <Skeleton className="h-6 w-32 mb-4" /> {/* section title */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-48 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
      ) : (
      <div className="h-full overflow-y-auto">
        <div className="max-w-content-wide mx-auto px-6 md:px-8 py-8">
          <h1 className="font-display text-h1 text-text-primary">Explore</h1>

          {/* Search bar */}
          <input
            type="text"
            placeholder="Search pods..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
            className="mt-6 h-10 w-full rounded-default bg-surface-2 border border-border-medium px-4 text-body text-text-primary placeholder:text-text-tertiary focus:border-cyan-primary focus:outline-none transition-colors"
          />

          {/* Official section */}
          <section className="mt-8">
            <h2 className="font-display text-h2 text-text-primary">Official</h2>
            <p className="text-caption text-text-tertiary">by QF Network</p>
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.05 } },
              }}
              className="mt-4 flex md:grid md:grid-cols-3 gap-4 overflow-x-auto md:overflow-visible snap-x snap-mandatory pb-4 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0"
            >
              {officialPods.length > 0 ? (
                officialPods.map((pod) => (
                  <motion.div
                    key={pod.id}
                    variants={{
                      hidden: { opacity: 0, y: 12 },
                      visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
                    }}
                    className="snap-start shrink-0 w-[300px] md:w-auto"
                  >
                    <PodCard
                      pod={pod}
                      isOfficial
                      onClick={() => setSelectedPod(pod)}
                    />
                  </motion.div>
                ))
              ) : (
                debouncedQuery && (
                  <p className="text-body text-text-secondary md:col-span-3 text-center">
                    No official pods found
                  </p>
                )
              )}
            </motion.div>
          </section>

          {/* Community section */}
          <section className="mt-8">
            <h2 className="font-display text-h2 text-text-primary">Community</h2>
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.05 } },
              }}
              className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {communityPods.length > 0 ? (
                communityPods.map((pod) => (
                  <motion.div
                    key={pod.id}
                    variants={{
                      hidden: { opacity: 0, y: 12 },
                      visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
                    }}
                  >
                    <PodCard
                      pod={pod}
                      onClick={() => setSelectedPod(pod)}
                    />
                  </motion.div>
                ))
              ) : (
                !debouncedQuery && (
                  <p className="text-body text-text-secondary md:col-span-3 text-center mt-8">
                    No community pods available
                  </p>
                )
              )}
            </motion.div>
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
      </div>
      )}
    </>
  );
}

import { create } from "zustand";
import { watchConnectionStatus, getClient } from "@/lib/papiClient";

export interface NetworkState {
  connectionStatus: "connected" | "connecting" | "disconnected";
  latestBlock: number;
  latestBlockTime: number;
  isHealthy: boolean;
  setConnectionStatus: (status: "connected" | "connecting" | "disconnected") => void;
  setBlockInfo: (block: number, time: number) => void;
  setHealthy: (healthy: boolean) => void;
  startSubscriptions: () => () => void;
}

export const useNetworkStore = create<NetworkState>((set, get) => ({
  connectionStatus: "connecting",
  latestBlock: 0,
  latestBlockTime: 0,
  isHealthy: false,

  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setBlockInfo: (block, time) => set({ latestBlock: block, latestBlockTime: time, isHealthy: true }),
  setHealthy: (healthy) => set({ isHealthy: healthy }),

  startSubscriptions: () => {
    // Connection health
    const unsubHealth = watchConnectionStatus((connected) => {
      set({ connectionStatus: connected ? "connected" : "disconnected", isHealthy: connected });
    });

    // Best block tracking
    const client = getClient();
    const blockSub = client.bestBlocks$.subscribe({
      next(blocks) {
        if (blocks.length > 0) {
          set({ latestBlock: blocks[0].number, latestBlockTime: Date.now(), isHealthy: true });
        }
      },
      error() {
        set({ isHealthy: false });
      },
    });

    return () => {
      unsubHealth();
      blockSub.unsubscribe();
    };
  },
}));

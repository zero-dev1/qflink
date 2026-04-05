// src/stores/unread.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LastSeen {
  [key: string]: number; // key = podId or dm address, value = timestamp of last message seen
}

interface UnreadState {
  // Persisted
  lastSeenPod: LastSeen;      // podId -> timestamp of newest message user has seen
  lastSeenDM: LastSeen;       // address -> timestamp of newest message user has seen

  // Transient (computed on fetch)
  unreadPodCounts: Record<string, number>;   // podId -> unread count
  unreadDMCounts: Record<string, number>;    // address -> unread count

  // Actions
  markPodSeen: (podId: string) => void;
  markDMSeen: (address: string) => void;
  updatePodUnread: (podId: string, latestTimestamp: number, totalNew: number) => void;
  updateDMUnread: (address: string, latestTimestamp: number, totalNew: number) => void;

  // Getters
  getTotalUnreadDMs: () => number;
  getTotalUnreadPods: () => number;
  hasPodUnread: (podId: string) => boolean;
  hasDMUnread: (address: string) => boolean;
  getPodUnreadCount: (podId: string) => number;
  getDMUnreadCount: (address: string) => number;
}

export const useUnreadStore = create<UnreadState>()(
  persist(
    (set, get) => ({
      lastSeenPod: {},
      lastSeenDM: {},
      unreadPodCounts: {},
      unreadDMCounts: {},

      markPodSeen: (podId: string) => {
        set((state) => ({
          lastSeenPod: { ...state.lastSeenPod, [podId]: Date.now() },
          unreadPodCounts: { ...state.unreadPodCounts, [podId]: 0 },
        }));
      },

      markDMSeen: (address: string) => {
        const normalized = address.toLowerCase();
        set((state) => ({
          lastSeenDM: { ...state.lastSeenDM, [normalized]: Date.now() },
          unreadDMCounts: { ...state.unreadDMCounts, [normalized]: 0 },
        }));
      },

      updatePodUnread: (podId: string, latestTimestamp: number, totalNew: number) => {
        const lastSeen = get().lastSeenPod[podId] || 0;
        if (latestTimestamp > lastSeen) {
          set((state) => ({
            unreadPodCounts: { ...state.unreadPodCounts, [podId]: totalNew },
          }));
        }
      },

      updateDMUnread: (address: string, latestTimestamp: number, totalNew: number) => {
        const normalized = address.toLowerCase();
        const lastSeen = get().lastSeenDM[normalized] || 0;
        if (latestTimestamp > lastSeen) {
          set((state) => ({
            unreadDMCounts: { ...state.unreadDMCounts, [normalized]: totalNew },
          }));
        }
      },

      getTotalUnreadDMs: () => {
        return Object.values(get().unreadDMCounts).reduce((sum, count) => sum + count, 0);
      },

      getTotalUnreadPods: () => {
        return Object.values(get().unreadPodCounts).reduce((sum, count) => sum + count, 0);
      },

      hasPodUnread: (podId: string) => (get().unreadPodCounts[podId] || 0) > 0,
      hasDMUnread: (address: string) => (get().unreadDMCounts[address.toLowerCase()] || 0) > 0,
      getPodUnreadCount: (podId: string) => get().unreadPodCounts[podId] || 0,
      getDMUnreadCount: (address: string) => get().unreadDMCounts[address.toLowerCase()] || 0,
    }),
    {
      name: 'qflink-unread',
      partialize: (state) => ({
        lastSeenPod: state.lastSeenPod,
        lastSeenDM: state.lastSeenDM,
      }),
    }
  )
);

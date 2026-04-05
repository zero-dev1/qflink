// src/stores/gettingStarted.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GettingStartedState {
  hasConnected: boolean;
  hasJoinedPod: boolean;
  hasSentMessage: boolean;
  dismissed: boolean;

  markStep: (step: 'hasConnected' | 'hasJoinedPod' | 'hasSentMessage') => void;
  dismiss: () => void;
  isComplete: () => boolean;
}

export const useGettingStartedStore = create<GettingStartedState>()(
  persist(
    (set, get) => ({
      hasConnected: false,
      hasJoinedPod: false,
      hasSentMessage: false,
      dismissed: false,

      markStep: (step) => set({ [step]: true }),
      dismiss: () => set({ dismissed: true }),
      isComplete: () => {
        const { hasConnected, hasJoinedPod, hasSentMessage } = get();
        return hasConnected && hasJoinedPod && hasSentMessage;
      },
    }),
    {
      name: 'qflink-getting-started',
      version: 1,
    }
  )
);

// src/stores/mode.ts
import { create } from 'zustand';

export type InstantDuration = '5m' | '30m' | '2h' | '24h';

const DURATION_MS: Record<InstantDuration, number> = {
  '5m': 5 * 60 * 1000,
  '30m': 30 * 60 * 1000,
  '2h': 2 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
};

interface ModeState {
  // Instant mode
  instantActive: boolean;
  instantExpiresAt: number | null; // timestamp
  instantDuration: InstantDuration | null;

  // Privacy mode
  privacyActive: boolean;

  // Actions
  activateInstant: (duration: InstantDuration) => void;
  deactivateInstant: () => void;
  togglePrivacy: () => void;

  // Derived
  getInstantRemaining: () => number; // ms remaining, 0 if expired
  isInstantExpired: () => boolean;
}

export const useModeStore = create<ModeState>((set, get) => ({
  instantActive: false,
  instantExpiresAt: null,
  instantDuration: null,
  privacyActive: false,

  activateInstant: (duration) => {
    const expiresAt = Date.now() + DURATION_MS[duration];
    set({
      instantActive: true,
      instantExpiresAt: expiresAt,
      instantDuration: duration,
    });
  },

  deactivateInstant: () => {
    set({
      instantActive: false,
      instantExpiresAt: null,
      instantDuration: null,
    });
  },

  togglePrivacy: () => {
    set((s) => ({ privacyActive: !s.privacyActive }));
  },

  getInstantRemaining: () => {
    const { instantExpiresAt } = get();
    if (!instantExpiresAt) return 0;
    return Math.max(0, instantExpiresAt - Date.now());
  },

  isInstantExpired: () => {
    const { instantActive, instantExpiresAt } = get();
    if (!instantActive || !instantExpiresAt) return false;
    return Date.now() >= instantExpiresAt;
  },
}));

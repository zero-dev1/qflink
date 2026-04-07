// src/stores/mode.ts
import { create } from 'zustand';

export type InstantDuration = '5m' | '1h' | '24h';

export const INSTANT_OPTIONS: { key: InstantDuration; label: string }[] = [
  { key: '5m', label: '5 min' },
  { key: '1h', label: '1 hour' },
  { key: '24h', label: '24 hrs' },
];

const DURATION_MS: Record<InstantDuration, number> = {
  '5m': 5 * 60 * 1000,
  '1h': 60 * 60 * 1000,
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

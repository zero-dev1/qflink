// src/lib/feedback.ts

/**
 * Trigger haptic feedback on supported devices.
 * Pattern: array of milliseconds [vibrate, pause, vibrate, ...]
 */
export function haptic(pattern: number | number[] = 10): void {
  try {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  } catch {
    // Silent fail — not all browsers support vibrate
  }
}

/** Short buzz for success (connect, join, send) */
export function hapticSuccess(): void {
  haptic([10, 30, 10]);
}

/** Single short buzz for general feedback */
export function hapticTap(): void {
  haptic(8);
}

/** Longer buzz for errors */
export function hapticError(): void {
  haptic([30, 20, 30]);
}

/**
 * Play a subtle success chime via Web Audio API.
 * 100ms sine wave at 880Hz, volume 0.08 (barely audible).
 * No-op if AudioContext is unavailable.
 */
export function chimeSuccess(): void {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);

    // Clean up after playback
    setTimeout(() => ctx.close(), 200);
  } catch {
    // Silent fail — AudioContext not available
  }
}

/**
 * Play a subtle error tone.
 * 100ms sine wave at 220Hz, volume 0.06.
 */
export function chimeError(): void {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(220, ctx.currentTime);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);

    setTimeout(() => ctx.close(), 200);
  } catch {}
}

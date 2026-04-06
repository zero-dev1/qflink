// src/lib/feedback.ts

/**
 * QFLink Sonic Identity — ported from QNS haptics.ts
 * Singleton AudioContext, multi-note chimes, categorized feedback.
 */

const isVibrationSupported =
  typeof navigator !== 'undefined' && 'vibrate' in navigator;

let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();
  }
  return audioCtx;
}

function playChime(frequencies: number[], durations: number[]): void {
  try {
    const ctx = getAudioCtx();
    if (ctx.state === 'suspended') ctx.resume();
    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = durations.slice(0, i).reduce((a, b) => a + b, 0);
      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.10, ctx.currentTime + start + 0.01);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + start + durations[i],
      );
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + durations[i]);
    });
  } catch {
    // Silent fail — AudioContext not available
  }
}

/** Vibrate helper — no-op if unsupported */
export function haptic(pattern: number | number[] = 10): void {
  try {
    if (isVibrationSupported) navigator.vibrate(pattern);
  } catch {}
}

/** Success: short pulse + ascending C5→E5→G5 chime */
export function hapticSuccess(): void {
  haptic([10, 30, 10]);
  playChime([523.25, 659.25, 783.99], [0.12, 0.12, 0.2]);
}

/** Tap: very short pulse + subtle 1kHz click */
export function hapticTap(): void {
  haptic(8);
  try {
    const ctx = getAudioCtx();
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 1000;
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.03);
  } catch {}
}

/** Error: two pulses + descending sawtooth buzz */
export function hapticError(): void {
  haptic([50, 50, 50]);
  try {
    const ctx = getAudioCtx();
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch {}
}

/** Message sent: quick two-note C5→E5 (shorter than full success) */
export function hapticSend(): void {
  haptic(10);
  playChime([523.25, 659.25], [0.08, 0.12]);
}

/** Message confirmed on-chain: single G5 ping */
export function hapticConfirm(): void {
  haptic(10);
  playChime([783.99], [0.15]);
}

/**
 * Legacy aliases — chimeSuccess/chimeError are used in some stores.
 * Keep them so nothing breaks.
 */
export const chimeSuccess = hapticSuccess;
export const chimeError = hapticError;

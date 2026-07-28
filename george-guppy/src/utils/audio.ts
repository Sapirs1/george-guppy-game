// Phaser is used at RUNTIME here (instanceof / class extends), not just as a
// type. Without this import it resolved only via a window.Phaser global that the
// classic-script vendor build happens to set — so the ESM/importmap build threw
// "Phaser is not defined".
import Phaser from 'phaser';

function getAudioContext(scene: Phaser.Scene): AudioContext | undefined {
  const manager = scene.sound;
  if (!(manager instanceof Phaser.Sound.WebAudioSoundManager)) {
    return undefined;
  }
  return manager.context ?? undefined;
}

/**
 * The ambience is a single game-wide stream, not a per-scene one: it is started from the
 * PLAY button and keeps looping across scene changes. Holding the handle at module level
 * is what makes `createWaterAmbience` idempotent, so a replay reuses the running source
 * instead of stacking a second looping layer (and leaking its ~384KB buffer).
 */
let ambienceSource: AudioBufferSourceNode | undefined;

/**
 * Creates a gentle looping water ambience made from filtered white noise.
 * Safe to call any number of times: the first call starts the stream, later calls return
 * the same node. Use `stopWaterAmbience()` to tear it down.
 * Returns undefined if Web Audio is unavailable.
 */
export function createWaterAmbience(scene: Phaser.Scene): AudioBufferSourceNode | undefined {
  if (ambienceSource) {
    return ambienceSource;
  }

  const ctx = getAudioContext(scene);
  if (!ctx) {
    return undefined;
  }

  const sampleRate = ctx.sampleRate;
  const buffer = ctx.createBuffer(1, sampleRate * 2, sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 520;

  const gain = ctx.createGain();
  gain.gain.value = 0.12;

  source.connect(filter).connect(gain).connect(ctx.destination);
  source.start();

  ambienceSource = source;

  // Release the handle if the browser ends the stream on its own.
  source.onended = () => {
    if (ambienceSource === source) {
      ambienceSource = undefined;
    }
  };

  return source;
}

/**
 * Stops the looping water ambience and releases its buffer, if one is running.
 * Safe to call when nothing is playing.
 */
export function stopWaterAmbience(): void {
  if (!ambienceSource) {
    return;
  }

  try {
    ambienceSource.stop();
    ambienceSource.disconnect();
  } catch {
    // Already stopped by the browser.
  }

  ambienceSource = undefined;
}

/**
 * True while the shared ambience stream is running.
 */
export function isWaterAmbiencePlaying(): boolean {
  return ambienceSource !== undefined;
}

/**
 * Semitone offsets of a major pentatonic scale, spanning two octaves.
 *
 * A pentatonic scale has no semitone clashes, so *any* subset of these notes sounds
 * consonant in *any* order. That is what lets the pop chime keep climbing for as long
 * as a child keeps popping without ever hitting a sour note — the last entry simply
 * repeats once the chain runs past the top of the table.
 */
const PENTATONIC_STEPS = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];

/** Root pitch of the chime chain, in Hz (E5-ish; bright but not shrill). */
const BUBBLE_ROOT_HZ = 660;

/** From this chain length on, a fifth above is layered in so the chime thickens as it rises. */
const BUBBLE_HARMONY_CHAIN = 4;

/** Peak gain of the leading chime voice. */
const BUBBLE_PEAK_GAIN = 0.2;

/** How long one blip voice occupies the mix, in ms. Exported so SoundManager can cap voices. */
export const BUBBLE_BLIP_MS = 150;

/**
 * One chime voice: a sine that blips up a fifth over 50ms, the same gesture the
 * original 880 -> 1320 blip had, transposed onto an arbitrary root.
 */
function playChimeVoice(
  ctx: AudioContext,
  frequency: number,
  peakGain: number,
  startTime: number
): void {
  const oscillator = ctx.createOscillator();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, startTime);
  oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.5, startTime + 0.05);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + BUBBLE_BLIP_MS / 1000);

  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + BUBBLE_BLIP_MS / 1000);
}

/**
 * Plays the happy blip for a collected bubble, pitched by how many bubbles have been
 * popped in a row: consecutive pops walk *up* the pentatonic table, so the ear starts
 * wanting the next note. `chainIndex` 0 is the root; the caller owns the counter and
 * simply stops passing higher numbers once its chain has timed out.
 *
 * Call from a collision handler after user interaction has unlocked the audio context.
 */
export function playBubbleBlip(scene: Phaser.Scene, chainIndex = 0): void {
  const ctx = getAudioContext(scene);
  if (!ctx) {
    return;
  }

  const step =
    PENTATONIC_STEPS[
      Math.min(Math.max(Math.floor(chainIndex) || 0, 0), PENTATONIC_STEPS.length - 1)
    ] ?? 0;
  const frequency = BUBBLE_ROOT_HZ * Math.pow(2, step / 12);
  const startTime = ctx.currentTime;

  playChimeVoice(ctx, frequency, BUBBLE_PEAK_GAIN, startTime);

  // Deep into a chain the chime gets a fifth stacked on top, so a long run grows
  // richer as well as higher instead of just turning into a thin whistle.
  if (chainIndex >= BUBBLE_HARMONY_CHAIN) {
    playChimeVoice(ctx, frequency * 1.5, BUBBLE_PEAK_GAIN * 0.4, startTime);
  }
}

/**
 * Plays George's grumbly "harrumph" when he bumps a hazard.
 *
 * This is deliberately comic, not punishing: nobody can lose this game, so the drain
 * gets a two-step descending mutter on a soft triangle wave with a slow tremolo
 * wobble, rather than the harsh sawtooth twang it used to have (which read as damage).
 * Returns immediately if Web Audio is unavailable.
 */
export function playCrankSound(scene: Phaser.Scene): void {
  const ctx = getAudioContext(scene);
  if (!ctx) {
    return;
  }

  const now = ctx.currentTime;
  const duration = 0.34;

  // "har-RUMPH": two downward steps rather than one alarm-like drop.
  const oscillator = ctx.createOscillator();
  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(300, now);
  oscillator.frequency.exponentialRampToValueAtTime(210, now + 0.09);
  oscillator.frequency.exponentialRampToValueAtTime(96, now + duration);

  // The grumble is a slow tremolo on the amplitude. Wobbling the volume keeps it
  // cartoonish; adding a second dissonant tone instead would just sound like a buzzer.
  const tremolo = ctx.createGain();
  tremolo.gain.setValueAtTime(1, now);

  const wobble = ctx.createOscillator();
  wobble.type = 'sine';
  wobble.frequency.setValueAtTime(16, now);

  const wobbleDepth = ctx.createGain();
  wobbleDepth.gain.setValueAtTime(0.45, now);

  wobble.connect(wobbleDepth).connect(tremolo.gain);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  oscillator.connect(tremolo).connect(gain).connect(ctx.destination);
  oscillator.start(now);
  oscillator.stop(now + duration);
  wobble.start(now);
  wobble.stop(now + duration);
}

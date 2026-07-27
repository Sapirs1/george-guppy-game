function getAudioContext(scene: Phaser.Scene): AudioContext | undefined {
  const manager = scene.sound;
  if (!(manager instanceof Phaser.Sound.WebAudioSoundManager)) {
    return undefined;
  }
  return manager.context ?? undefined;
}

/**
 * Creates a gentle looping water ambience made from filtered white noise.
 * Call from a scene's `create()` method and store the returned node if you want to stop it later.
 * Returns undefined if Web Audio is unavailable.
 */
export function createWaterAmbience(scene: Phaser.Scene): AudioBufferSourceNode | undefined {
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

  return source;
}

/**
 * Plays a short happy blip when a bubble is collected.
 * Call from a scene's `create()` method (or from a collision handler) after user interaction has
 * unlocked the audio context.
 */
export function playBubbleBlip(scene: Phaser.Scene): void {
  const ctx = getAudioContext(scene);
  if (!ctx) {
    return;
  }

  const oscillator = ctx.createOscillator();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(880, ctx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.05);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);

  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.15);
}

/**
 * Plays a short dissonant twang when George hits a hazard.
 * Returns immediately if Web Audio is unavailable.
 */
export function playCrankSound(scene: Phaser.Scene): void {
  const ctx = getAudioContext(scene);
  if (!ctx) {
    return;
  }

  const oscillator = ctx.createOscillator();
  oscillator.type = 'sawtooth';
  oscillator.frequency.setValueAtTime(360, ctx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.18);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);

  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.25);
}

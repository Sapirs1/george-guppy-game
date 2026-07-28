// Phaser is used at RUNTIME here (instanceof / class extends), not just as a
// type. Without this import it resolved only via a window.Phaser global that the
// classic-script vendor build happens to set — so the ESM/importmap build threw
// "Phaser is not defined".
import Phaser from 'phaser';

import {
  BUBBLE_BLIP_MS,
  createWaterAmbience,
  playBubbleBlip,
  playCrankSound,
  stopWaterAmbience,
} from './audio.js';
import { musicEnabled, sfxEnabled } from '../scenes/SettingsOverlay.js';

/**
 * SoundManager
 *
 * Centralized audio controller inspired by Om Nom Run's soundController.js
 * and musicController.js. It hides Web Audio lifecycle details from scenes and
 * provides a small, explicit API for the sounds used in George Guppy.
 */

export class SoundManager {
  private scene: Phaser.Scene;

  /**
   * Wall-clock expiry of every blip voice still sounding.
   *
   * This replaces a 50ms boolean gate that silently *dropped* any blip arriving inside
   * the window. That gate ate whole runs of the rising chime chain whenever two bubbles
   * popped together, which is exactly when the chain is most rewarding. A voice cap lets
   * simultaneous pops layer, and only declines once the mix would genuinely turn to mush.
   *
   * Timestamps come from `Date.now()` rather than the scene clock on purpose: a dialogue
   * or the pause menu freezes `scene.time`, which would strand voices and mute the game.
   */
  private bubbleVoices: number[] = [];

  /** Maximum blip voices allowed to overlap. */
  private readonly maxBubbleVoices = 6;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Ensures the Web Audio context is running after a user gesture.
   * Must be called from a pointerdown/tap handler before playing sounds.
   */
  unlock(): void {
    if (this.scene.sound instanceof Phaser.Sound.WebAudioSoundManager) {
      const ctx = this.scene.sound.context;
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {
          // Ignore; the browser will remain silent for this session.
        });
      }
    }
  }

  /**
   * Starts the looping underwater ambience. Safe to call multiple times: the stream
   * itself is a game-wide singleton (see utils/audio.ts), so it is never layered twice.
   * Does nothing while music is toggled off.
   */
  startAmbience(): void {
    if (!musicEnabled) {
      return;
    }
    try {
      createWaterAmbience(this.scene);
    } catch {
      // Web Audio unavailable; continue without ambience.
    }
  }

  /**
   * Stops the shared ambience stream, used when music is toggled off.
   */
  stopAmbience(): void {
    stopWaterAmbience();
  }

  /**
   * Plays the bubble collect blip, pitched by `chainIndex` — the number of bubbles
   * popped in a row so far, which the calling scene owns. Consecutive pops climb a
   * pentatonic scale; passing 0 starts again at the root.
   */
  playBubbleBlip(chainIndex = 0): void {
    if (!sfxEnabled) {
      return;
    }

    const now = Date.now();
    this.bubbleVoices = this.bubbleVoices.filter((expiresAt) => expiresAt > now);
    if (this.bubbleVoices.length >= this.maxBubbleVoices) {
      return;
    }
    this.bubbleVoices.push(now + BUBBLE_BLIP_MS);

    playBubbleBlip(this.scene, chainIndex);
  }

  /**
   * Plays George's comic "harrumph" when he bumps a hazard.
   */
  playCrank(): void {
    if (!sfxEnabled) {
      return;
    }
    playCrankSound(this.scene);
  }
}

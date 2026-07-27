import { createWaterAmbience, playBubbleBlip, playCrankSound, stopWaterAmbience } from './audio.js';
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
  private bubblePending = false;

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
   * Plays the bubble collect blip.
   */
  playBubbleBlip(): void {
    if (!sfxEnabled) {
      return;
    }

    // Avoid overlapping blips if the user collects several bubbles instantly.
    if (this.bubblePending) {
      return;
    }
    this.bubblePending = true;
    this.scene.time.delayedCall(50, () => {
      this.bubblePending = false;
    });
    playBubbleBlip(this.scene);
  }

  /**
   * Plays the dissonant hazard/crank sound.
   */
  playCrank(): void {
    if (!sfxEnabled) {
      return;
    }
    playCrankSound(this.scene);
  }
}

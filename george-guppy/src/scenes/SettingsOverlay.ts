import Phaser from 'phaser';
import { SoundManager } from '../utils/SoundManager.js';

/**
 * SettingsOverlay
 *
 * A small settings modal inspired by Om Nom Run's SettingsPopup.
 * Offers toggles for music and SFX, plus a Return to Menu / Close option.
 * The mute state is stored on simple module-level flags that SoundManager
 * reads before playing anything; the music toggle also starts/stops the
 * shared ambience straight away so the change is audible immediately.
 */

export let musicEnabled = true;
export let sfxEnabled = true;

interface SettingsOverlayData {
  returnScene?: string;
}

export class SettingsOverlay extends Phaser.Scene {
  private returnScene = 'Menu';
  private soundManager!: SoundManager;
  private cardGraphics!: Phaser.GameObjects.Graphics;
  private overlayGraphics!: Phaser.GameObjects.Graphics;
  private toggles: { label: Phaser.GameObjects.Text; state: boolean; onChange: (v: boolean) => void }[] = [];

  constructor() {
    super({ key: 'SettingsOverlay' });
  }

  init(data: SettingsOverlayData): void {
    this.returnScene = data?.returnScene ?? 'Menu';
  }

  create(): void {
    const { width, height } = this.scale;

    this.soundManager = new SoundManager(this);

    this.overlayGraphics = this.add.graphics();
    this.overlayGraphics.fillStyle(0x000000, 0.55);
    this.overlayGraphics.fillRect(0, 0, width, height);
    this.overlayGraphics.setScrollFactor(0).setDepth(2000);

    // The card is taller than it used to be because each row now carries a tap
    // target that clears the 44 CSS px minimum once the fixed 800x600 canvas is
    // scaled down to a phone (~0.49x). These are parent-facing controls.
    const cardWidth = Math.min(360, width * 0.82);
    const cardHeight = 376;
    const cardX = (width - cardWidth) / 2;
    const cardY = (height - cardHeight) / 2;

    this.cardGraphics = this.add.graphics();
    this.drawCard(cardX, cardY, cardWidth, cardHeight);
    this.cardGraphics.setScrollFactor(0).setDepth(2001);

    const title = this.add
      .text(width / 2, cardY + 36, 'Settings', {
        fontSize: '34px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#0b1d2e',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2002);

    this.addToggle(
      width / 2,
      cardY + 114,
      cardWidth - 24,
      'Music',
      musicEnabled,
      (v) => {
        musicEnabled = v;
        // Apply it now rather than on the next scene: the ambience is a game-wide
        // singleton, so it can be stopped and restarted from right here.
        this.soundManager.unlock();
        if (v) {
          this.soundManager.startAmbience();
        } else {
          this.soundManager.stopAmbience();
        }
      }
    );

    this.addToggle(
      width / 2,
      cardY + 210,
      cardWidth - 24,
      'Sound Effects',
      sfxEnabled,
      (v) => {
        sfxEnabled = v;
      }
    );

    this.addButton(
      width / 2,
      cardY + 306,
      this.returnScene === 'GameScene' ? 'Resume' : 'Menu',
      0x3498db,
      () => {
        this.scene.stop();
        if (this.returnScene === 'GameScene') {
          this.scene.resume('GameScene');
        } else {
          this.scene.start('Menu');
        }
      }
    );
  }

  private addToggle(
    centerX: number,
    y: number,
    rowWidth: number,
    label: string,
    initial: boolean,
    onChange: (value: boolean) => void
  ): void {
    // Laid out as a row inside the card: label hard left, switch hard right.
    // The old fixed offsets pushed "Sound Effects" off the left card edge.
    const rowLeft = centerX - rowWidth / 2;

    const labelText = this.add
      .text(rowLeft + 16, y, label, {
        fontSize: '28px',
        color: '#d0efff',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(2002);

    const trackWidth = 64;
    const trackHeight = 30;
    const trackX = rowLeft + rowWidth - 16 - trackWidth;
    const track = this.add.graphics();
    track.setScrollFactor(0).setDepth(2002);

    const knobRadius = 12;
    let state = initial;

    const draw = () => {
      track.clear();
      track.fillStyle(state ? 0x2ecc71 : 0x7f8c8d);
      track.fillRoundedRect(trackX, y - trackHeight / 2, trackWidth, trackHeight, trackHeight / 2);
      track.lineStyle(2, 0xffffff, 0.5);
      track.strokeRoundedRect(trackX, y - trackHeight / 2, trackWidth, trackHeight, trackHeight / 2);
      track.fillStyle(0xffffff);
      const knobX = state ? trackX + trackWidth - knobRadius - 4 : trackX + knobRadius + 4;
      track.fillCircle(knobX, y, knobRadius);
    };

    draw();

    // The drawn switch stays small so the card still reads as a settings list,
    // but the tap target covers the whole row. 92 design px is ~44.9 CSS px on
    // a 390px-wide phone; the rows are 96px apart so the zones never overlap.
    const hit = this.add
      .zone(centerX, y, rowWidth, 92)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setScrollFactor(0)
      .setDepth(2003);

    hit.on('pointerdown', () => {
      state = !state;
      onChange(state);
      draw();
    });

    this.toggles.push({ label: labelText, state: initial, onChange });
  }

  private addButton(
    centerX: number,
    y: number,
    label: string,
    color: number,
    onClick: () => void
  ): void {
    const w = 200;
    const h = 64;
    // Same trick as the toggles: the drawn button stays proportionate to the
    // card while the hit zone clears 44 CSS px on a phone.
    const hitHeight = 92;

    const bg = this.add.graphics();
    bg.fillStyle(color);
    bg.fillRoundedRect(centerX - w / 2, y - h / 2, w, h, 14);
    bg.lineStyle(3, 0xffffff, 0.5);
    bg.strokeRoundedRect(centerX - w / 2, y - h / 2, w, h, 14);
    bg.setScrollFactor(0).setDepth(2002);

    const text = this.add
      .text(centerX, y, label, {
        fontSize: '28px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2003);

    const zone = this.add
      .zone(centerX, y, w, hitHeight)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setScrollFactor(0)
      .setDepth(2004);

    zone.on('pointerdown', onClick);
    zone.on('pointerover', () => text.setScale(1.05));
    zone.on('pointerout', () => text.setScale(1));
  }

  private drawCard(x: number, y: number, w: number, h: number): void {
    this.cardGraphics.clear();
    this.cardGraphics.fillStyle(0x000000, 0.25);
    this.cardGraphics.fillRoundedRect(x + 8, y + 8, w, h, 24);
    this.cardGraphics.fillStyle(0x1a3a52, 0.98);
    this.cardGraphics.fillRoundedRect(x, y, w, h, 24);
    this.cardGraphics.lineStyle(4, 0x62c4f5, 0.8);
    this.cardGraphics.strokeRoundedRect(x, y, w, h, 24);
  }
}

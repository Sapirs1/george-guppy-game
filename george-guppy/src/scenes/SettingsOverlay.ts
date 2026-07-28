import Phaser from 'phaser';
import { SoundManager } from '../utils/SoundManager.js';

/**
 * SettingsOverlay
 *
 * A small settings modal: toggles for music and SFX, plus a Return to Menu /
 * Resume option. The mute state is stored on simple module-level flags that
 * SoundManager reads before playing anything; the music toggle also
 * starts/stops the shared ambience straight away so the change is audible
 * immediately.
 */

const FONT = "Nunito, system-ui, -apple-system, 'Segoe UI', sans-serif";

const C = {
  abyss: 0x04121f,
  hull2: 0x16354f,
  ice: 0xeaf6ff,
  ink: 0x102a40,
  rim: 0x5fc8ee,
  kelp: 0x00b89c,
  tide: 0x0a96e6,
} as const;

const HEX = {
  ice: '#eaf6ff',
  ink: '#102a40',
} as const;

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
    this.overlayGraphics.fillStyle(C.abyss, 0.62);
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

    this.add
      .text(width / 2, cardY + 36, 'Settings', {
        fontFamily: FONT,
        fontSize: '34px',
        color: HEX.ice,
        fontStyle: 'bold',
        // No stroke: at 34px this is below the 36px display threshold, and on an
        // opaque card there is nothing for an outline to separate the type from.
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

    // `tide` fill with `ink` text is 4.57:1 — full AA for body copy, not merely
    // the 3:1 large-text floor the old white-on-#3498DB (3.15:1) scraped past.
    this.addButton(
      width / 2,
      cardY + 306,
      this.returnScene === 'GameScene' ? 'Resume' : 'Menu',
      C.tide,
      HEX.ink,
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

    // A recessed row well: it groups the label with its switch, so the eye reads
    // a settings list rather than four floating fragments.
    const rowPlate = this.add.graphics();
    rowPlate.fillStyle(C.abyss, 1);
    rowPlate.fillRoundedRect(rowLeft, y - 34, rowWidth, 68, 18);
    rowPlate.setScrollFactor(0).setDepth(2001);

    const labelText = this.add
      .text(rowLeft + 18, y, label, {
        fontFamily: FONT,
        fontSize: '28px',
        color: HEX.ice,
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(2002);

    const trackWidth = 72;
    const trackHeight = 36;
    const trackX = rowLeft + rowWidth - 18 - trackWidth;
    const track = this.add.graphics();
    track.setScrollFactor(0).setDepth(2002);

    const knobRadius = 14;
    let state = initial;

    // The knob is its own object so the ON/OFF change can be eased rather than
    // teleported — the switch is the only moving part on this screen.
    const knob = this.add.graphics();
    knob.fillStyle(C.ice, 1);
    knob.fillCircle(0, 0, knobRadius);
    // An `ink` ring so the knob keeps a >=3:1 edge in BOTH states: a bare ice
    // knob on the `kelp` ON track is only 2.29:1, which fails WCAG 1.4.11.
    // ink-on-kelp is 5.84:1, and on the dark OFF track the ice fill itself is
    // 17.05:1.
    knob.lineStyle(2, C.ink, 1);
    knob.strokeCircle(0, 0, knobRadius);
    knob.setScrollFactor(0).setDepth(2003);

    const knobOnX = trackX + trackWidth - knobRadius - 5;
    const knobOffX = trackX + knobRadius + 5;
    knob.setPosition(state ? knobOnX : knobOffX, y);

    const drawTrack = () => {
      track.clear();
      // ON is `kelp`, 6.93:1 against the row well. OFF is a darker recess whose
      // fill alone would only be 1.16:1, so it carries a full-strength `rim`
      // edge (9.13:1 against the well) to stay an identifiable control. State is
      // never signalled by colour alone — the knob position says it too.
      track.fillStyle(state ? C.kelp : C.abyss, state ? 1 : 0.85);
      track.fillRoundedRect(trackX, y - trackHeight / 2, trackWidth, trackHeight, trackHeight / 2);
      track.lineStyle(2, state ? C.kelp : C.rim, 1);
      track.strokeRoundedRect(
        trackX,
        y - trackHeight / 2,
        trackWidth,
        trackHeight,
        trackHeight / 2
      );
    };

    drawTrack();

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
      drawTrack();
      this.tweens.killTweensOf(knob);
      this.tweens.add({
        targets: knob,
        x: state ? knobOnX : knobOffX,
        duration: 260,
        ease: 'Back.easeOut',
      });
    });

    hit.on('pointerover', () => {
      this.tweens.add({ targets: rowPlate, alpha: 1, duration: 180, ease: 'Sine.easeOut' });
    });
    hit.on('pointerout', () => {
      this.tweens.add({ targets: rowPlate, alpha: 0.75, duration: 180, ease: 'Sine.easeOut' });
    });
    rowPlate.setAlpha(0.75);

    this.toggles.push({ label: labelText, state: initial, onChange });
  }

  private addButton(
    centerX: number,
    y: number,
    label: string,
    fill: number,
    textHex: string,
    onClick: () => void
  ): void {
    const w = 200;
    const h = 64;
    // Same trick as the toggles: the drawn button stays proportionate to the
    // card while the hit zone clears 44 CSS px on a phone.
    const hitHeight = 92;

    // Nested containers: outer breathes, inner takes hover/press. The Zone is a
    // separate object that never scales, so the tap target is animation-proof.
    const breathe = this.add.container(centerX, y);
    breathe.setScrollFactor(0).setDepth(2002);
    const press = this.add.container(0, 0);
    breathe.add(press);

    const bg = this.add.graphics();
    this.softShadow(bg, -w / 2, -h / 2, w, h, 18);
    bg.fillStyle(fill, 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 18);
    bg.lineStyle(2, C.ink, 0.22);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 18);

    const text = this.add
      .text(0, 0, label, {
        fontFamily: FONT,
        fontSize: '28px',
        color: textHex,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    press.add(bg);
    press.add(text);

    this.tweens.add({
      targets: breathe,
      scale: 1.03,
      duration: 2000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    const zone = this.add
      .zone(centerX, y, w, hitHeight)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setScrollFactor(0)
      .setDepth(2004);

    zone.on('pointerdown', () => {
      this.pressIn(press);
      onClick();
    });
    zone.on('pointerover', () => this.hoverTo(press, 1.05));
    zone.on('pointerout', () => this.hoverTo(press, 1));
  }

  private hoverTo(target: Phaser.GameObjects.Container, scale: number): void {
    this.tweens.killTweensOf(target);
    this.tweens.add({ targets: target, scale, duration: 220, ease: 'Back.easeOut' });
  }

  private pressIn(target: Phaser.GameObjects.Container): void {
    this.tweens.killTweensOf(target);
    this.tweens.add({
      targets: target,
      scale: 0.93,
      duration: 90,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.tweens.add({ targets: target, scale: 1, duration: 260, ease: 'Back.easeOut' });
      },
    });
  }

  /**
   * Three stacked rounded rects — wider and fainter as they go out — read as one
   * soft ambient shadow, replacing the old hard 8px offset. Graphics exposes no
   * blur and postFX is WebGL-only (the config is Phaser.AUTO and can fall back
   * to Canvas), so nothing readability depends on may use it.
   */
  private softShadow(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    radius: number
  ): void {
    const layers = [
      { spread: 16, alpha: 0.03 },
      { spread: 9, alpha: 0.06 },
      { spread: 4, alpha: 0.1 },
    ];
    for (const { spread, alpha } of layers) {
      g.fillStyle(C.abyss, alpha);
      g.fillRoundedRect(
        x - spread,
        y - spread + spread * 0.6,
        w + spread * 2,
        h + spread * 2,
        radius + spread
      );
    }
  }

  private drawCard(x: number, y: number, w: number, h: number): void {
    this.cardGraphics.clear();
    this.softShadow(this.cardGraphics, x, y, w, h, 26);
    // Opaque on purpose: every contrast ratio quoted for this card assumes a
    // solid `hull2` behind the type.
    this.cardGraphics.fillStyle(C.hull2, 1);
    this.cardGraphics.fillRoundedRect(x, y, w, h, 26);
    this.cardGraphics.lineStyle(2, C.rim, 0.5);
    this.cardGraphics.strokeRoundedRect(x, y, w, h, 26);
  }
}

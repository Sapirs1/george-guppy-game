import Phaser from 'phaser';
import { levels } from '../data/levels.js';

/**
 * LevelCompleteOverlay
 *
 * Shown when a level is finished. Displays a bubble burst, the level name, the
 * bubbles collected, and a large primary CTA ("Next Level", or "Read Book 1" on
 * the finale with Home just below).
 *
 * This is the one screen that uses the LIGHT surface (`cloud`): the whole game
 * is dark underwater, so a bright card is the reward moment and needs no other
 * signal to feel like one.
 *
 * GameScene launches it with:
 *   this.scene.launch('LevelCompleteOverlay', { levelIndex, bubblesCollected, totalBubbles });
 */

const FONT = "Nunito, system-ui, -apple-system, 'Segoe UI', sans-serif";

const C = {
  abyss: 0x04121f,
  cloud: 0xf4f7fa,
  ink: 0x102a40,
  sun: 0xffd166,
  kelp: 0x00b89c,
  tide: 0x0a96e6,
} as const;

const HEX = {
  ink: '#102a40',
  // Muted slate for secondary copy on the light card: 7.33:1 on `cloud`, so it
  // reads as quieter without dropping anywhere near the AA floor.
  slate: '#33556e',
} as const;

interface LevelCompleteData {
  levelIndex?: number;
  bubblesCollected?: number;
  totalBubbles?: number;
}

export class LevelCompleteOverlay extends Phaser.Scene {
  private levelIndex = 0;
  private bubblesCollected = 0;
  private totalBubbles = 0;

  private overlay!: Phaser.GameObjects.Graphics;
  private card!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'LevelCompleteOverlay' });
  }

  init(data: LevelCompleteData): void {
    this.levelIndex =
      typeof data?.levelIndex === 'number' && Number.isFinite(data.levelIndex)
        ? data.levelIndex
        : 0;
    this.bubblesCollected =
      typeof data?.bubblesCollected === 'number' && Number.isFinite(data.bubblesCollected)
        ? data.bubblesCollected
        : 0;
    this.totalBubbles =
      typeof data?.totalBubbles === 'number' && Number.isFinite(data.totalBubbles)
        ? data.totalBubbles
        : 0;
  }

  create(): void {
    const { width, height } = this.scale;
    const isLastLevel = this.levelIndex >= levels.length - 1;
    const levelName = levels[this.levelIndex]?.name ?? `Level ${this.levelIndex + 1}`;

    // Darkened full-screen backdrop.
    this.overlay = this.add.graphics();
    this.overlay.fillStyle(C.abyss, 0.62);
    this.overlay.fillRect(0, 0, width, height);
    this.overlay.setScrollFactor(0).setDepth(1000);

    const cardWidth = Math.min(420, width * 0.85);
    // The finale card carries a second button (the book prompt), so it needs
    // the extra height.
    const cardHeight = isLastLevel ? 460 : 360;
    const cardX = (width - cardWidth) / 2;
    const cardY = (height - cardHeight) / 2;

    this.card = this.add.graphics();
    this.drawCard(cardX, cardY, cardWidth, cardHeight);
    this.card.setScrollFactor(0).setDepth(1001);

    const centerX = width / 2;

    this.add
      .text(centerX, cardY + 44, isLastLevel ? 'You got George home!' : 'Level Complete!', {
        fontFamily: FONT,
        fontSize: isLastLevel ? '32px' : '40px',
        color: HEX.ink,
        fontStyle: 'bold',
        // No stroke: on a light card there is nothing to separate the type from,
        // and an outline would only thicken the letterforms.
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1002);

    this.add
      .text(centerX, cardY + 94, levelName, {
        fontFamily: FONT,
        fontSize: '26px',
        color: HEX.slate,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1002);

    // Bubble collection stat with a little icon. Drawn, not a `●` glyph — the
    // dot codepoint is a different weight in every system font.
    const statY = cardY + 156;
    const bubbleIcon = this.add.graphics();
    bubbleIcon.fillStyle(C.tide, 1);
    bubbleIcon.fillCircle(centerX - 90, statY, 18);
    bubbleIcon.fillStyle(0xffffff, 0.75);
    bubbleIcon.fillCircle(centerX - 96, statY - 6, 5);
    bubbleIcon.setScrollFactor(0).setDepth(1002);

    this.add
      .text(centerX - 50, statY, `Bubbles: ${this.bubblesCollected} / ${this.totalBubbles}`, {
        fontFamily: FONT,
        fontSize: '24px',
        color: HEX.ink,
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(1002);

    // Confetti / bubble burst behind the button.
    this.spawnBurst(centerX, cardY + 240);

    // Big CTA. Geometry is unchanged from the pass that sized these tap targets:
    // the drawn button is 240x64 and the hit zone is 264x94.
    const buttonWidth = 240;
    const buttonHeight = 64;
    const buttonY = cardY + 264;
    const buttonLabel = isLastLevel ? 'Read Book 1' : 'Next Level';

    // On the finale, point children (and the grown-up next to them) at the book
    // the game is a companion to. Home is still one tap away, just below.
    if (isLastLevel) {
      this.add
        .text(centerX, cardY + 206, 'George is even crankier in print.', {
          fontFamily: FONT,
          fontSize: '24px',
          color: HEX.slate,
          align: 'center',
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(1002);
    }

    // Primary: `sun` fill with `ink` text is 10.20:1. The old white-on-#2ECC71
    // was 2.10:1 and the finale's white-on-amber was worse still.
    const cta = this.makeButton(
      centerX,
      buttonY + buttonHeight / 2,
      buttonWidth,
      buttonHeight,
      buttonLabel,
      30,
      C.sun,
      HEX.ink
    );

    // Idle breathe on the primary CTA only, so the eye lands there first.
    this.tweens.add({
      targets: cta.breathe,
      scale: 1.035,
      duration: 1900,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    // Hit area larger than the drawn button: at the ~0.49 scale a phone gets,
    // a 64px button is only ~31 CSS px, well under the 44px minimum.
    const zone = this.add
      .zone(centerX, buttonY + buttonHeight / 2, buttonWidth + 24, 94)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setScrollFactor(0)
      .setDepth(1004);

    zone.on('pointerdown', () => {
      this.pressIn(cta.press);
      if (isLastLevel) {
        // Deliberately does NOT tear the game down — the child keeps their
        // finished game behind the new tab.
        this.openBookPage();
        return;
      }
      this.scene.stop('GameScene');
      this.scene.stop();
      this.scene.start('GameScene', { levelIndex: this.levelIndex + 1 });
    });

    zone.on('pointerover', () => this.hoverTo(cta.press, 1.05));
    zone.on('pointerout', () => this.hoverTo(cta.press, 1));

    if (isLastLevel) {
      // +104 rather than +82 so the two enlarged hit zones cannot overlap.
      this.buildHomeButton(centerX, buttonY + 104);
    }
  }

  /**
   * Opens the Book 1 page in a new tab. The game usually runs inside an iframe
   * on the site, so a new tab is used rather than navigating the frame — the
   * child does not lose the game they just finished. Wrapped because a popup
   * blocker (or an unusual embedding) can make this throw.
   */
  private openBookPage(): void {
    try {
      window.open('/start', '_blank', 'noopener');
    } catch {
      // Nothing useful to do — the Home button below is still available.
    }
  }

  private buildHomeButton(centerX: number, y: number): void {
    const w = 200;
    const h = 52;

    // Secondary: `tide` fill with `ink` text is 4.57:1 (AA for body, not just
    // large type), and it stays visually quieter than the sun primary above.
    const home = this.makeButton(centerX, y + h / 2, w, h, 'Home', 26, C.tide, HEX.ink);

    const zone = this.add
      .zone(centerX, y + h / 2, w + 24, 94)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setScrollFactor(0)
      .setDepth(1004);

    zone.on('pointerdown', () => {
      this.pressIn(home.press);
      this.scene.stop('GameScene');
      this.scene.stop();
      this.scene.start('Menu');
    });

    zone.on('pointerover', () => this.hoverTo(home.press, 1.05));
    zone.on('pointerout', () => this.hoverTo(home.press, 1));
  }

  /**
   * Button visuals live in nested containers: the outer one carries the idle
   * breathe, the inner one the hover/press. The hit Zone is a separate object
   * that is never scaled, so the tap target can never shrink under animation.
   */
  private makeButton(
    cx: number,
    cy: number,
    w: number,
    h: number,
    label: string,
    fontPx: number,
    fill: number,
    textHex: string
  ): { breathe: Phaser.GameObjects.Container; press: Phaser.GameObjects.Container } {
    const breathe = this.add.container(cx, cy);
    breathe.setScrollFactor(0).setDepth(1002);
    const press = this.add.container(0, 0);
    breathe.add(press);

    const g = this.add.graphics();
    this.softShadow(g, -w / 2, -h / 2, w, h, 22);
    g.fillStyle(fill, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 22);
    // A solid ink edge: `sun` on `cloud` is only 1.34:1, so without it the
    // button would have no discernible boundary on the light card (WCAG 1.4.11).
    // ink-on-cloud is 13.68:1.
    g.lineStyle(3, C.ink, 1);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 22);

    const text = this.add
      .text(0, 0, label, {
        fontFamily: FONT,
        fontSize: `${fontPx}px`,
        color: textHex,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    press.add(g);
    press.add(text);

    return { breathe, press };
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
   * soft ambient shadow, replacing the old 8px hard offset. Graphics exposes no
   * blur and postFX is WebGL-only (the config is Phaser.AUTO), so this is the
   * portable way to get depth.
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
    this.card.clear();
    this.softShadow(this.card, x, y, w, h, 28);
    // A `sun` plate with the `cloud` panel inset on top leaves a warm rim and a
    // thicker band across the head of the card — the reward framing, without a
    // single extra asset.
    this.card.fillStyle(C.sun, 1);
    this.card.fillRoundedRect(x, y, w, h, 28);
    this.card.fillStyle(C.cloud, 1);
    this.card.fillRoundedRect(x + 6, y + 16, w - 12, h - 22, 22);
  }

  private spawnBurst(x: number, y: number): void {
    const emitter = this.add.particles(0, 0, 'bubble', {
      x,
      y,
      speed: { min: 60, max: 180 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.9, end: 0 },
      lifespan: 500,
      quantity: 18,
      emitting: false,
      // Retinted for the light card: white bubbles were invisible on `cloud`.
      tint: [C.tide, C.sun, C.kelp],
    });
    // Above the card (1001), below the buttons: at the old depth 1000 the burst
    // rendered *behind* the card it is centred on, so it was never actually seen.
    emitter.setScrollFactor(0).setDepth(1002);
    emitter.explode(18, x, y);
    this.time.delayedCall(550, () => emitter.destroy());
  }
}

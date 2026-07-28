import Phaser from 'phaser';

/**
 * PauseOverlay
 *
 * A centered modal overlay that pauses the active GameScene and presents
 * Resume, Restart, Settings, and Menu options. Rounded raised card, layered
 * soft shadow, large tap targets, and a clear colour hierarchy: the primary
 * action is the only warm thing on the card.
 *
 * GameScene launches it with:
 *   this.scene.launch('PauseOverlay', { levelIndex: this.levelIndex });
 *   this.scene.pause();
 */

const FONT = "Nunito, system-ui, -apple-system, 'Segoe UI', sans-serif";

const C = {
  abyss: 0x04121f,
  hull: 0x0b1f33,
  hull2: 0x16354f,
  ink: 0x102a40,
  rim: 0x5fc8ee,
  sun: 0xffd166,
  kelp: 0x00b89c,
  tide: 0x0a96e6,
} as const;

const HEX = {
  ice: '#eaf6ff',
  ink: '#102a40',
  hull: '#0b1f33',
} as const;

interface PauseOverlayData {
  levelIndex?: number;
}

export class PauseOverlay extends Phaser.Scene {
  private levelIndex = 0;

  private overlay!: Phaser.GameObjects.Graphics;
  private card!: Phaser.GameObjects.Graphics;
  private buttons: Phaser.GameObjects.Text[] = [];

  constructor() {
    super({ key: 'PauseOverlay' });
  }

  init(data: PauseOverlayData): void {
    this.levelIndex =
      typeof data?.levelIndex === 'number' && Number.isFinite(data.levelIndex)
        ? data.levelIndex
        : 0;
  }

  create(): void {
    const { width, height } = this.scale;

    // Semi-transparent dark backdrop.
    this.overlay = this.add.graphics();
    this.overlay.fillStyle(C.abyss, 0.62);
    this.overlay.fillRect(0, 0, width, height);
    this.overlay.setScrollFactor(0);
    this.overlay.setDepth(1000);

    // Centered card dimensions. The card is taller than it used to be because
    // the four buttons now carry tap targets that clear the 44 CSS px minimum
    // once the fixed 800x600 canvas is scaled down to a phone (~0.49x).
    const cardWidth = Math.min(360, width * 0.8);
    const cardHeight = 492;
    const cardX = (width - cardWidth) / 2;
    const cardY = (height - cardHeight) / 2;

    this.card = this.add.graphics();
    this.drawCard(cardX, cardY, cardWidth, cardHeight);
    this.card.setScrollFactor(0);
    this.card.setDepth(1001);

    this.add
      .text(width / 2, cardY + 44, 'Paused', {
        fontFamily: FONT,
        fontSize: '40px',
        color: HEX.ice,
        fontStyle: 'bold',
        // Display type only, and capped at 4px — the old 6px outline was thick
        // enough to start closing the counters of the letterforms.
        stroke: HEX.hull,
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1002);

    const centerX = width / 2;
    const buttonWidth = 220;
    const buttonHeight = 76;
    const buttonRadius = 20;
    // The hit zone is taller than the drawn button: 94 design px is ~45.8 CSS
    // px on a 390px-wide phone, over the 44px Apple HIG minimum. The 96px gap
    // below keeps neighbouring zones 2px apart so they can never overlap.
    const buttonHitHeight = 94;

    const makeButton = (
      label: string,
      y: number,
      fill: number,
      textHex: string,
      onClick: () => void,
      options?: { ghost?: boolean; primary?: boolean }
    ) => {
      const cy = y + buttonHeight / 2;

      // Nested containers: the outer carries the idle breathe, the inner the
      // hover/press. The Zone below is never scaled, so animation can never
      // shrink the tap target.
      const breathe = this.add.container(centerX, cy);
      breathe.setScrollFactor(0).setDepth(1002);
      const press = this.add.container(0, 0);
      breathe.add(press);

      const bg = this.add.graphics();
      const bx = -buttonWidth / 2;
      const by = -buttonHeight / 2;
      this.softShadow(bg, bx, by, buttonWidth, buttonHeight, buttonRadius);
      if (options?.ghost) {
        // Tonal/ghost treatment for the one action that leaves the game: it is
        // findable but never the thing your thumb reaches for first.
        bg.fillStyle(C.hull, 1);
        bg.fillRoundedRect(bx, by, buttonWidth, buttonHeight, buttonRadius);
        bg.lineStyle(3, C.rim, 1);
        bg.strokeRoundedRect(bx, by, buttonWidth, buttonHeight, buttonRadius);
      } else {
        bg.fillStyle(fill, 1);
        bg.fillRoundedRect(bx, by, buttonWidth, buttonHeight, buttonRadius);
        bg.lineStyle(2, C.ink, 0.22);
        bg.strokeRoundedRect(bx, by, buttonWidth, buttonHeight, buttonRadius);
      }

      const text = this.add
        .text(0, 0, label, {
          fontFamily: FONT,
          fontSize: '30px',
          color: textHex,
          fontStyle: 'bold',
        })
        .setOrigin(0.5);

      press.add(bg);
      press.add(text);

      const zone = this.add
        .zone(centerX, cy, buttonWidth, buttonHitHeight)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .setScrollFactor(0)
        .setDepth(1004);

      zone.on('pointerdown', () => {
        this.pressIn(press);
        onClick();
      });

      // Organic hover instead of an instant state swap.
      zone.on('pointerover', () => this.hoverTo(press, 1.05));
      zone.on('pointerout', () => this.hoverTo(press, 1));

      if (options?.primary) {
        this.tweens.add({
          targets: breathe,
          scale: 1.03,
          duration: 2000,
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: -1,
        });
      }

      this.buttons.push(text);
    };

    const baseY = cardY + 96;
    const gap = 96;

    // Colour carries the hierarchy, and every pair is measured:
    //   Resume   sun  #FFD166 + ink  = 10.20:1   (was white on #2ECC71, 2.10:1)
    //   Restart  kelp #00B89C + ink  =  5.84:1   (was white on #F39C12, 2.19:1)
    //   Settings tide #0A96E6 + ink  =  4.57:1   (was white on #3498DB, 3.15:1)
    //   Menu     ghost hull + ice    = 15.20:1   (was white on #E74C3C, 3.82:1)
    makeButton(
      'Resume',
      baseY,
      C.sun,
      HEX.ink,
      () => {
        this.scene.stop();
        this.scene.resume('GameScene');
      },
      { primary: true }
    );

    makeButton('Restart', baseY + gap, C.kelp, HEX.ink, () => {
      this.scene.stop();
      this.scene.start('GameScene', { levelIndex: this.levelIndex });
    });

    makeButton('Settings', baseY + gap * 2, C.tide, HEX.ink, () => {
      this.scene.stop();
      this.scene.launch('SettingsOverlay', { returnScene: 'GameScene' });
    });

    makeButton(
      'Menu',
      baseY + gap * 3,
      C.hull,
      HEX.ice,
      () => {
        this.scene.stop();
        this.scene.stop('GameScene');
        this.scene.start('Menu');
      },
      { ghost: true }
    );
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
    this.card.clear();
    this.softShadow(this.card, x, y, w, h, 26);
    // Raised surface, one step lighter than the HUD `hull`. Opaque on purpose:
    // every contrast ratio quoted for this card assumes a solid `hull2`.
    this.card.fillStyle(C.hull2, 1);
    this.card.fillRoundedRect(x, y, w, h, 26);
    this.card.lineStyle(2, C.rim, 0.5);
    this.card.strokeRoundedRect(x, y, w, h, 26);
  }
}

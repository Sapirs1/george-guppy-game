import Phaser from 'phaser';
import { SoundManager } from '../utils/SoundManager.js';

/**
 * Shared visual language (mirrors the website tokens).
 *
 * `sun` replaces the old max-chroma #FFE600 everywhere — that single colour was
 * doing most of the "2013 flash game" work. Orange is deliberately absent from
 * the UI: #FF8C42 belongs to George alone, so he is always the most orange thing
 * on screen and the eye finds him for free.
 */
const FONT = "Nunito, system-ui, -apple-system, 'Segoe UI', sans-serif";

const C = {
  abyss: 0x04121f,
  hull: 0x0b1f33,
  ink: 0x102a40,
  rim: 0x5fc8ee,
  sun: 0xffd166,
} as const;

const HEX = {
  ice: '#eaf6ff',
  mist: '#9dc4de',
  ink: '#102a40',
  hull: '#0b1f33',
} as const;

export class MenuScene extends Phaser.Scene {
  private soundManager!: SoundManager;

  constructor() {
    super({ key: 'Menu' });
  }

  create(): void {
    this.soundManager = new SoundManager(this);
    const { width, height } = this.scale;
    // `this.scale.width` is the FIXED 800px design width, so testing it never
    // detected a phone — this branch was dead on every device and the desktop
    // layout was what phones actually got. Measure the RENDERED canvas instead.
    const renderedWidth =
      this.scale.canvas?.clientWidth || window.innerWidth || width;
    const isMobile = renderedWidth < 600;

    this.add
      .image(width / 2, height / 2, 'background_tank')
      .setDisplaySize(width, height)
      .setAlpha(0.65);

    // A deep abyss wash knocks the busy tank art back so UI type sits on a
    // predictable, measurable surface instead of on whatever pixel it landed on.
    const scrim = this.add.graphics();
    scrim.fillStyle(C.abyss, 0.34);
    scrim.fillRect(0, 0, width, height);

    // Decorative swimming George below the title card.
    this.add.sprite(width / 2, height / 2 + 110, 'george').setScale(isMobile ? 1.2 : 1.7);

    // Title card with a subtle dark backing so it pops against the bubbles.
    const titleY = height / 2 - 130;
    let titleFontPx = isMobile ? 42 : 48;
    // The canvas is a fixed 800x600 scaled with FIT, so on a 390px-wide phone
    // every design px renders at roughly 0.49 CSS px. The old 20px subtitle
    // landed at ~9 CSS px; 32 design px lands at ~15.6, which is readable.
    const subtitleFontPx = isMobile ? 28 : 32;
    const titlePadX = isMobile ? 22 : 34;
    const titlePadY = isMobile ? 16 : 20;
    const maxCardWidth = Math.max(260, width - 32);

    // Created before the text so it stays behind it in the display list, but
    // only filled in once the title has been measured — the plate used to be a
    // hardcoded 520px while the title measures ~642px, so it hung off both ends.
    const titleBg = this.add.graphics();

    const titleText = this.add
      .text(width / 2, titleY, 'George the Cranky Guppy', {
        fontFamily: FONT,
        fontSize: `${titleFontPx}px`,
        color: HEX.ice,
        fontStyle: 'bold',
        // Stroke is display-type only and capped at 4px: a heavy outline fills
        // the counters of small letterforms and costs more legibility than it
        // buys. 42/48px is comfortably past the 36px display threshold.
        stroke: HEX.hull,
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    const maxTextWidth = maxCardWidth - titlePadX * 2;
    if (isMobile) {
      titleText.setWordWrapWidth(maxTextWidth);
    } else if (titleText.width > maxTextWidth) {
      // Only if the title is genuinely too wide for the canvas: shrink the type
      // rather than let the plate and the text disagree again.
      titleFontPx = Math.floor(titleFontPx * (maxTextWidth / titleText.width));
      titleText.setFontSize(`${titleFontPx}px`);
    }

    const subtitleText = this.add
      .text(width / 2, titleY, 'Book 1: The Water Has Opinions', {
        fontFamily: FONT,
        fontSize: `${subtitleFontPx}px`,
        color: HEX.mist,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    subtitleText.setY(
      titleText.y + titleText.height / 2 + (isMobile ? 10 : 14) + subtitleText.height / 2
    );

    // Size the plate from the real measured text so it always contains it.
    const titleCardWidth = Math.min(
      maxCardWidth,
      Math.max(260, Math.max(titleText.width, subtitleText.width) + titlePadX * 2)
    );
    const titleCardTop = titleText.y - titleText.height / 2 - titlePadY;
    const titleCardHeight = subtitleText.y + subtitleText.height / 2 + titlePadY - titleCardTop;
    const titleCardX = width / 2 - titleCardWidth / 2;

    this.softShadow(titleBg, titleCardX, titleCardTop, titleCardWidth, titleCardHeight, 26);
    titleBg.fillStyle(C.hull, 0.82);
    titleBg.fillRoundedRect(titleCardX, titleCardTop, titleCardWidth, titleCardHeight, 26);
    titleBg.lineStyle(2, C.rim, 0.45);
    titleBg.strokeRoundedRect(titleCardX, titleCardTop, titleCardWidth, titleCardHeight, 26);

    // Big start button.
    const btnWidth = isMobile ? Math.min(320, width - 80) : 260;
    const btnHeight = isMobile ? 84 : 76;
    const btnCx = width / 2;
    const btnCy = height / 2 + 22 + btnHeight / 2;

    // Visuals live in a container so the whole button can be tweened as one
    // object. The hit zone is a SEPARATE, un-scaled Zone, so no amount of
    // squash-and-stretch can shrink the tap target below the 44 CSS px floor.
    const breathe = this.add.container(btnCx, btnCy);
    const press = this.add.container(0, 0);
    breathe.add(press);

    const buttonBg = this.add.graphics();
    const bx = -btnWidth / 2;
    const by = -btnHeight / 2;
    this.softShadow(buttonBg, bx, by, btnWidth, btnHeight, 24);
    // sun fill + ink label = 10.20:1. The old white-on-#2ECC71 was 2.10:1, which
    // failed even the 3:1 large-text floor of WCAG 1.4.3.
    buttonBg.fillStyle(C.sun, 1);
    buttonBg.fillRoundedRect(bx, by, btnWidth, btnHeight, 24);
    buttonBg.lineStyle(3, C.ink, 0.28);
    buttonBg.strokeRoundedRect(bx, by, btnWidth, btnHeight, 24);

    const buttonText = this.add
      .text(0, 0, 'PLAY', {
        fontFamily: FONT,
        fontSize: '38px',
        color: HEX.ink,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    press.add(buttonBg);
    press.add(buttonText);

    // A slow breath on the primary CTA only. Sine easing eases through both
    // ends, so it reads as something alive rather than a linear machine pulse —
    // and nothing else on the menu moves like it, so the eye lands here.
    this.tweens.add({
      targets: breathe,
      scale: 1.035,
      duration: 1900,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    // Hit area padded past the drawn button so PLAY clears 44 CSS px on a phone.
    const buttonZone = this.add
      .zone(btnCx, btnCy, btnWidth + 24, Math.max(btnHeight, 94))
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    buttonZone.on('pointerdown', () => {
      this.soundManager.unlock();
      // The ambience is a game-wide singleton (see utils/audio.ts), so it keeps
      // looping into GameScene. The Menu deliberately does not stop it on shutdown;
      // only the Settings music toggle does.
      this.soundManager.startAmbience();

      buttonZone.disableInteractive();
      this.pressIn(press);
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('GameScene', { levelIndex: 0 });
      });
    });

    buttonZone.on('pointerover', () => this.hoverTo(press, 1.05));
    buttonZone.on('pointerout', () => this.hoverTo(press, 1));

    // Settings corner icon.
    const settingsZone = this.drawSettingsIcon(width - 48, 48);
    settingsZone.on('pointerdown', () => {
      this.scene.launch('SettingsOverlay', { returnScene: 'Menu' });
      this.scene.pause();
    });

    // Keyboard users can start the game with Space or Enter — no mouse required.
    if (this.input.keyboard) {
      const startGame = () => {
        this.soundManager.unlock();
        this.soundManager.startAmbience();
        this.cameras.main.fadeOut(400, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start('GameScene', { levelIndex: 0 });
        });
      };
      this.input.keyboard.once('keydown-SPACE', startGame);
      this.input.keyboard.once('keydown-ENTER', startGame);
    }

    // Secret test hook for automated verification: ?autostart=1 jumps straight
    // into level 1, bypassing the interactive PLAY button.
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('autostart')) {
      this.soundManager.unlock();
      this.soundManager.startAmbience();
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('GameScene', { levelIndex: 0 });
      });
    }

    for (let i = 0; i < 22; i++) {
      const bubble = this.add.image(
        Phaser.Math.Between(0, width),
        height + Phaser.Math.Between(0, 200),
        'bubble'
      );
      bubble.setAlpha(Phaser.Math.FloatBetween(0.2, 0.55));
      bubble.setScale(Phaser.Math.FloatBetween(0.5, 1.2));

      this.tweens.add({
        targets: bubble,
        y: -60,
        x: `+=${Phaser.Math.Between(-60, 60)}`,
        duration: Phaser.Math.Between(4500, 9500),
        ease: 'Sine.easeInOut',
        repeat: -1,
        delay: Phaser.Math.Between(0, 5000),
      });
    }
  }

  /**
   * Three stacked rounded rects — wider and fainter as they go out — read as one
   * soft ambient shadow. Graphics exposes no blur, and postFX/preFX are WebGL
   * only (the config is Phaser.AUTO and can fall back to Canvas), so nothing
   * readability depends on may use them.
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

  /** Organic hover: eases in, never snaps. */
  private hoverTo(target: Phaser.GameObjects.Container, scale: number): void {
    this.tweens.killTweensOf(target);
    this.tweens.add({
      targets: target,
      scale,
      duration: 220,
      ease: 'Back.easeOut',
    });
  }

  /** Physical press-in, then an overshooting release. */
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
   * The gear is drawn with Graphics rather than set as the `⚙` glyph: emoji and
   * dingbat codepoints render as a flat black outline on Windows and in full
   * colour on iOS, so the same build looked like two different games.
   */
  private drawSettingsIcon(x: number, y: number): Phaser.GameObjects.Zone {
    const plate = this.add.graphics();
    plate.fillStyle(C.hull, 0.86);
    plate.fillCircle(x, y, 24);
    plate.lineStyle(2, C.rim, 0.5);
    plate.strokeCircle(x, y, 24);
    plate.setAlpha(0.85);

    // Positioned rather than drawn in place, so `angle` rotates the gear about
    // its own hub instead of swinging it around the scene origin.
    const gear = this.add.graphics();
    gear.setPosition(x, y);
    this.drawGear(gear, 0, 0, 15, C.sun);

    // 48 design px was only ~23 CSS px on a phone; 94 clears the 44px minimum.
    const zone = this.add
      .zone(x, y, 94, 94)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    // The gear itself spins a little on hover — a state change you can feel,
    // rather than an instant colour swap.
    zone.on('pointerover', () => {
      this.tweens.killTweensOf(gear);
      this.tweens.add({ targets: gear, angle: 45, duration: 420, ease: 'Back.easeOut' });
      this.tweens.add({ targets: plate, alpha: 1, duration: 200, ease: 'Sine.easeOut' });
    });
    zone.on('pointerout', () => {
      this.tweens.killTweensOf(gear);
      this.tweens.add({ targets: gear, angle: 0, duration: 420, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: plate, alpha: 0.85, duration: 200, ease: 'Sine.easeOut' });
    });

    return zone;
  }

  /** Eight-tooth gear: trapezoid teeth around a stroked annulus. */
  private drawGear(
    g: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    radius: number,
    color: number
  ): void {
    const teeth = 8;
    const root = radius * 0.7;
    const half = (Math.PI / teeth) * 0.5;

    g.fillStyle(color, 1);
    for (let i = 0; i < teeth; i++) {
      const a = (i / teeth) * Math.PI * 2;
      g.fillPoints(
        [
          new Phaser.Math.Vector2(cx + Math.cos(a - half) * root, cy + Math.sin(a - half) * root),
          new Phaser.Math.Vector2(
            cx + Math.cos(a - half * 0.62) * radius,
            cy + Math.sin(a - half * 0.62) * radius
          ),
          new Phaser.Math.Vector2(
            cx + Math.cos(a + half * 0.62) * radius,
            cy + Math.sin(a + half * 0.62) * radius
          ),
          new Phaser.Math.Vector2(cx + Math.cos(a + half) * root, cy + Math.sin(a + half) * root),
        ],
        true
      );
    }

    // A stroked ring instead of a filled disc with a punched hole: the plate
    // behind is semi-transparent, so "erasing" a centre would not match it.
    g.lineStyle(radius * 0.36, color, 1);
    g.strokeCircle(cx, cy, root * 0.75);
  }
}

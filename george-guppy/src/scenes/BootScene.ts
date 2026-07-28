import Phaser from 'phaser';
import { DialogueOverlay } from './DialogueOverlay';

/** Which baked light treatment sits on top of a world's colour ramp. */
type BackgroundLight = 'god_rays' | 'lid_shaft' | 'warm_window' | 'wide_rays';

interface BackgroundSpec {
  top: number;
  mid: number;
  /** Where the mid stop sits, 0-1 of the way down the canvas. */
  midStop: number;
  bottom: number;
  light: BackgroundLight;
}

export class BootScene extends Phaser.Scene {
  /**
   * Rim-light colour baked behind every character silhouette. George is
   * #ff8c42 and the top of the Strange Tank is #7fe0f5 — that is 1.59:1, so he
   * all but vanishes there, and no luminance trick can fix it because orange
   * and mid-blue sit at nearly the same luminance. A dark edge can: it costs
   * nothing at runtime, survives the Canvas fallback, and is what premium 2D
   * games have always done.
   */
  private readonly rimColor = 0x04121f;
  /** How far the rim stands proud of the artwork, in texture pixels. */
  private readonly rimSpread = 2;
  /** Stroke width that puts `rimSpread` px outside a centred stroke. */
  private readonly rimStroke = 4;

  /** Every background is baked at the real canvas size — no stretching. */
  private readonly bgWidth = 800;
  private readonly bgHeight = 600;

  constructor() {
    super({ key: 'Boot' });
  }

  preload(): void {
    this.createNoiseTexture();
    this.createGeorgeTexture();
    this.createBubbleTexture();
    this.createNpcSnailTexture();
    this.createNpcMollyTexture();
    this.createNpcFishTexture();
    this.createNpcFrogTexture();
    this.createWallTexture();
    this.createPlantTexture();
    this.createDrainTexture();

    // Strange Tank: bright surface water with sunlight punching down through it.
    this.createBackgroundTexture(
      'bg_strange_tank',
      { top: 0x7fe0f5, mid: 0x2aa3d4, midStop: 0.55, bottom: 0x0c4a75, light: 'god_rays' },
      'background_tank'
    );
    // Dark and cold, to match what the frog actually says about the barrel —
    // it used to be a warm orange, which read as sunlit. One thin shaft comes
    // in past the lid; everything below it is close to black water.
    this.createBackgroundTexture(
      'bg_rain_barrel',
      { top: 0x2f5460, mid: 0x163342, midStop: 0.55, bottom: 0x060f17, light: 'lid_shaft' },
      'background_barrel'
    );
    // Kitchen Sink: bleached porcelain up top falling away into the shadow
    // under the rim, with warm room light coming in from the upper right.
    this.createBackgroundTexture(
      'bg_kitchen_sink',
      { top: 0xf4f1e9, mid: 0xa8b7bf, midStop: 0.5, bottom: 0x4a5a66, light: 'warm_window' },
      'background_sink'
    );
    // Homecoming: warm dawn over the tank, cooling to deep water at the floor.
    this.createBackgroundTexture('bg_homecoming', {
      top: 0xffe3a8,
      mid: 0x4fc7be,
      midStop: 0.48,
      bottom: 0x0d5468,
      light: 'wide_rays',
    });
  }

  create(): void {
    const width = this.scale.width;
    const height = this.scale.height;

    const background = this.add.graphics();
    background.fillStyle(0x0b1d2e);
    background.fillRect(0, 0, width, height);

    const barWidth = 320;
    const barHeight = 22;
    const barX = width / 2 - barWidth / 2;
    const barY = height / 2;

    // Track fill with a lively animated stripe.
    const barBackground = this.add.graphics();
    barBackground.fillStyle(0x1f3a52);
    barBackground.fillRoundedRect(barX, barY, barWidth, barHeight, 11);
    barBackground.lineStyle(2, 0x3c6e8f, 1);
    barBackground.strokeRoundedRect(barX, barY, barWidth, barHeight, 11);

    const bar = this.add.graphics();
    bar.fillStyle(0x62c4f5);
    bar.fillRoundedRect(barX, barY, barWidth * 0.6, barHeight, 11);

    // Simulate the remaining fill so the bar feels like real loading.
    this.tweens.add({
      targets: {},
      duration: 450,
      onUpdate: (tween: Phaser.Tweens.Tween) => {
        const progress = 0.6 + (tween.getValue() ?? 0) * 0.4;
        bar.clear();
        bar.fillStyle(0x62c4f5);
        bar.fillRoundedRect(barX, barY, barWidth * progress, barHeight, 11);
      },
    });

    this.add
      .text(width / 2, barY - 38, 'George is waking up…', {
        fontSize: '22px',
        color: '#a8d8f0',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, barY + 36, 'Book 1: The Water Has Opinions', {
        fontSize: '16px',
        color: '#74a7c4',
      })
      .setOrigin(0.5);

    // Register the overlay scene without starting it so GameScene can launch it on demand.
    this.scene.add('DialogueOverlay', DialogueOverlay);

    this.time.delayedCall(900, () => {
      this.scene.start('Menu');
    });
  }

  // --- Rim-light helpers ------------------------------------------------------
  //
  // Everything a character is made of gets stamped once in `rimColor`, slightly
  // larger than the artwork, BEFORE any colour goes down. The coloured fills
  // then cover all of it except a 2px dark edge, so the whole silhouette reads
  // against any background without touching a single canon colour.

  /**
   * Dilate a filled polygon by `rimSpread` px by stamping it around a ring.
   * A thick stroke would be shorter code but throws long miter spikes off the
   * sharp fin tips, and those spikes clip against the texture edge.
   */
  private rimPoly(g: Phaser.GameObjects.Graphics, points: number[][]): void {
    g.fillStyle(this.rimColor, 1);
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI) / 6;
      const ox = Math.cos(angle) * this.rimSpread;
      const oy = Math.sin(angle) * this.rimSpread;
      g.beginPath();
      g.moveTo(points[0][0] + ox, points[0][1] + oy);
      for (let p = 1; p < points.length; p++) {
        g.lineTo(points[p][0] + ox, points[p][1] + oy);
      }
      g.closePath();
      g.fillPath();
    }
  }

  private fillPoly(g: Phaser.GameObjects.Graphics, points: number[][], color: number): void {
    g.fillStyle(color, 1);
    g.beginPath();
    g.moveTo(points[0][0], points[0][1]);
    for (let p = 1; p < points.length; p++) {
      g.lineTo(points[p][0], points[p][1]);
    }
    g.closePath();
    g.fillPath();
  }

  private rimEllipse(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    g.fillStyle(this.rimColor, 1);
    g.fillEllipse(x, y, width, height);
    g.lineStyle(this.rimStroke, this.rimColor, 1);
    g.strokeEllipse(x, y, width, height);
  }

  private rimCircle(g: Phaser.GameObjects.Graphics, x: number, y: number, radius: number): void {
    g.fillStyle(this.rimColor, 1);
    g.fillCircle(x, y, radius);
    g.lineStyle(this.rimStroke, this.rimColor, 1);
    g.strokeCircle(x, y, radius);
  }

  private rimRoundedRect(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    g.fillStyle(this.rimColor, 1);
    g.fillRoundedRect(x, y, width, height, radius);
    g.lineStyle(this.rimStroke, this.rimColor, 1);
    g.strokeRoundedRect(x, y, width, height, radius);
  }

  private createGeorgeTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    // George is an orange guppy with a cobalt tail and dorsal fin, both spotted
    // emerald — that colouring is how the books draw him, so it is not optional.
    // Fins go down first and the orange body covers their roots.
    const cobalt = 0x2a52be;
    const emerald = 0x2ecc71;

    // The artwork sits at (+2, +3) inside a 68x46 frame so the rim light has
    // room at the tail tips. The body ellipse still sits +2px right of the
    // frame centre, exactly where it did in the old 64x40 frame, so George does
    // not move or change size on screen — only the transparent margin grew.
    //
    // Forked cobalt tail. He swims to the right, so it trails off to the left.
    // The root is a wide edge tucked under the body rather than a single point
    // — as a point it read as a detached shard floating behind him.
    const tail = [
      [26, 15],
      [4, 3],
      [10, 23],
      [4, 43],
      [26, 31],
    ];

    // Cobalt dorsal fin. Its leading edge used to be a bare triangle whose
    // underside floated above the back, leaving a hairline of background
    // between fin and fish. The root now runs along the top of the body and
    // into the tail, the same way the tail root is tucked under the body, so
    // the silhouette is one connected shape. The upper edge is unchanged, so
    // the fin still reads exactly as it did from the outside.
    const dorsal = [
      [20, 4],
      [43, 12],
      [38, 14],
      [30, 13],
      [24, 14.5],
      [19, 12],
    ];

    // Rim light first: the entire silhouette in near-black, 2px proud.
    this.rimPoly(g, tail);
    this.rimPoly(g, dorsal);
    this.rimEllipse(g, 36, 23, 38, 26);
    this.rimCircle(g, 46, 19, 8);

    this.fillPoly(g, tail, cobalt);
    this.fillPoly(g, dorsal, cobalt);

    // Emerald spots. Kept few and fat on purpose: George is drawn about 31x20
    // CSS px on a phone, and the original scatter of r1.3 dots dissolved into
    // single stray pixels that read as noise rather than as his markings.
    g.fillStyle(emerald);
    g.fillCircle(13, 13, 2.4);
    g.fillCircle(18, 15, 1.8);
    g.fillCircle(13, 33, 2.4);
    g.fillCircle(18, 31, 1.8);
    g.fillCircle(32, 10, 1.8);

    g.fillStyle(0xff8c42);
    g.fillEllipse(36, 23, 38, 26);

    g.fillStyle(0xffa94d);
    g.fillEllipse(32, 36, 14, 6);
    g.fillEllipse(40, 29, 10, 6);

    g.fillStyle(0xffffff);
    g.fillCircle(46, 19, 8);
    g.fillStyle(0x222222);
    g.fillCircle(48, 19, 3.5);

    // The scowl — heavy brow and a downturned mouth. George is cranky before
    // anything has actually happened to him.
    g.lineStyle(3, 0x5a2d0c);
    g.beginPath();
    g.moveTo(39, 12);
    g.lineTo(52, 16);
    g.strokePath();

    g.lineStyle(2, 0x5a2d0c);
    g.beginPath();
    g.moveTo(52, 30);
    g.lineTo(46, 28);
    g.strokePath();

    g.generateTexture('george', 68, 46);
  }

  private createBubbleTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    // A dark ring rather than a dark disc: the bubble body is translucent, so a
    // filled rim would show straight through and turn the glass murky. The
    // glass is r14 inside an unchanged r16 footprint, so the frame stays 36x36
    // and every particle emitter that uses this texture keeps its old size.
    g.lineStyle(this.rimStroke, this.rimColor, 0.55);
    g.strokeCircle(18, 18, 14);

    g.fillStyle(0xbfdfff, 0.35);
    g.fillCircle(18, 18, 14);

    g.fillStyle(0xffffff, 0.55);
    g.fillCircle(13, 13, 3.5);

    g.lineStyle(2, 0xffffff, 0.5);
    g.strokeCircle(18, 18, 13);

    g.generateTexture('bubble', 36, 36);
  }

  private createNpcSnailTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    // Artwork offset by (+2, +2) inside a 56x40 frame to make room for the rim.
    this.rimEllipse(g, 32, 28, 28, 12);
    this.rimCircle(g, 20, 20, 16);

    g.fillStyle(0xc2b280);
    g.fillEllipse(32, 28, 28, 12);

    g.fillStyle(0x6b8e6b);
    g.fillCircle(20, 20, 16);

    g.lineStyle(2, 0x3a4a3a);
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      g.arc(20, 20, 5 + i * 4, Math.PI / 4, Math.PI * 2 + Math.PI / 4 + i * 0.4, false);
      g.strokePath();
    }

    // Eye stalks get the rim last so they stay separated from the foot they
    // grow out of.
    g.lineStyle(2 + this.rimStroke, this.rimColor, 1);
    g.beginPath();
    g.moveTo(40, 24);
    g.lineTo(46, 16);
    g.moveTo(40, 28);
    g.lineTo(46, 32);
    g.strokePath();

    g.lineStyle(2, 0x8b7355);
    g.beginPath();
    g.moveTo(40, 24);
    g.lineTo(46, 16);
    g.moveTo(40, 28);
    g.lineTo(46, 32);
    g.strokePath();

    g.generateTexture('npc_snail', 56, 40);
    // Alias used by level data (kept in sync with npc_snail art).
    g.generateTexture('snail', 56, 40);
  }

  private createNpcMollyTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    const tail = [
      [10, 18],
      [2, 8],
      [2, 28],
    ];

    this.rimPoly(g, tail);
    this.rimEllipse(g, 25, 18, 34, 20);
    this.rimCircle(g, 31, 14, 5);

    g.fillStyle(0x5c6b73);
    g.fillEllipse(25, 18, 34, 20);
    this.fillPoly(g, tail, 0x5c6b73);

    g.fillStyle(0xced4da);
    g.fillEllipse(25, 22, 24, 10);

    g.fillStyle(0xffffff);
    g.fillCircle(31, 14, 5);
    g.fillStyle(0x111111);
    g.fillCircle(33, 14, 2);

    g.generateTexture('molly', 50, 38);
    // Legacy aliases kept for any downstream texture catalogue checks.
    g.generateTexture('npc_sponge', 50, 38);
    g.generateTexture('sponge', 50, 38);
  }

  private createNpcFishTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    const fin = [
      [10, 18],
      [2, 8],
      [2, 28],
    ];

    this.rimPoly(g, fin);
    this.rimEllipse(g, 25, 18, 34, 20);
    this.rimCircle(g, 31, 14, 5);

    g.fillStyle(0xff6f61);
    g.fillEllipse(25, 18, 34, 20);

    this.fillPoly(g, fin, 0xff6f61);

    g.fillStyle(0xffffff);
    g.fillCircle(31, 14, 5);
    g.fillStyle(0x111111);
    g.fillCircle(33, 14, 2);

    g.generateTexture('npc_fish', 50, 38);
  }

  private createWallTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    g.fillStyle(0x35546e);
    g.fillRoundedRect(0, 0, 40, 40, 10);

    g.lineStyle(2, 0x5b8bad);
    g.strokeRoundedRect(0, 0, 40, 40, 10);

    g.generateTexture('wall', 40, 40);
  }

  private strokeQuadratic(
    g: Phaser.GameObjects.Graphics,
    x0: number,
    y0: number,
    cx: number,
    cy: number,
    x1: number,
    y1: number,
    points = 12
  ): void {
    const curve = new Phaser.Curves.QuadraticBezier(
      new Phaser.Math.Vector2(x0, y0),
      new Phaser.Math.Vector2(cx, cy),
      new Phaser.Math.Vector2(x1, y1)
    );
    curve.draw(g, points);
  }

  private createPlantTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    g.lineStyle(5, 0x2e8b57);
    this.strokeQuadratic(g, 20, 70, 6, 50, 22, 30, 12);
    this.strokeQuadratic(g, 22, 30, 34, 10, 20, 0, 12);

    g.fillStyle(0x3cb371);
    g.fillEllipse(20, 18, 12, 6);
    g.fillEllipse(24, 40, 8, 5);
    g.fillEllipse(16, 52, 8, 5);

    g.generateTexture('plant', 40, 72);
  }

  private createDrainTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    // Bright warning rim first. The drain is the one thing a child is told to
    // avoid, and as a dark spiral it disappeared entirely against the (now
    // correctly dark) Bog. The rim keeps it legible on any background.
    g.fillStyle(0xffd166);
    g.fillCircle(24, 24, 24);
    g.fillStyle(0x1c1c1c);
    g.fillCircle(24, 24, 21);

    g.lineStyle(3, 0x8a949c);
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.arc(24, 24, 6 + i * 5, 0, Math.PI * 1.5);
      g.strokePath();
    }

    g.lineStyle(2, 0x0f0f0f);
    g.strokeCircle(24, 24, 14);

    g.generateTexture('drain', 48, 48);
  }

  private createNpcFrogTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    // The eyes used to sit about 4px clear of the head, which the new rim would
    // have turned into two obviously detached bubbles. They now overlap the
    // head so the frog is a single connected silhouette.
    this.rimEllipse(g, 24, 34, 40, 16);
    this.rimEllipse(g, 24, 28, 24, 10);
    this.rimCircle(g, 18, 17, 7);
    this.rimCircle(g, 30, 17, 7);

    g.fillStyle(0x66bb44);
    g.fillEllipse(24, 34, 40, 16);

    g.fillStyle(0x88dd66);
    g.fillEllipse(24, 28, 24, 10);

    g.fillStyle(0x99ee77);
    g.fillCircle(18, 17, 7);
    g.fillCircle(30, 17, 7);

    g.fillStyle(0x111111);
    g.fillCircle(19, 17, 2.5);
    g.fillCircle(31, 17, 2.5);

    g.lineStyle(2 + this.rimStroke, this.rimColor, 1);
    g.beginPath();
    g.moveTo(20, 36);
    g.lineTo(12, 42);
    g.moveTo(28, 36);
    g.lineTo(36, 42);
    g.strokePath();

    g.lineStyle(2, 0x448833);
    g.beginPath();
    g.moveTo(20, 36);
    g.lineTo(12, 42);
    g.moveTo(28, 36);
    g.lineTo(36, 42);
    g.strokePath();

    g.generateTexture('frog', 48, 48);
    // Alias kept in step with the npc_* naming the other NPCs use.
    g.generateTexture('npc_frog', 48, 48);
  }

  // --- Backgrounds ------------------------------------------------------------

  /**
   * A soft radial blob. Graphics has no radial gradient, so this stacks
   * concentric discs at a fraction of the target alpha — the overlap count
   * falls off linearly with radius, which is the falloff we want. Baked once at
   * boot, so the disc count costs nothing at runtime.
   */
  private softRadial(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    radius: number,
    color: number,
    alpha: number,
    steps = 22
  ): void {
    const per = 1 - Math.pow(1 - alpha, 1 / steps);
    g.fillStyle(color, per);
    for (let i = steps; i > 0; i--) {
      g.fillCircle(x, y, (radius * i) / steps);
    }
  }

  /**
   * A tilted light shaft that feathers at the sides (nested quads) and fades
   * out as it travels down (sliced quads). Slices overlap by a pixel so the
   * antialiased seams between them never show as hairlines.
   */
  private softShaft(
    g: Phaser.GameObjects.Graphics,
    x: number,
    topWidth: number,
    angleDeg: number,
    color: number,
    alpha: number,
    layers = 4,
    slices = 24
  ): void {
    const per = 1 - Math.pow(1 - alpha, 1 / layers);
    const drift = Math.tan((angleDeg * Math.PI) / 180);
    const height = this.bgHeight;

    for (let layer = layers; layer > 0; layer--) {
      const widthScale = layer / layers;
      for (let slice = 0; slice < slices; slice++) {
        const t0 = slice / slices;
        const t1 = (slice + 1) / slices;
        // Beams spread a little and dim a lot the further they travel.
        const fade = (1 - t0) * (1 - t0);
        const y0 = t0 * height;
        const y1 = t1 * height + 1;
        const w0 = (topWidth * widthScale * (1 + t0 * 0.8)) / 2;
        const w1 = (topWidth * widthScale * (1 + t1 * 0.8)) / 2;
        const c0 = x + drift * y0;
        const c1 = x + drift * y1;

        g.fillStyle(color, per * fade);
        g.beginPath();
        g.moveTo(c0 - w0, y0);
        g.lineTo(c0 + w0, y0);
        g.lineTo(c1 + w1, y1);
        g.lineTo(c1 - w1, y1);
        g.closePath();
        g.fillPath();
      }
    }
  }

  private paintBackgroundLight(g: Phaser.GameObjects.Graphics, light: BackgroundLight): void {
    switch (light) {
      case 'god_rays':
        this.softRadial(g, 220, 70, 380, 0xcff6ff, 0.1);
        this.softRadial(g, 630, 470, 400, 0x2aa3d4, 0.08);
        this.softRadial(g, 60, 560, 300, 0x0c4a75, 0.06);
        this.softShaft(g, 150, 90, 12, 0xcff6ff, 0.07);
        this.softShaft(g, 370, 140, 12, 0xcff6ff, 0.07);
        this.softShaft(g, 640, 70, 12, 0xcff6ff, 0.07);
        break;

      case 'lid_shaft':
        this.softRadial(g, 170, 60, 320, 0xbfe9ff, 0.09);
        this.softRadial(g, 610, 500, 380, 0x060f17, 0.1);
        this.softRadial(g, 420, 300, 260, 0x2f5460, 0.06);
        this.softShaft(g, 120, 74, 20, 0xbfe9ff, 0.1);
        break;

      case 'warm_window':
        this.softRadial(g, 660, 100, 460, 0xffb870, 0.1);
        this.softRadial(g, 180, 220, 340, 0xf4f1e9, 0.08);
        this.softRadial(g, 360, 570, 380, 0x4a5a66, 0.07);
        break;

      case 'wide_rays':
        this.softRadial(g, 620, 90, 420, 0xffe3a8, 0.1);
        this.softRadial(g, 170, 400, 360, 0x4fc7be, 0.07);
        this.softRadial(g, 480, 580, 320, 0x0d5468, 0.06);
        this.softShaft(g, 250, 200, 9, 0xffe9c4, 0.09);
        this.softShaft(g, 540, 250, 9, 0xffe9c4, 0.09);
        this.softShaft(g, 740, 170, 9, 0xffe9c4, 0.09);
        break;
    }
  }

  /**
   * Bakes one world background. The old version drew a two-stop ramp into a
   * 512x512 texture and let the GPU stretch it to 800x600 — that stretch is
   * where the banding and the washed-out mush came from. This draws the real
   * 800x600, uses a three-stop ramp, and bakes soft radial blobs and light
   * shafts into the same texture, which is the modern soft-gradient look.
   *
   * `alias` lets a legacy key share the art without redrawing it, exactly like
   * the npc_snail/snail pair.
   */
  private createBackgroundTexture(key: string, spec: BackgroundSpec, alias?: string): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    const width = this.bgWidth;
    const height = this.bgHeight;

    const top = Phaser.Display.Color.ValueToColor(spec.top);
    const mid = Phaser.Display.Color.ValueToColor(spec.mid);
    const bottom = Phaser.Display.Color.ValueToColor(spec.bottom);
    const midY = Math.max(1, Math.min(height - 2, Math.round((height - 1) * spec.midStop)));

    for (let y = 0; y < height; y++) {
      const interpolated =
        y <= midY
          ? Phaser.Display.Color.Interpolate.ColorWithColor(top, mid, midY, y)
          : Phaser.Display.Color.Interpolate.ColorWithColor(
              mid,
              bottom,
              height - 1 - midY,
              y - midY
            );
      const c = Phaser.Display.Color.GetColor(interpolated.r, interpolated.g, interpolated.b);
      g.fillStyle(c, 1);
      g.fillRect(0, y, width, 1);
    }

    this.paintBackgroundLight(g, spec.light);

    g.generateTexture(key, width, height);
    if (alias) {
      g.generateTexture(alias, width, height);
    }
  }

  /**
   * One tileable grain tile. Overlaid at roughly 5% alpha it makes a flat fill
   * read as a material and, more usefully, dithers away the last of the
   * gradient banding for free. Per-pixel noise has no structure, so the tile
   * repeats without a visible seam. Nothing is wired up here — scenes opt in.
   */
  private createNoiseTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    const size = 128;
    const cell = 2;

    // Seeded so the grain is byte-identical on every boot and every device
    // rather than shimmering differently each run.
    let seed = 0x9e3779b9;
    const rand = (): number => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return (seed >>> 8) / 16777216;
    };

    for (let y = 0; y < size; y += cell) {
      for (let x = 0; x < size; x += cell) {
        // Mixed light and dark specks, so one tile works over the pale top of
        // the Strange Tank and over the near-black Bog alike.
        const shade = rand() < 0.5 ? 0x000000 : 0xffffff;
        g.fillStyle(shade, 0.12 + rand() * 0.5);
        g.fillRect(x, y, cell, cell);
      }
    }

    g.generateTexture('noise', size, size);
  }
}

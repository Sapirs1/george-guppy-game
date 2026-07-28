import Phaser from 'phaser';
import { Player } from '../objects/Player.js';
import { NPC } from '../objects/NPC.js';
import { Bubble } from '../objects/Bubble.js';
import { MissionPanel } from '../objects/MissionPanel.js';
import { levels } from '../data/levels.js';
import { SoundManager } from '../utils/SoundManager.js';

interface GameSceneInitData {
  levelIndex?: number;
}

interface NpcInteractEvent {
  dialogKey: string;
  npc: NPC;
}

/**
 * The object type Arcade Physics actually hands to a collide/overlap callback.
 * Broader than `GameObject` (it also covers raw bodies and tiles), so handlers
 * must declare this and narrow to their concrete type inside.
 */
type ArcadeCollisionObject = Parameters<Phaser.Types.Physics.Arcade.ArcadePhysicsCallback>[0];

/**
 * GameScene – the main gameplay scene for George the Cranky Guppy.
 *
 * Loads a level, builds walls, bubbles, NPCs and hazards, handles tap-to-swim
 * movement, bubble collection, hazard bumps, dialogue overlays and level
 * transitions.
 */
export class GameScene extends Phaser.Scene {
  private levelIndex = 0;
  private player!: Player;
  private bubbles!: Phaser.Physics.Arcade.Group;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private npcs!: Phaser.Physics.Arcade.Group;
  private hazards!: Phaser.Physics.Arcade.StaticGroup;
  private backgroundImage!: Phaser.GameObjects.Image;
  private uiText!: Phaser.GameObjects.Text;
  private uiBackdrop!: Phaser.GameObjects.Graphics;
  private pauseButtonBg!: Phaser.GameObjects.Graphics;
  private pauseButtonZone!: Phaser.GameObjects.Zone;
  private missionPanel!: MissionPanel;
  private overlayActive = false;
  private victoryPending = false;
  private levelCompleteTriggered = false;
  private overlayShutdownCb?: () => void;
  private hazardCooldown = false;
  private colliders: Phaser.Physics.Arcade.Collider[] = [];
  private totalBubbles = 0;
  private bubblesCollected = 0;
  private soundManager!: SoundManager;
  private bubbleChain = 0;
  private bubbleChainTimer?: Phaser.Time.TimerEvent;
  private bubbleBurstEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;
  private hazardSparkEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;
  private victoryEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;

  // Keyboard controls mirror tap-to-swim: holding a direction swims that way;
  // releasing stops George. Arrow keys, WASD and the numeric keypad all work.
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: Record<string, Phaser.Input.Keyboard.Key>;
  private numpad?: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    upLeft: Phaser.Input.Keyboard.Key;
    upRight: Phaser.Input.Keyboard.Key;
    downLeft: Phaser.Input.Keyboard.Key;
    downRight: Phaser.Input.Keyboard.Key;
  };
  private keyboardSwimming = false;

  // Sized for legibility once Scale.FIT halves everything on a phone: the HUD
  // text was 16px design == ~7 CSS px on a 390px screen, which no child can read.
  private readonly uiBackdropWidth = 300;
  private readonly uiBackdropHeight = 86;
  private readonly pauseButtonSize = 56;
  /** Extra clearance, beyond touching, before an NPC can start talking again. */
  private readonly npcReArmMargin = 24;
  private readonly victoryFlashDuration = 300;
  /**
   * How long a pop chain survives without a pop before it quietly restarts at the
   * root note. The reset is deliberately silent and invisible — no "streak lost" sting,
   * no counter to watch drain. Nobody can lose this game, so nothing is ever taken away;
   * the chime just starts climbing again from the bottom.
   */
  private readonly bubbleChainResetDelay = 2500;
  /** Particles draw above George and the bubbles, below the HUD. */
  private readonly particleDepth = 5;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: GameSceneInitData): void {
    this.levelIndex =
      typeof data?.levelIndex === 'number' && Number.isFinite(data.levelIndex)
        ? data.levelIndex
        : 0;

    this.levelIndex = Phaser.Math.Clamp(this.levelIndex, 0, Math.max(levels.length - 1, 0));
    this.overlayActive = false;
    this.victoryPending = false;
    this.levelCompleteTriggered = false;
    this.hazardCooldown = false;
    this.colliders = [];
    this.totalBubbles = 0;
    this.bubblesCollected = 0;
    this.bubbleChain = 0;
    this.bubbleChainTimer = undefined;
  }

  create(): void {
    const level = levels[this.levelIndex];
    if (!level) {
      console.warn(`GameScene: no level at index ${this.levelIndex}; returning to menu.`);
      this.scene.start('Menu');
      return;
    }

    this.soundManager = new SoundManager(this);
    this.buildWorld(level);
    this.buildParticles();
    this.buildWalls(level);
    this.buildPlayer(level);
    this.buildBubbles(level);
    this.buildNpcs(level);
    this.buildHazards(level);
    this.buildUi(level);
    this.bindInput();
    this.setupKeyboardInput();
    this.bindDialogueEvents();

    // Phaser never calls a Scene subclass's shutdown() on its own, so the cleanup
    // below has to be wired to the scene's SHUTDOWN event explicitly.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
  }

  /** Wire up arrow keys, WASD and the numeric keypad. */
  private setupKeyboardInput(): void {
    if (!this.input.keyboard) {
      return;
    }

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,S,A,D') as Record<string, Phaser.Input.Keyboard.Key>;

    const kb = this.input.keyboard;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.numpad = {
      up: kb.addKey(K.NUMPAD_EIGHT),
      down: kb.addKey(K.NUMPAD_TWO),
      left: kb.addKey(K.NUMPAD_FOUR),
      right: kb.addKey(K.NUMPAD_SIX),
      upLeft: kb.addKey(K.NUMPAD_SEVEN),
      upRight: kb.addKey(K.NUMPAD_NINE),
      downLeft: kb.addKey(K.NUMPAD_ONE),
      downRight: kb.addKey(K.NUMPAD_THREE),
    };
  }

  /**
   * Map held keys to a swim direction. We set a far-away target so the existing
   * arrival-easing move code is reused; when the keys are released the target snaps
   * back to George's current position and he coasts to a stop.
   */
  private handleKeyboardControls(): void {
    if (!this.player?.active || this.overlayActive || this.levelCompleteTriggered) {
      if (this.keyboardSwimming) {
        this.keyboardSwimming = false;
      }
      return;
    }

    let dx = 0;
    let dy = 0;

    if (this.cursors?.left.isDown || this.wasd?.A.isDown || this.numpad?.left.isDown || this.numpad?.upLeft.isDown || this.numpad?.downLeft.isDown) {
      dx -= 1;
    }
    if (this.cursors?.right.isDown || this.wasd?.D.isDown || this.numpad?.right.isDown || this.numpad?.upRight.isDown || this.numpad?.downRight.isDown) {
      dx += 1;
    }
    if (this.cursors?.up.isDown || this.wasd?.W.isDown || this.numpad?.up.isDown || this.numpad?.upLeft.isDown || this.numpad?.upRight.isDown) {
      dy -= 1;
    }
    if (this.cursors?.down.isDown || this.wasd?.S.isDown || this.numpad?.down.isDown || this.numpad?.downLeft.isDown || this.numpad?.downRight.isDown) {
      dy += 1;
    }

    if (dx !== 0 || dy !== 0) {
      const length = Math.hypot(dx, dy) || 1;
      const far = 3000;
      this.player.swimTo(
        this.player.x + (dx / length) * far,
        this.player.y + (dy / length) * far
      );
      this.keyboardSwimming = true;
    } else if (this.keyboardSwimming) {
      // Keys just released: bring George to a glide stop instead of leaving the
      // last distant target pulling him toward the edge of the world.
      this.player.swimTo(this.player.x, this.player.y);
      this.keyboardSwimming = false;
    }
  }

  shutdown(): void {
    this.input.off('pointerdown', this.handlePointerDown, this);
    this.events.off('npcInteract', this.handleNpcInteract, this);

    for (const collider of this.colliders) {
      collider.destroy();
    }
    this.colliders = [];

    this.bubbleChainTimer?.remove();
    this.bubbleChainTimer = undefined;
    this.bubbleChain = 0;

    this.bubbleBurstEmitter?.destroy();
    this.bubbleBurstEmitter = undefined;
    this.hazardSparkEmitter?.destroy();
    this.hazardSparkEmitter = undefined;
    this.victoryEmitter?.destroy();
    this.victoryEmitter = undefined;

    this.bubbles?.destroy(true, true);
    this.npcs?.destroy(true, true);
    this.walls?.destroy(true, true);
    this.hazards?.destroy(true, true);
    this.player?.destroy();
    this.backgroundImage?.destroy();
    this.uiText?.destroy();
    this.uiBackdrop?.destroy();
    this.pauseButtonBg?.destroy();
    this.pauseButtonZone?.destroy();
    this.missionPanel?.destroy();

    const overlay = this.scene.get('DialogueOverlay');
    if (overlay && this.overlayShutdownCb) {
      overlay.events.off('shutdown', this.overlayShutdownCb);
      this.overlayShutdownCb = undefined;
    }
    this.scene.stop('DialogueOverlay');
  }

  private buildWorld(level: (typeof levels)[number]): void {
    this.physics.world.setBounds(0, 0, level.width, level.height);

    this.cameras.main.setBounds(0, 0, level.width, level.height);
    this.cameras.main.fadeIn(300);

    this.backgroundImage = this.add
      .image(level.width / 2, level.height / 2, level.backgroundKey)
      .setDisplaySize(level.width, level.height)
      .setDepth(-1);
  }

  /**
   * Builds the two reusable particle emitters once per level.
   *
   * These used to be allocated per event — a brand new ParticleEmitter GameObject, and
   * therefore its own pipeline batch, for *every single bubble pop*, destroyed 250ms
   * later. On a mid-range phone that is pure GC churn during exactly the moment the
   * game should feel smoothest. Pooling them means popping a whole level allocates
   * nothing after create(); `explode()` just recycles dead particles.
   *
   * The alive caps below keep the worst case (a fast pop chain plus a hazard bump)
   * under ~90 live particles.
   */
  private buildParticles(): void {
    this.bubbleBurstEmitter = this.add.particles(0, 0, 'bubble', {
      speed: { min: 60, max: 160 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.8, end: 0 },
      lifespan: 200,
      maxAliveParticles: 64,
      emitting: false,
    });
    this.bubbleBurstEmitter.setDepth(this.particleDepth);

    this.hazardSparkEmitter = this.add.particles(0, 0, 'bubble', {
      speed: { min: 40, max: 100 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.3, end: 0 },
      alpha: { start: 0.7, end: 0 },
      lifespan: 180,
      // Pale blue, not the old near-black 0x220000. Dark red specks read as soot and
      // damage; the drain is meant to be funny, not threatening.
      tint: 0xbfe9ff,
      maxAliveParticles: 24,
      emitting: false,
    });
    this.hazardSparkEmitter.setDepth(this.particleDepth);
  }

  private buildWalls(level: (typeof levels)[number]): void {
    this.walls = this.physics.add.staticGroup();

    for (const wall of level.walls) {
      const sprite = this.walls.create(wall.x, wall.y, 'wall') as Phaser.Physics.Arcade.Sprite;
      sprite.setTint(0x486580);
      sprite.setAlpha(0.95);
      sprite.refreshBody();
    }
  }

  private buildPlayer(level: (typeof levels)[number]): void {
    this.player = new Player(this, level.playerStart.x, level.playerStart.y);

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setCircle(14, 18, 6);

    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

    this.colliders.push(this.physics.add.collider(this.player, this.walls));
  }

  private buildBubbles(level: (typeof levels)[number]): void {
    this.bubbles = this.physics.add.group({ classType: Bubble, allowGravity: false });

    for (const bubbleData of level.bubbles) {
      const bubble = new Bubble(this, bubbleData.x, bubbleData.y, bubbleData.text);
      this.bubbles.add(bubble);
    }

    this.colliders.push(
      this.physics.add.overlap(
        this.player,
        this.bubbles,
        this.handleBubbleOverlap,
        undefined,
        this
      )
    );
  }

  private buildNpcs(level: (typeof levels)[number]): void {
    this.npcs = this.physics.add.group({ allowGravity: false });

    for (const npcData of level.npcs) {
      const npc = new NPC(this, npcData.x, npcData.y, npcData.texture, npcData.dialogKey);
      this.npcs.add(npc);
    }

    this.colliders.push(
      this.physics.add.overlap(
        this.player,
        this.npcs,
        this.handleNpcOverlap,
        undefined,
        this
      )
    );
  }

  private buildHazards(level: (typeof levels)[number]): void {
    this.hazards = this.physics.add.staticGroup();

    if (!level.hazards) {
      return;
    }

    for (const hazard of level.hazards) {
      const sprite = this.hazards.create(hazard.x, hazard.y, hazard.texture) as Phaser.Physics.Arcade.Sprite;
      sprite.refreshBody();
    }

    this.colliders.push(
      this.physics.add.collider(
        this.player,
        this.hazards,
        this.handleHazardCollision,
        undefined,
        this
      )
    );
  }

  private buildUi(level: (typeof levels)[number]): void {
    const levelName = level.name ?? `Level ${this.levelIndex + 1}`;
    this.totalBubbles = this.bubbles?.countActive(true) ?? 0;
    this.bubblesCollected = 0;

    this.uiBackdrop = this.add.graphics();
    this.uiBackdrop.fillStyle(0x0b1d2e, 0.82);
    this.uiBackdrop.fillRoundedRect(10, 10, this.uiBackdropWidth, this.uiBackdropHeight, 14);
    this.uiBackdrop.lineStyle(3, 0x62c4f5, 0.6);
    this.uiBackdrop.strokeRoundedRect(10, 10, this.uiBackdropWidth, this.uiBackdropHeight, 14);
    this.uiBackdrop.setScrollFactor(0);

    // Bubble icon on the HUD panel.
    const bubbleIcon = this.add.graphics();
    bubbleIcon.fillStyle(0x62c4f5, 1);
    bubbleIcon.fillCircle(38, 52, 16);
    bubbleIcon.setScrollFactor(0).setDepth(101);

    this.uiText = this.add
      // Starts at 0 collected — passing totalBubbles here made a fresh level
      // open on a full "Bubbles: 3 / 3" counter until the first bubble popped.
      .text(66, 24, this.formatUiText(levelName, this.bubblesCollected), {
        fontSize: '24px',
        color: '#d0efff',
        lineSpacing: 4,
        fontStyle: 'bold',
      })
      .setScrollFactor(0)
      .setDepth(100);

    this.pauseButtonBg = this.add.graphics();
    this.drawPauseButton();

    // Hit area is deliberately larger than the drawn button — at the ~0.49
    // scale a phone gets, a 56px button is only ~27 CSS px, well under the
    // 44px minimum for a small finger.
    this.pauseButtonZone = this.add
      .zone(
        this.scale.width - this.pauseButtonSize / 2 - 12,
        this.pauseButtonSize / 2 + 12,
        this.pauseButtonSize + 38,
        this.pauseButtonSize + 38
      )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setScrollFactor(0)
      .setDepth(102);

    this.pauseButtonZone.on('pointerdown', () => {
      if (this.overlayActive || this.levelCompleteTriggered) {
        return;
      }
      this.scene.launch('PauseOverlay', { levelIndex: this.levelIndex });
      this.scene.pause();
    });

    this.uiBackdrop.setDepth(99);

    // Objective panel inspired by Om Nom Run's MissionPanelSmall.
    const objective = level.objective ?? `Collect all bubbles in ${levelName}`;
    this.missionPanel = new MissionPanel(this, objective);
  }

  private drawPauseButton(): void {
    // Top-RIGHT. It used to sit at (12,12), directly underneath the HUD panel
    // and its bubble icon, which are drawn at a higher depth — so the pause
    // control was completely invisible even though it still responded to taps.
    const size = this.pauseButtonSize;
    const x = this.scale.width - size - 12;
    const y = 12;
    this.pauseButtonBg.clear();
    this.pauseButtonBg.fillStyle(0x1a3a52, 0.9);
    this.pauseButtonBg.fillRoundedRect(x, y, size, size, 10);
    this.pauseButtonBg.lineStyle(2, 0x62c4f5, 0.7);
    this.pauseButtonBg.strokeRoundedRect(x, y, size, size, 10);
    // Draw two pause bars.
    this.pauseButtonBg.fillStyle(0xffffff, 1);
    this.pauseButtonBg.fillRoundedRect(x + 17, y + 15, 7, 26, 2);
    this.pauseButtonBg.fillRoundedRect(x + 32, y + 15, 7, 26, 2);
    this.pauseButtonBg.setScrollFactor(0).setDepth(100);
  }

  private bindInput(): void {
    this.input.on('pointerdown', this.handlePointerDown, this);
  }

  private bindDialogueEvents(): void {
    this.events.on('npcInteract', this.handleNpcInteract, this);
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.overlayActive || this.levelCompleteTriggered) {
      return;
    }

    // Ignore clicks on the HUD panel (top-left) in screen (camera) space.
    if (pointer.x <= this.uiBackdropWidth + 16 && pointer.y <= this.uiBackdropHeight + 16) {
      return;
    }

    // ...and on the pause button (top-right), so tapping it doesn't also send
    // George swimming off into the corner.
    if (
      pointer.x >= this.scale.width - this.pauseButtonSize - 28 &&
      pointer.y <= this.pauseButtonSize + 28
    ) {
      return;
    }

    this.player.swimTo(pointer.worldX, pointer.worldY);
  }

  private handleNpcOverlap(
    _player: ArcadeCollisionObject,
    npcGo: ArcadeCollisionObject
  ): void {
    if (this.overlayActive || this.levelCompleteTriggered) {
      return;
    }

    const npc = npcGo as NPC;

    // Overlap fires every physics step while the bodies intersect. Without this
    // latch, closing the dialogue resumed the scene, the very next step saw the
    // same overlap and reopened it — and because the scene is paused while the
    // box is up, the player could never steer away. Parking George exactly on
    // an NPC (tap it, distance < 6, velocity 0) soft-locked the game for good.
    if (npc.getData('talked')) {
      return;
    }
    npc.setData('talked', true);

    this.launchDialogue(npc.dialogKey);
  }

  /** Re-arm each NPC once the player has actually swum clear of it. */
  update(): void {
    if (this.overlayActive || this.levelCompleteTriggered || !this.npcs || !this.player) {
      return;
    }

    this.handleKeyboardControls();

    for (const child of this.npcs.getChildren()) {
      const npc = child as NPC;
      if (!npc.getData('talked')) {
        continue;
      }

      // Re-arming the moment the bodies stop intersecting is too tight: George
      // ends a conversation parked against the NPC, so the first tap away
      // clipped its edge again and replayed the whole conversation before he
      // could escape. Require real separation instead.
      const clearDistance =
        (this.player.displayWidth + npc.displayWidth) / 2 + this.npcReArmMargin;

      if (
        Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.x, npc.y) >
        clearDistance
      ) {
        npc.setData('talked', false);
      }
    }
  }

  private handleNpcInteract(event: NpcInteractEvent): void {
    if (this.overlayActive || this.levelCompleteTriggered) {
      return;
    }

    // Tapping an NPC also arms the latch, so walking away afterwards doesn't
    // immediately retrigger the same conversation via the overlap callback.
    event.npc?.setData('talked', true);

    this.launchDialogue(event.dialogKey);
  }

  private async handleBubbleOverlap(
    _player: ArcadeCollisionObject,
    bubbleGo: ArcadeCollisionObject
  ): Promise<void> {
    if (this.overlayActive || this.levelCompleteTriggered) {
      return;
    }

    const bubble = bubbleGo as Bubble;
    if (!bubble.active || bubble.getData('popping')) {
      return;
    }

    bubble.setData('popping', true);

    // Sound FIRST, before anything that can wait. The blip used to be played after
    // `await bubble.pop()`, i.e. 180ms after the touch that caused it — well past the
    // ~50ms window where the ear still hears sound and event as one thing, so the pop
    // felt disconnected from the tap. Firing it here is the whole fix.
    this.soundManager.playBubbleBlip(this.advanceBubbleChain());

    // Prevent repeated collection while the pop animation plays.
    this.bubbles.remove(bubble, false, false);
    this.spawnBubbleBurst(bubble.x, bubble.y);
    this.updateBubbleCountUi();

    await bubble.pop();

    if (this.bubbles.countActive(true) === 0) {
      this.completeLevel();
    }
  }

  /**
   * Returns the chain index for the pop happening right now and arms the reset.
   *
   * Each pop steps one note up the pentatonic chime, so a run of bubbles rises and the
   * ear starts asking for the next one. After `bubbleChainResetDelay` with no pop the
   * counter goes back to 0 — silently, with nothing on screen. The scene clock is used
   * on purpose: reading a dialogue or opening the pause menu freezes it, so a chain is
   * never lost to something that isn't playing.
   */
  private advanceBubbleChain(): number {
    const chainIndex = this.bubbleChain;
    this.bubbleChain += 1;

    this.bubbleChainTimer?.remove();
    this.bubbleChainTimer = this.time.delayedCall(this.bubbleChainResetDelay, () => {
      this.bubbleChain = 0;
      this.bubbleChainTimer = undefined;
    });

    return chainIndex;
  }

  private handleHazardCollision(
    _player: ArcadeCollisionObject,
    hazardGo: ArcadeCollisionObject
  ): void {
    if (this.hazardCooldown || this.overlayActive || this.levelCompleteTriggered) {
      return;
    }
    this.hazardCooldown = true;
    this.time.delayedCall(600, () => {
      this.hazardCooldown = false;
      // Drop the blue "cranky" tint with the cooldown, otherwise George stays
      // blue for the rest of the level after a single hazard bump.
      if (this.player?.active) {
        this.player.setCranky(false);
      }
    });

    const hazard = hazardGo as Phaser.Physics.Arcade.Sprite;
    const body = this.player.body as Phaser.Physics.Arcade.Body;

    const dx = this.player.x - hazard.x;
    const dy = this.player.y - hazard.y;
    const distance = Math.hypot(dx, dy) || 1;

    const pushDistance = 120;
    const pushX = (dx / distance) * pushDistance;
    const pushY = (dy / distance) * pushDistance;

    this.player.swimTo(this.player.x + pushX, this.player.y + pushY);
    body.setVelocity((dx / distance) * 260, (dy / distance) * 260);

    // A cool pale-blue puff, NOT the old red flash. Red is universal damage language
    // and it flatly contradicts the promise that nobody can lose this game — it was the
    // loudest feedback in the whole build, attached to something that costs you nothing.
    // The bump is a splash and a grumble, so it looks like one. The push, the cranky
    // tint and the recovery are all unchanged; only the framing is.
    this.cameras.main.flash(60, 191, 233, 255);
    this.spawnHazardSparks(hazard.x, hazard.y);

    this.player.setCranky(true);
    this.soundManager.playCrank();
  }

  private updateBubbleCountUi(): void {
    if (!this.uiText || !this.uiText.active) {
      return;
    }

    const level = levels[this.levelIndex];
    const levelName = level?.name ?? `Level ${this.levelIndex + 1}`;
    const remaining = this.bubbles?.countActive(true) ?? 0;
    this.bubblesCollected = this.totalBubbles - remaining;
    this.uiText.setText(this.formatUiText(levelName, this.bubblesCollected));
  }

  private formatUiText(levelName: string, bubbleCount: number): string {
    return `${levelName}\nBubbles: ${bubbleCount} / ${this.totalBubbles}`;
  }

  private completeLevel(): void {
    if (this.levelCompleteTriggered) {
      return;
    }
    this.levelCompleteTriggered = true;

    this.input.off('pointerdown', this.handlePointerDown, this);
    this.physics.pause();

    const isLastLevel = this.levelIndex >= levels.length - 1;

    if (isLastLevel) {
      this.spawnVictoryFlourish();
      this.victoryPending = true;

      // Let the victory flash finish before the epilogue pauses the scene. Pausing
      // mid-flash freezes the effect at full alpha and buries the final level under
      // a permanent cream wash; resetFX() clears any remainder either way.
      this.time.delayedCall(this.victoryFlashDuration + 60, () => {
        this.cameras.main.resetFX();
        this.launchDialogue('victory_epilogue');
      });
      return;
    }

    // Mark the mission objective complete when the level is won.
    this.missionPanel?.complete();

    // Show the polished level-complete card instead of an abrupt fade.
    this.scene.launch('LevelCompleteOverlay', {
      levelIndex: this.levelIndex,
      bubblesCollected: this.bubblesCollected,
      totalBubbles: this.totalBubbles,
    });
  }

  private launchDialogue(dialogKey: string): void {
    this.overlayActive = true;

    // Freeze gameplay while reading; tweens/physics resume when overlay closes.
    this.scene.pause();

    this.scene.launch('DialogueOverlay', { dialogKey });

    const overlay = this.scene.get('DialogueOverlay');
    if (overlay) {
      this.overlayShutdownCb = this.handleDialogueClosed.bind(this);
      overlay.events.once('shutdown', this.overlayShutdownCb);
    }
  }

  private handleDialogueClosed(): void {
    this.overlayActive = false;
    this.overlayShutdownCb = undefined;

    // Avoid resuming if we've already moved to another scene.
    if (this.victoryPending) {
      // Finishing the whole book earns the celebration card (and the "read the
      // real thing" prompt) rather than a silent bounce back to the menu. The
      // scene stays paused underneath; the overlay stops it on dismiss.
      this.missionPanel?.complete();
      this.scene.launch('LevelCompleteOverlay', {
        levelIndex: this.levelIndex,
        bubblesCollected: this.bubblesCollected,
        totalBubbles: this.totalBubbles,
      });
    } else {
      this.scene.resume();
    }
  }

  private spawnBubbleBurst(x: number, y: number): void {
    this.bubbleBurstEmitter?.explode(8, x, y);
  }

  private spawnHazardSparks(x: number, y: number): void {
    this.hazardSparkEmitter?.explode(6, x, y);
  }

  private spawnVictoryFlourish(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.cameras.main.flash(this.victoryFlashDuration, 255, 250, 220);

    const emitter = this.add.particles(0, 0, 'bubble', {
      x: { min: 0, max: width },
      y: { min: 0, max: height },
      speed: { min: 20, max: 80 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.4, end: 0 },
      alpha: { start: 0.7, end: 0 },
      lifespan: 800,
      frequency: 60,
      quantity: 2,
      emitting: true,
    });

    emitter.setScrollFactor(0);
    emitter.setDepth(this.particleDepth);
    // Held on the scene so shutdown() can reclaim it: if the scene tears down
    // inside this 900ms window the delayedCall never fires and the emitter
    // outlives the scene that owns it.
    this.victoryEmitter = emitter;
    this.time.delayedCall(900, () => {
      emitter.destroy();
      if (this.victoryEmitter === emitter) {
        this.victoryEmitter = undefined;
      }
    });
  }
}

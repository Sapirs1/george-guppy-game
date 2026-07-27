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

  // Sized for legibility once Scale.FIT halves everything on a phone: the HUD
  // text was 16px design == ~7 CSS px on a 390px screen, which no child can read.
  private readonly uiBackdropWidth = 300;
  private readonly uiBackdropHeight = 86;
  private readonly pauseButtonSize = 56;
  /** Extra clearance, beyond touching, before an NPC can start talking again. */
  private readonly npcReArmMargin = 24;
  private readonly victoryFlashDuration = 300;

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
    this.buildWalls(level);
    this.buildPlayer(level);
    this.buildBubbles(level);
    this.buildNpcs(level);
    this.buildHazards(level);
    this.buildUi(level);
    this.bindInput();
    this.bindDialogueEvents();

    // Phaser never calls a Scene subclass's shutdown() on its own, so the cleanup
    // below has to be wired to the scene's SHUTDOWN event explicitly.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
  }

  shutdown(): void {
    this.input.off('pointerdown', this.handlePointerDown, this);
    this.events.off('npcInteract', this.handleNpcInteract, this);

    for (const collider of this.colliders) {
      collider.destroy();
    }
    this.colliders = [];

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
        this.pauseButtonSize + 32,
        this.pauseButtonSize + 32
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
    _player: Phaser.GameObjects.GameObject,
    npcGo: Phaser.GameObjects.GameObject
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
    _player: Phaser.GameObjects.GameObject,
    bubbleGo: Phaser.GameObjects.GameObject
  ): Promise<void> {
    if (this.overlayActive || this.levelCompleteTriggered) {
      return;
    }

    const bubble = bubbleGo as Bubble;
    if (!bubble.active || bubble.getData('popping')) {
      return;
    }

    bubble.setData('popping', true);

    // Prevent repeated collection while the pop animation plays.
    this.bubbles.remove(bubble, false, false);
    this.spawnBubbleBurst(bubble.x, bubble.y);
    this.updateBubbleCountUi();

    await bubble.pop();
    this.soundManager.playBubbleBlip();

    if (this.bubbles.countActive(true) === 0) {
      this.completeLevel();
    }
  }

  private handleHazardCollision(
    _player: Phaser.GameObjects.GameObject,
    hazardGo: Phaser.GameObjects.GameObject
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

    this.cameras.main.flash(100, 255, 60, 60);
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
    const emitter = this.add.particles(0, 0, 'bubble', {
      x,
      y,
      speed: { min: 60, max: 160 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.8, end: 0 },
      lifespan: 200,
      quantity: 8,
      emitting: false,
    });

    emitter.explode(8, x, y);
    this.time.delayedCall(250, () => emitter.destroy());
  }

  private spawnHazardSparks(x: number, y: number): void {
    const emitter = this.add.particles(0, 0, 'bubble', {
      x,
      y,
      speed: { min: 40, max: 100 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.3, end: 0 },
      alpha: { start: 0.7, end: 0 },
      lifespan: 180,
      quantity: 6,
      tint: 0x220000,
      emitting: false,
    });

    emitter.explode(6, x, y);
    this.time.delayedCall(230, () => emitter.destroy());
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
    this.time.delayedCall(900, () => emitter.destroy());
  }
}

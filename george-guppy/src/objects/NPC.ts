export interface NPCInteractEvent {
  dialogKey: string;
  npc: NPC;
}

export class NPC extends Phaser.Physics.Arcade.Image {
  readonly dialogKey: string;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string, dialogKey: string) {
    super(scene, x, y, texture);
    this.dialogKey = dialogKey;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    (this.body as Phaser.Physics.Arcade.Body).setImmovable(true);

    this.setInteractive();

    this.on('pointerdown', () => {
      scene.events.emit('npcInteract', { dialogKey: this.dialogKey, npc: this });
    });
  }
}

                                   
                    
           
 

export class NPC extends Phaser.Physics.Arcade.Image {
           dialogKey        ;

  constructor(scene              , x        , y        , texture        , dialogKey        ) {
    super(scene, x, y, texture);
    this.dialogKey = dialogKey;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    (this.body                              ).setImmovable(true);

    this.setInteractive();

    this.on('pointerdown', () => {
      scene.events.emit('npcInteract', { dialogKey: this.dialogKey, npc: this });
    });
  }
}

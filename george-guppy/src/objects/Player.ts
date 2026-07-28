// Phaser is used at RUNTIME here (instanceof / class extends), not just as a
// type. Without this import it resolved only via a window.Phaser global that the
// classic-script vendor build happens to set — so the ESM/importmap build threw
// "Phaser is not defined".
import Phaser from 'phaser';

export class Player extends Phaser.Physics.Arcade.Sprite {
  targetX: number;
  targetY: number;
  speed = 180;
  isCranky = false;

  private readonly wiggleSpeed = 0.025;
  /** Distance over which George eases down to a glide instead of stopping dead. */
  private readonly arriveRadius = 90;
  /** Horizontal speed needed to change facing — stops flip-flap on vertical taps. */
  private readonly flipDeadzone = 8;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'george');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.targetX = x;
    this.targetY = y;

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    // Pin the hitbox to the ARTWORK, not the frame. Baking a 2px rim-light into
    // the sprite grew the frame to 68x46, and an Arcade body defaults to frame
    // size — which would have quietly loosened every collision in the game.
    body.setSize(64, 40);
    body.setOffset(2, 3);
  }

  swimTo(pointerX: number, pointerY: number): void {
    this.targetX = pointerX;
    this.targetY = pointerY;
    // Facing is derived from actual travel in preUpdate, not from the tap — a
    // tap behind him used to snap the sprite round before he had begun moving.
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);

    const body = this.body as Phaser.Physics.Arcade.Body;
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const distance = Math.hypot(dx, dy);
    // Frame-rate-independent smoothing factor.
    const k = 1 - Math.exp(-6 * (delta / 1000));

    if (distance < 4) {
      // Coast to a stop rather than snapping velocity to zero, which read as a
      // cursor halting instead of a fish settling.
      body.velocity.x -= body.velocity.x * k;
      body.velocity.y -= body.velocity.y * k;
    } else {
      const angle = Math.atan2(dy, dx);
      // Arrival easing: full speed out in open water, gliding in as he lands.
      const t = Phaser.Math.Clamp(distance / this.arriveRadius, 0, 1);
      const desired = this.speed * Phaser.Math.Easing.Sine.Out(t);
      body.velocity.x += (Math.cos(angle) * desired - body.velocity.x) * k;
      body.velocity.y += (Math.sin(angle) * desired - body.velocity.y) * k;
    }

    this.applyBodyMotion(time, body.velocity.length() / this.speed);
  }

  /** Facing, banking and swim-cycle, all driven by how fast he is actually going. */
  private applyBodyMotion(time: number, speedRatio: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;

    if (body.velocity.x < -this.flipDeadzone) {
      this.setFlipX(true);
    } else if (body.velocity.x > this.flipDeadzone) {
      this.setFlipX(false);
    }

    const heading = Phaser.Math.RadToDeg(
      Math.atan2(body.velocity.y, body.velocity.x)
    );
    // flipX mirrors the texture BEFORE rotation is applied, so giving a flipped
    // sprite a ~180deg heading composes into a VERTICAL flip — George swam
    // upside-down every time he went left. Taking 180 back off puts him upright.
    const facing = this.flipX ? heading - 180 : heading;

    const wiggle = Math.sin(time * this.wiggleSpeed) * (1.5 + speedRatio * 4);
    // Bank towards the new heading instead of snapping to it.
    this.rotation = Phaser.Math.Angle.RotateTo(
      this.rotation,
      Phaser.Math.DegToRad(facing + wiggle),
      0.18
    );

    // Light squash/stretch so he looks like he is pushing water.
    this.setScale(1 + speedRatio * 0.1, 1 - speedRatio * 0.07);
  }

  setCranky(value: boolean): void {
    this.isCranky = value;
    if (value) {
      this.setTint(0x88ccff);
    } else {
      this.clearTint();
    }
  }
}

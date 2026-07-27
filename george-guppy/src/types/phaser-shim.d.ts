/**
 * ============================================================================
 * TEMPORARY PHASER AMBIENT TYPE STUB
 * ============================================================================
 *
 * This file exists only because `node_modules/phaser` is not installed in this
 * environment, so the real `phaser` package types (usually found under
 * `node_modules/phaser/types/phaser.d.ts`) are unavailable.
 *
 * It declares a minimal, permissive global `Phaser` namespace that matches the
 * API surface used by "George the Cranky Guppy". Every class and interface
 * carries a `[key: string]: any` index signature so that arbitrary property and
 * method access type-checks without needing to model Phaser's full internals.
 *
 * The `phaser` module is declared with a default export so the project's
 * `import Phaser from 'phaser'` resolves to this namespace under the current
 * `moduleResolution: Bundler` + `esModuleInterop` configuration.
 *
 * >>> Once `npm install` has been run and `node_modules/phaser/types` exists,
 * >>> DELETE this file so the project uses the real, strongly-typed Phaser
 * >>> definitions instead of this fallback.
 * ============================================================================
 */

declare namespace Phaser {
  const AUTO: number;

  namespace Curves {
    class QuadraticBezier {
      [key: string]: any;
      constructor(p0: any, p1: any, p2: any);
      draw(graphics: Phaser.GameObjects.Graphics, pointsTotal?: number): any;
    }
  }

  namespace Math {
    class Vector2 {
      [key: string]: any;
      constructor(x?: number, y?: number);
    }
  }

  class EventEmitter {
    [key: string]: any;
    on(event: string | symbol, fn: (...args: any[]) => void, context?: any): this;
    off(event: string | symbol, fn?: (...args: any[]) => void, context?: any): this;
    once(event: string | symbol, fn: (...args: any[]) => void, context?: any): this;
    emit(event: string | symbol, ...args: any[]): boolean;
  }

  class Game {
    [key: string]: any;
    constructor(config?: Types.Core.GameConfig);
    scale: Scale.ScaleManager;
    events: EventEmitter;
  }

  namespace Scale {
    const SHOW_ALL: number;
    const CENTER_BOTH: number;

    class ScaleManager extends EventEmitter {
      [key: string]: any;
      width: number;
      height: number;
      resize(width: number, height: number): void;
    }
  }

  namespace Scenes {
    class SceneManager {
      [key: string]: any;
      add(key: string, sceneConfig: any): void;
      start(key: string, data?: any): void;
      launch(key: string, data?: any): void;
      pause(): void;
      resume(): void;
      stop(key?: string): void;
      get(key: string): Scene | null;
    }
  }

  class Scene extends EventEmitter {
    [key: string]: any;
    constructor(config?: string | { key?: string });

    add: GameObjects.GameObjectFactory;
    make: GameObjects.GameObjectCreator;
    physics: Physics.Arcade.ArcadePhysics;
    input: Input.InputPlugin;
    time: Time.Clock;
    tweens: Tweens.TweenManager;
    sound: Sound.BaseSoundManager;
    cameras: Cameras.Scene2D.CameraManager;
    scale: Scale.ScaleManager;
    scene: Scenes.SceneManager;
    events: EventEmitter;

    init(data?: any): void;
    preload(): void;
    create(data?: any): void;
    update(time?: number, delta?: number): void;
  }

  namespace GameObjects {
    class GameObject extends EventEmitter {
      [key: string]: any;
      scene: Phaser.Scene;
      x: number;
      y: number;
      active: boolean;
      visible: boolean;
      width: number;
      height: number;
      displayWidth: number;
      displayHeight: number;

      setPosition(x?: number, y?: number): this;
      setScrollFactor(x: number, y?: number): this;
      setDepth(value: number): this;
      setAlpha(value?: number): this;
      setScale(x: number, y?: number): this;
      setTint(value: number): this;
      clearTint(): this;
      setOrigin(x?: number, y?: number): this;
      setAngle(value?: number): this;
      setFlipX(value: boolean): this;
      setInteractive(config?: any): this;
      disableInteractive(): this;
      destroy(fromScene?: boolean): void;
      preUpdate(time: number, delta: number): void;
      setData(key: string, value?: any): this;
      getData(key: string): any;
    }

    class Image extends GameObject {
      [key: string]: any;
      constructor(scene: Phaser.Scene, x: number, y: number, texture: string, frame?: string | number);
      setDisplaySize(width: number, height: number): this;
    }

    class Sprite extends GameObject {
      [key: string]: any;
      constructor(scene: Phaser.Scene, x: number, y: number, texture: string, frame?: string | number);
      setDisplaySize(width: number, height: number): this;
      play(key: string, ignoreIfPlaying?: boolean): this;
    }

    class Text extends GameObject {
      [key: string]: any;
      constructor(scene: Phaser.Scene, x: number, y: number, text?: string | string[], style?: any);
      setText(value: string | string[]): this;
      setWordWrapWidth(width: number): this;
      setOrigin(x?: number, y?: number): this;
    }

    class Graphics extends GameObject {
      [key: string]: any;
      constructor(scene: Phaser.Scene, options?: any);
      clear(): this;
      fillStyle(color: number, alpha?: number): this;
      fillRect(x: number, y: number, width: number, height: number): this;
      fillRoundedRect(x: number, y: number, width: number, height: number, radius?: number | any): this;
      lineStyle(lineWidth: number, color?: number, alpha?: number): this;
      strokeRoundedRect(x: number, y: number, width: number, height: number, radius?: number | any): this;
      strokeCircle(x: number, y: number, radius: number): this;
      fillCircle(x: number, y: number, radius: number): this;
      fillEllipse(x: number, y: number, width: number, height: number): this;
      beginPath(): this;
      moveTo(x: number, y: number): this;
      lineTo(x: number, y: number): this;
      closePath(): this;
      fillPath(): this;
      strokePath(): this;
      quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): this;
      arc(
        x: number,
        y: number,
        radius: number,
        startAngle: number,
        endAngle: number,
        anticlockwise?: boolean
      ): this;
      generateTexture(key: string, width?: number, height?: number): any;
    }

    class Zone extends GameObject {
      [key: string]: any;
      constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number);
    }

    class ParticleEmitter extends GameObject {
      [key: string]: any;
      explode(count?: number, x?: number, y?: number): this;
    }

    class GameObjectFactory {
      [key: string]: any;
      existing(gameObject: GameObject): GameObject;
      image(x: number, y: number, texture: string, frame?: string | number): Image;
      sprite(x: number, y: number, texture: string, frame?: string | number): Sprite;
      text(x: number, y: number, text?: string | string[], style?: any): Text;
      graphics(config?: any): Graphics;
      zone(x: number, y: number, width: number, height: number): Zone;
      particles(x: number, y: number, texture: string, config?: any): ParticleEmitter;
    }

    class GameObjectCreator {
      [key: string]: any;
      graphics(config?: any): Graphics;
    }
  }

  namespace Physics {
    namespace Arcade {
      class Body {
        [key: string]: any;
        velocity: { x: number; y: number };
        setAllowGravity(value: boolean): this;
        setImmovable(value?: boolean): this;
        setVelocity(x: number, y?: number): this;
        setDrag(value: number): this;
        setDamping(value: boolean): this;
        setCollideWorldBounds(value: boolean): this;
        setCircle(radius: number, offsetX?: number, offsetY?: number): this;
      }

      class World {
        [key: string]: any;
        setBounds(x: number, y: number, width: number, height: number): void;
      }

      class ArcadeFactory {
        [key: string]: any;
        existing(gameObject: GameObjects.GameObject): any;
        image(x: number, y: number, texture: string, frame?: string | number): Image;
        sprite(x: number, y: number, texture: string, frame?: string | number): Sprite;
        staticGroup(config?: any, children?: any): StaticGroup;
        group(config?: any, children?: any): Group;
        collider(
          object1: any,
          object2: any,
          collideCallback?: any,
          processCallback?: any,
          callbackContext?: any
        ): Collider;
        overlap(
          object1: any,
          object2: any,
          overlapCallback?: any,
          processCallback?: any,
          callbackContext?: any
        ): Collider;
      }

      class ArcadePhysics {
        [key: string]: any;
        world: World;
        add: ArcadeFactory;
      }

      class Image extends GameObjects.Image {
        [key: string]: any;
        body: Body | null;
        refreshBody(): this;
      }

      class Sprite extends GameObjects.Sprite {
        [key: string]: any;
        body: Body | null;
        refreshBody(): this;
      }

      class Group extends EventEmitter {
        [key: string]: any;
        create(x?: number, y?: number, key?: string, frame?: string | number, visible?: boolean, active?: boolean): GameObjects.GameObject;
        add(gameObject: GameObjects.GameObject, addToScene?: boolean): this;
        remove(gameObject: GameObjects.GameObject, removeFromScene?: boolean, destroyChild?: boolean): this;
        countActive(active?: boolean): number;
        destroy(destroyChildren?: boolean, removeFromScene?: boolean): void;
      }

      class StaticGroup extends Group {
        [key: string]: any;
        refresh(): void;
      }

      class Collider extends EventEmitter {
        [key: string]: any;
        destroy(): void;
      }
    }
  }

  namespace Cameras {
    namespace Scene2D {
      class Camera extends EventEmitter {
        [key: string]: any;
        width: number;
        height: number;
        setBounds(x: number, y: number, width: number, height: number): this;
        startFollow(target: GameObjects.GameObject, roundPixels?: boolean, lerpX?: number, lerpY?: number): this;
        fadeIn(duration?: number, red?: number, green?: number, blue?: number): this;
        fadeOut(duration?: number, red?: number, green?: number, blue?: number): this;
        flash(duration?: number, red?: number, green?: number, blue?: number): this;
      }

      class CameraManager {
        [key: string]: any;
        main: Camera;
        add(x?: number, y?: number, width?: number, height?: number, makeMain?: boolean, name?: string): Camera;
      }
    }
  }

  namespace Input {
    class Pointer {
      [key: string]: any;
      x: number;
      y: number;
      worldX: number;
      worldY: number;
    }

    class InputPlugin extends EventEmitter {
      [key: string]: any;
      pointer: Pointer;
      keyboard: Keyboard.KeyboardPlugin | null;
      on(event: string | symbol, fn: (...args: any[]) => void, context?: any): this;
      off(event: string | symbol, fn?: (...args: any[]) => void, context?: any): this;
    }

    namespace Keyboard {
      class KeyboardPlugin extends EventEmitter {
        [key: string]: any;
        on(event: string | symbol, fn: (...args: any[]) => void, context?: any): this;
        off(event: string | symbol, fn?: (...args: any[]) => void, context?: any): this;
      }
    }
  }

  namespace Time {
    class Clock {
      [key: string]: any;
      addEvent(config: any): TimerEvent;
      delayedCall(delay: number, callback: (...args: any[]) => void, args?: any[], callbackScope?: any): TimerEvent;
      removeEvent(event: TimerEvent): void;
    }

    class TimerEvent {
      [key: string]: any;
      destroy(): void;
    }
  }

  namespace Tweens {
    class TweenManager extends EventEmitter {
      [key: string]: any;
      add(config: any): Tween;
      killTweensOf(target: any): void;
    }

    class Tween {
      [key: string]: any;
      stop(): void;
    }
  }

  namespace Sound {
    class BaseSoundManager extends EventEmitter {
      [key: string]: any;
      context: AudioContext;
    }

    class WebAudioSoundManager extends BaseSoundManager {
      [key: string]: any;
    }

    class NoAudioSoundManager extends BaseSoundManager {
      [key: string]: any;
    }
  }

  namespace Display {
    namespace Color {
      interface ColorObject {
        [key: string]: any;
        color: number;
        alpha: number;
        red: number;
        green: number;
        blue: number;
      }

      interface InterpolationResult {
        [key: string]: any;
        r: number;
        g: number;
        b: number;
      }

      function ValueToColor(input: number | any): ColorObject;
      function GetColor(red: number, green: number, blue: number, alpha?: number): number;

      namespace Interpolate {
        function ColorWithColor(color1: ColorObject, color2: ColorObject, steps: number, currentStep: number): InterpolationResult;
      }
    }
  }

  namespace Math {
    function RadToDeg(rad: number): number;
    function Clamp(value: number, min: number, max: number): number;
    function Between(min: number, max: number): number;
    function FloatBetween(min: number, max: number): number;
  }

  namespace Types {
    namespace Core {
      interface GameConfig {
        [key: string]: any;
        type?: number;
        parent?: string | HTMLElement;
        width?: number | string;
        height?: number | string;
        backgroundColor?: number | string;
        pixelArt?: boolean;
        physics?: any;
        scale?: any;
        audio?: any;
        scene?: any;
      }
    }
  }
}

declare module 'phaser' {
  export default Phaser;
}

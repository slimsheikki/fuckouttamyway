import { Group, type Object3D } from "three";
import { CONFIG } from "../config.js";
import { easeOutCubic } from "../core/math.js";
import { Lane, laneCenterX } from "./Lanes.js";
import { Character, type CharSpec } from "../render/procedural/CharacterBuilder.js";

// The commuter. A caricature character (hi-vis signature accent so it always
// reads as the hero) on the shared rig. Stays at a fixed z; lane changes slide
// x with easing while the rig leans into the move.

const PLAYERS: CharSpec[] = [
  // Aki — shirt + loose tie, beanie + bag, coffee
  { skin: 0xd9a066, torso: 0x35597f, legs: 0x455066, accent: 0xffcf4d, hair: 0x3a2a1a, hat: "beanie", props: ["bag", "coffee"], outline: true },
  // Riikka — puffer vest, tote, phone-checker
  { skin: 0xe0b48a, torso: 0x9a4a58, legs: 0x4a4f61, accent: 0xffcf4d, hair: 0x5a3a24, props: ["bag"], outline: true },
  // Sami — hoodie under blazer, backpack
  { skin: 0xcaa06a, torso: 0x4a6d63, legs: 0x444a58, accent: 0xffcf4d, hair: 0x201a16, hat: "beanie", props: ["bag"], outline: true },
];

export class Player {
  readonly group = new Group();
  lane: Lane = Lane.Right;
  private fromX = laneCenterX(Lane.Right);
  private toX = laneCenterX(Lane.Right);
  private switchT = 1;
  private stumbleT = 0;
  private char: Character;
  private surfaceY: (z: number) => number;

  constructor(parent: Object3D, surfaceY: (z: number) => number, variant = (Math.random() * PLAYERS.length) | 0) {
    this.surfaceY = surfaceY;
    this.char = new Character(PLAYERS[variant % PLAYERS.length]);
    this.char.group.rotation.y = Math.PI; // face down the escalator (away from camera)
    this.group.add(this.char.group);
    this.group.position.set(this.toX, surfaceY(CONFIG.playerZ), CONFIG.playerZ);
    parent.add(this.group);
  }

  get switching(): boolean {
    return this.switchT < 1;
  }
  get isStunned(): boolean {
    return this.stumbleT > 0;
  }

  changeLane(dir: -1 | 1): void {
    const target = dir < 0 ? Lane.Left : Lane.Right;
    if (target === this.lane && !this.switching) return;
    this.lane = target;
    this.fromX = this.group.position.x;
    this.toX = laneCenterX(target);
    this.switchT = 0;
  }

  stumble(): void {
    this.stumbleT = CONFIG.hitStunTime;
    this.char.stumble();
  }

  fixedUpdate(step: number): void {
    if (this.switchT < 1) {
      this.switchT = Math.min(1, this.switchT + step / CONFIG.laneSwitchTime);
      this.group.position.x = this.fromX + (this.toX - this.fromX) * easeOutCubic(this.switchT);
    }
    if (this.stumbleT > 0) this.stumbleT = Math.max(0, this.stumbleT - step);
    this.group.position.y = this.surfaceY(CONFIG.playerZ);
  }

  render(dt: number, speed01 = 0): void {
    const lean = this.switching ? (this.toX > this.fromX ? -1 : 1) : 0;
    this.char.update(dt, { moving: true, speed01, lean });
  }
}

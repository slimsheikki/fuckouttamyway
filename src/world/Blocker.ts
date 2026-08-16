import { Group, type Object3D } from "three";
import { Lane, laneCenterX } from "./Lanes.js";
import { Character, type CharSpec } from "../render/procedural/CharacterBuilder.js";

// A standing commuter blocking a lane — a caricature character on the shared
// rig. Pooled and recycled; idles until the player passes, then startles.

export type BarkLang = "fi" | "sw" | "en";

interface Archetype {
  spec: CharSpec;
  lang: BarkLang;
}

// The 8 crowd archetypes — distinct silhouettes so they read at speed.
export const ARCHETYPES: Archetype[] = [
  // Phone Zombie
  { spec: { skin: 0xd2a273, torso: 0x5a5f68, legs: 0x454a58, hair: 0x241c18, props: ["phone"], headDown: true }, lang: "fi" },
  // Tourist + roller bag
  { spec: { skin: 0xe6b98f, torso: 0xc57044, legs: 0x9299a3, hair: 0x3a2a1a, props: ["roller"], build: "reg" }, lang: "en" },
  // Newspaper reader
  { spec: { skin: 0xcea26a, torso: 0x4a566b, legs: 0x424a5a, hair: 0x51402a, props: ["newspaper"] }, lang: "sw" },
  // Grocery hauler (elderly, wide, slow)
  { spec: { skin: 0xd8b48c, torso: 0x7f8460, legs: 0x4c505c, hair: 0xc4c7cd, props: ["bags2"], build: "wide" }, lang: "fi" },
  // Winter coat (pure width, hood)
  { spec: { skin: 0xd7a877, torso: 0x3e4a5e, legs: 0x3a3f4c, hat: "hood", hair: 0x2a2a2a, build: "wide" }, lang: "fi" },
  // Teen with phone
  { spec: { skin: 0xdcae82, torso: 0x6a5fa5, legs: 0x3c4150, hat: "beanie", accent: 0x3a3a3a, props: ["phone"], build: "slim", headDown: true }, lang: "fi" },
  // Cyclist
  { spec: { skin: 0xcf9f66, torso: 0x9a2f3a, legs: 0x454a58, hair: 0x201a16, props: ["bike"] }, lang: "sw" },
  // Suit + coffee
  { spec: { skin: 0xd9a066, torso: 0x38465a, legs: 0x363c4a, hair: 0x2a2018, props: ["coffee"] }, lang: "fi" },
];

export class Blocker {
  readonly group = new Group();
  active = false;
  lane: Lane = Lane.Left;
  scored = false;
  readonly lang: BarkLang;
  private char: Character;

  constructor(parent: Object3D, archetype: number) {
    const a = ARCHETYPES[archetype % ARCHETYPES.length];
    this.lang = a.lang;
    this.char = new Character(a.spec);
    this.char.group.rotation.y = Math.PI; // face down the escalator (backs to camera)
    this.group.add(this.char.group);
    this.group.visible = false;
    parent.add(this.group);
  }

  get z(): number {
    return this.group.position.z;
  }

  spawn(lane: Lane, z: number, surfaceY: number): void {
    this.lane = lane;
    this.active = true;
    this.scored = false;
    this.group.visible = true;
    this.group.position.set(laneCenterX(lane), surfaceY, z);
  }

  recycle(): void {
    this.active = false;
    this.group.visible = false;
  }

  advance(dz: number, surfaceY: number): void {
    this.group.position.z += dz;
    this.group.position.y = surfaceY;
  }

  startle(): void {
    this.char.startle();
  }

  render(dt: number): void {
    this.char.update(dt, { moving: false });
  }
}

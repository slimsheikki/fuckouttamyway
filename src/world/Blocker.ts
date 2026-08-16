import {
  BoxGeometry,
  Group,
  Mesh,
  type Object3D,
} from "three";
import { toonMaterial } from "../render/toon.js";
import { addOutline } from "../render/outline.js";
import { Lane, laneCenterX } from "./Lanes.js";

// A standing commuter blocking a lane. Greybox = a coloured box with an
// outline. Pooled and recycled by BlockerPool; never allocated during play.

const SHARED_GEO = new BoxGeometry(0.5, 1.15, 0.5);

export class Blocker {
  readonly group = new Group();
  active = false;
  lane: Lane = Lane.Left;
  scored = false; // near-miss already awarded for this pass
  private mesh: Mesh;
  private sway: number;

  constructor(parent: Object3D, variantColor: number, swaySeed: number) {
    this.mesh = new Mesh(SHARED_GEO, toonMaterial({ color: variantColor }));
    this.mesh.position.y = 0.05;
    addOutline(this.mesh, 0.022);
    this.group.add(this.mesh);
    this.group.visible = false;
    this.sway = swaySeed;
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
    this.group.position.set(laneCenterX(lane), surfaceY + 0.6, z);
  }

  recycle(): void {
    this.active = false;
    this.group.visible = false;
  }

  /** Move toward the camera; y follows the step surface. */
  advance(dz: number, surfaceY: number): void {
    this.group.position.z += dz;
    this.group.position.y = surfaceY + 0.6;
  }

  render(dt: number): void {
    // Idle sway so the crowd isn't dead-still.
    this.sway += dt;
    this.mesh.rotation.z = Math.sin(this.sway * 1.3) * 0.04;
  }
}

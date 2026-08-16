import {
  CapsuleGeometry,
  CircleGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  type Object3D,
} from "three";
import { CONFIG, COLORS } from "../config.js";
import { toonMaterial } from "../render/toon.js";
import { addOutline } from "../render/outline.js";
import { easeOutCubic } from "../core/math.js";
import { Lane, laneCenterX } from "./Lanes.js";

// The commuter. Greybox = a capsule; the art swap later replaces the mesh only.
// Stays at a fixed z (world scrolls past); lane changes slide x with easing.

export class Player {
  readonly group = new Group();
  lane: Lane = Lane.Right; // start in the "stander" lane
  private fromX = laneCenterX(Lane.Right);
  private toX = laneCenterX(Lane.Right);
  private switchT = 1; // 0..1, 1 = settled
  private bob = 0;
  private stumbleT = 0;
  private mesh: Mesh;

  constructor(parent: Object3D, surfaceY: (z: number) => number) {
    const body = new CapsuleGeometry(0.24, 0.5, 4, 8);
    this.mesh = new Mesh(body, toonMaterial({ color: COLORS.player }));
    addOutline(this.mesh, 0.025);
    this.group.add(this.mesh);

    // Blob shadow (PS2 games faked shadows) — a dark disc under the feet.
    const blob = new Mesh(
      new CircleGeometry(0.3, 16),
      new MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28 }),
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.y = -0.48;
    this.group.add(blob);

    this.group.position.set(this.toX, surfaceY(CONFIG.playerZ) + 0.55, CONFIG.playerZ);
    parent.add(this.group);
  }

  /** True while sliding between lanes — used to gate collision fairness. */
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
  }

  fixedUpdate(step: number): void {
    if (this.switchT < 1) {
      this.switchT = Math.min(1, this.switchT + step / CONFIG.laneSwitchTime);
      this.group.position.x =
        this.fromX + (this.toX - this.fromX) * easeOutCubic(this.switchT);
    }
    if (this.stumbleT > 0) this.stumbleT = Math.max(0, this.stumbleT - step);
  }

  render(dt: number): void {
    // Walking bob; faster + jittery while stumbling.
    const rate = this.isStunned ? 26 : 13;
    this.bob += dt * rate;
    const amp = this.isStunned ? 0.03 : 0.06;
    this.mesh.position.y = Math.abs(Math.sin(this.bob)) * amp;
    this.mesh.rotation.z = this.isStunned ? Math.sin(this.bob * 1.7) * 0.12 : 0;
  }
}

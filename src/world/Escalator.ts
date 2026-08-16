import {
  BoxGeometry,
  Group,
  Mesh,
  type Object3D,
} from "three";
import { CONFIG, COLORS } from "../config.js";
import { toonMaterial } from "../render/toon.js";
import { addOutline } from "../render/outline.js";

// Recycled "treadmill" of escalator steps. The player is fixed; steps flow
// toward the camera (+z) at the current descent speed and wrap to the far end
// when they pass behind, so geometry stays bounded for any run length. The
// downward slope is baked into each step's y from its z.

const yFromZ = (z: number): number => (z - CONFIG.playerZ) * -CONFIG.escalatorSlope;

export class Escalator {
  readonly group = new Group();
  private steps: Mesh[] = [];
  private readonly totalLen = CONFIG.stepCount * CONFIG.stepDepth;

  constructor(parent: Object3D) {
    const width = CONFIG.laneX * 2 + 1.1;
    const stepGeo = new BoxGeometry(width, 0.18, CONFIG.stepDepth * 0.9);
    const matA = toonMaterial({ color: COLORS.stepA });
    const matB = toonMaterial({ color: COLORS.stepB });

    for (let i = 0; i < CONFIG.stepCount; i++) {
      const step = new Mesh(stepGeo, i % 2 ? matA : matB);
      // Lay steps from just behind the player out to the far (fogged) end.
      step.position.z = CONFIG.playerZ + 1 - i * CONFIG.stepDepth;
      step.position.y = yFromZ(step.position.z);
      this.steps.push(step);
      this.group.add(step);
    }

    // Static side rails — long sloped slabs that fade into fog. No need to
    // animate; the moving steps sell the motion.
    const railLen = this.totalLen + 6;
    const railGeo = new BoxGeometry(0.16, 0.5, railLen);
    const railMat = toonMaterial({ color: COLORS.rail });
    const railTilt = Math.atan(CONFIG.escalatorSlope);
    for (const sx of [-1, 1]) {
      const rail = new Mesh(railGeo, railMat);
      rail.position.set(sx * (width / 2 + 0.05), 0.35, CONFIG.playerZ - railLen / 2 + 2);
      rail.rotation.x = -railTilt;
      addOutline(rail, 0.03);
      this.group.add(rail);
    }

    parent.add(this.group);
  }

  /** Advance the treadmill by dz world-units (dz = speed * dt). */
  update(dz: number): void {
    for (const step of this.steps) {
      step.position.z += dz;
      if (step.position.z > CONFIG.cullBehindZ) step.position.z -= this.totalLen;
      step.position.y = yFromZ(step.position.z);
    }
  }

  /** Surface y at the player's z (for placing player/blockers on the steps). */
  surfaceY(z: number): number {
    return yFromZ(z) + 0.1;
  }
}

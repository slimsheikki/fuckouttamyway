import type { Object3D } from "three";
import { CONFIG } from "../config.js";
import { Blocker, ARCHETYPES } from "./Blocker.js";
import { Lane, otherLane } from "./Lanes.js";

// Spawns and recycles a fixed pool of blockers. Guarantees every run stays
// solvable: consecutive blockers are spaced far enough in z that the player
// always has time to switch lanes, and both lanes are never pinched at the
// same depth.

export class BlockerPool {
  private pool: Blocker[] = [];
  private spawnTimer = 0;
  private lastLane: Lane = Lane.Right;
  private readonly farZ = CONFIG.playerZ - (CONFIG.fogFar - 6);

  constructor(
    parent: Object3D,
    private readonly rng: () => number,
  ) {
    // Each pooled blocker gets a fixed archetype (built once) so the crowd has
    // variety without rebuilding meshes on spawn. Shuffle so runs differ.
    for (let i = 0; i < CONFIG.blockerPool; i++) {
      const a = (i + Math.floor(this.rng() * ARCHETYPES.length)) % ARCHETYPES.length;
      this.pool.push(new Blocker(parent, a));
    }
  }

  get active(): readonly Blocker[] {
    return this.pool;
  }

  reset(): void {
    for (const b of this.pool) b.recycle();
    this.spawnTimer = 0;
  }

  private free(): Blocker | null {
    return this.pool.find((b) => !b.active) ?? null;
  }

  update(
    dz: number,
    speed: number,
    interval: number,
    progress: number,
    surfaceY: (z: number) => number,
  ): void {
    // Advance + recycle.
    for (const b of this.pool) {
      if (!b.active) continue;
      b.advance(dz, surfaceY(b.z));
      if (b.z > CONFIG.cullBehindZ) b.recycle();
    }

    // Timed spawns.
    this.spawnTimer -= dz / speed; // dz/speed == dt this tick
    if (this.spawnTimer > 0) return;
    this.spawnTimer += interval;

    // Minimum solvable spacing: the player must be able to complete a lane
    // switch before the next opposite-lane blocker arrives.
    const minGapZ = speed * (CONFIG.laneSwitchTime + 0.12);

    // Choose a lane. Late game biases toward alternating to force quick
    // left-right dodges; early game is random.
    let lane: Lane;
    if (progress > CONFIG.doubleBlockAfter && this.rng() < 0.6) {
      lane = otherLane(this.lastLane);
    } else {
      lane = this.rng() < 0.5 ? Lane.Left : Lane.Right;
    }

    // Never let a fresh blocker land within the impassable window of the
    // nearest same-or-other-lane blocker at the far end.
    let z = this.farZ;
    for (const b of this.pool) {
      if (b.active && b.z < this.farZ + minGapZ && b.lane !== lane) {
        z = Math.min(z, b.z - minGapZ);
      }
    }

    const b = this.free();
    if (!b) return;
    b.spawn(lane, z, surfaceY(z));
    this.lastLane = lane;
  }

  render(dt: number): void {
    for (const b of this.pool) if (b.active) b.render(dt);
  }
}

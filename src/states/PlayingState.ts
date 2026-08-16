import type { GameState } from "../core/StateMachine.js";
import type { Game } from "../Game.js";
import { CONFIG } from "../config.js";
import { overlaps1D, lerp } from "../core/math.js";
import { S } from "./names.js";

const BASE_CAM_Z = CONFIG.playerZ + CONFIG.camBack;

// The descent. World scrolls past the fixed player; collision is a lane +
// z-overlap test. Ends when the player reaches the platform (win) or the metro
// leaves (lose).
export class PlayingState implements GameState {
  readonly name = S.Playing;
  private unsub: (() => void) | null = null;
  private outcome: "made" | "missed" | null = null;
  private combo = 0;

  constructor(private game: Game) {}

  enter(): void {
    this.game.setGameplayCamera();
    this.game.hud.showHud(true);
    this.outcome = null;
    this.combo = 0;
    this.unsub = this.game.input.onIntent((dir) => this.game.player.changeLane(dir));
  }

  exit(): void {
    this.unsub?.();
    this.unsub = null;
  }

  fixedUpdate(step: number): void {
    const g = this.game;
    g.director.tick(step);

    const stunned = g.player.isStunned;
    const speed = g.director.speed * (stunned ? CONFIG.hitStunSpeed : 1);
    const dz = speed * step;

    g.escalator.update(dz);
    g.blockers.update(dz, g.director.speed, g.director.spawnInterval, g.director.progress, (z) =>
      g.escalator.surfaceY(z),
    );
    g.player.fixedUpdate(step);

    this.resolveBlockers();

    // Progress + score.
    g.distanceLeft = Math.max(0, g.distanceLeft - dz);
    g.score += dz;

    // HUD.
    g.hud.setClock(g.director.clockLabel, g.director.progress > 0.8);
    g.hud.setScore(g.score);
    g.hud.setDistance(g.distanceLeft / g.distanceTotal);

    // End conditions.
    if (g.distanceLeft <= 0) this.finish("made");
    else if (g.director.timeUp) this.finish("missed");
  }

  private resolveBlockers(): void {
    const g = this.game;
    const px = CONFIG.playerZ;
    for (const b of g.blockers.active) {
      if (!b.active) continue;
      const sameLane = b.lane === g.player.lane && !g.player.switching;
      const zHit = overlaps1D(b.z, CONFIG.blockerHalfZ, px, CONFIG.playerHalfZ);

      if (sameLane && zHit) {
        this.onHit(b);
      } else if (!b.scored && b.z > px && b.lane !== g.player.lane) {
        // Blocker has passed the player in the OTHER lane -> near miss.
        if (Math.abs(b.z - px) < CONFIG.nearMissZ + CONFIG.blockerHalfZ) {
          this.onNearMiss();
          b.scored = true;
        }
      }
    }
  }

  private onHit(b: { recycle(): void }): void {
    const g = this.game;
    if (CONFIG.instantFailOnHit) {
      this.finish("missed");
      return;
    }
    if (g.player.isStunned) return; // already stumbling, ignore repeats
    g.player.stumble();
    g.director.penalize(CONFIG.hitPenaltyTime);
    this.combo = 0;
    b.recycle();
  }

  private onNearMiss(): void {
    const g = this.game;
    this.combo += 1;
    const pts = CONFIG.nearMissPoints * this.combo;
    g.score += pts;
    g.hud.flashCombo(this.combo > 1 ? `NEAR MISS ×${this.combo}  +${pts}` : `NEAR MISS  +${pts}`);
  }

  private finish(outcome: "made" | "missed"): void {
    if (this.outcome) return;
    this.outcome = outcome;
    this.game.lastOutcome = outcome;
    this.game.fsm.change(S.Result);
  }

  render(dt: number, _alpha: number): void {
    const g = this.game;
    g.player.render(dt);
    g.blockers.render(dt);
    g.hud.tick(dt);

    // Speed-coupled FOV kick + tiny camera pull-back for the rush feel.
    const p = g.director.progress;
    g.camera.fov = lerp(CONFIG.fovBase, CONFIG.fovBase + CONFIG.fovKick, p);
    g.camera.position.z = BASE_CAM_Z + p * 0.6;
    g.camera.updateProjectionMatrix();
  }
}

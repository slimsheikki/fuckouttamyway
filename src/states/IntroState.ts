import type { GameState } from "../core/StateMachine.js";
import type { Game } from "../Game.js";
import { CONFIG } from "../config.js";
import { S } from "./names.js";

const BASE_CAM_Z = CONFIG.playerZ + CONFIG.camBack;

// Builds a fresh run and shows the Helsinki timetable: the metro to Vuosaari
// leaves in N minutes. (M1 renders the timetable as a DOM panel; M2 swaps in
// the 3D LED signage + walk-up cinematic.) A subtle camera dolly plays behind.
export class IntroState implements GameState {
  readonly name = S.Intro;
  private t = 0;
  constructor(private game: Game) {}

  enter(): void {
    this.t = 0;
    this.game.newRun();
    this.game.setGameplayCamera();
    this.game.hud.showHud(false);
    const n = this.game.director.minutes;
    this.game.hud.showScreen(
      "▸ VUOSAARI",
      `Next metro departs in <b style="color:var(--led)">${n} min</b>.<br/>` +
        `The escalator's packed and nobody's moving.<br/>` +
        `<b>Tap or swipe left / right</b> to squeeze past.<br/>Make the train.`,
      { label: "GO!", onClick: () => this.game.fsm.change(S.Playing) },
    );
  }

  exit(): void {
    this.game.hud.hideScreen();
  }

  fixedUpdate(): void {}

  render(dt: number): void {
    // Slow dolly-in for a touch of cinematic life while the panel is up, and
    // keep the crowd swaying so the frame isn't frozen.
    this.t += dt;
    const push = Math.min(this.t / 3, 1) * 0.7;
    this.game.camera.position.z = BASE_CAM_Z - push;
    this.game.blockers.render(dt);
    this.game.player.render(dt);
  }
}

import type { GameState } from "../core/StateMachine.js";
import type { Game } from "../Game.js";
import { S } from "./names.js";

// Made-it / missed-it screen with a replay button back into the intro.
export class ResultState implements GameState {
  readonly name = S.Result;
  constructor(private game: Game) {}

  enter(): void {
    const g = this.game;
    g.hud.showHud(false);
    const made = g.lastOutcome === "made";
    const score = Math.floor(g.score);
    g.hud.showScreen(
      made ? "MADE IT!" : "MISSED IT",
      made
        ? `You slipped onto the Vuosaari train.<br/>Score <b style="color:var(--led)">${score}</b>`
        : `The doors closed. Next one's in a while.<br/>Score <b style="color:var(--led)">${score}</b>`,
      { label: "AGAIN", onClick: () => g.fsm.change(S.Intro) },
    );
  }
  exit(): void {
    this.game.hud.hideScreen();
  }
  fixedUpdate(): void {}
  render(dt: number): void {
    // Keep the frozen scene subtly alive behind the panel.
    this.game.player.render(dt);
    this.game.blockers.render(dt);
  }
}

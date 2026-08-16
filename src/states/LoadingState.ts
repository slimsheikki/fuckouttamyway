import type { GameState } from "../core/StateMachine.js";
import type { Game } from "../Game.js";
import { S } from "./names.js";

// Preloads assets (a no-op in greybox M1) then advances to the intro.
export class LoadingState implements GameState {
  readonly name = S.Loading;
  private done = false;
  constructor(private game: Game) {}

  enter(): void {
    this.done = false;
    this.game.hud.showScreen("F OUTTA MY WAY!", "Loading…");
    this.game.assets
      .preload((frac) => {
        this.game.hud.showScreen(
          "F OUTTA MY WAY!",
          `Loading… ${Math.round(frac * 100)}%`,
        );
      })
      .then(() => {
        this.done = true;
      });
  }
  exit(): void {}
  fixedUpdate(): void {
    if (this.done) this.game.fsm.change(S.Intro);
  }
  render(): void {}
}

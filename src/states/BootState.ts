import type { GameState } from "../core/StateMachine.js";
import type { Game } from "../Game.js";
import { S } from "./names.js";

// One-shot init hop: nothing to draw yet, immediately hand off to LOADING.
export class BootState implements GameState {
  readonly name = S.Boot;
  constructor(private game: Game) {}
  enter(): void {
    this.game.hud.showHud(false);
    this.game.fsm.change(S.Loading);
  }
  exit(): void {}
  fixedUpdate(): void {}
  render(): void {}
}

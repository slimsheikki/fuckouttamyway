import { Game } from "./Game.js";
import { S } from "./states/names.js";
import { BootState } from "./states/BootState.js";
import { LoadingState } from "./states/LoadingState.js";
import { IntroState } from "./states/IntroState.js";
import { PlayingState } from "./states/PlayingState.js";
import { ResultState } from "./states/ResultState.js";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const game = new Game(canvas);

game.fsm
  .add(new BootState(game))
  .add(new LoadingState(game))
  .add(new IntroState(game))
  .add(new PlayingState(game))
  .add(new ResultState(game));

game.fsm.change(S.Boot);
game.start();

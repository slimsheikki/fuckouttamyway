import {
  Color,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  Object3D,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from "three";
import { CONFIG, COLORS } from "./config.js";
import { Loop } from "./core/Loop.js";
import { StateMachine } from "./core/StateMachine.js";
import { Assets } from "./core/Assets.js";
import { makeRng, randInt } from "./core/math.js";
import { Post } from "./render/post.js";
import { Input } from "./input/Input.js";
import { Hud } from "./ui/hud.js";
import { Escalator } from "./world/Escalator.js";
import { Player } from "./world/Player.js";
import { BlockerPool } from "./world/BlockerPool.js";
import { Director } from "./world/Director.js";

// Owns the renderer, scene graph, shared systems and the state machine. States
// read `game.*` for the current run's systems, which are (re)built by newRun().

export class Game {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera: PerspectiveCamera;
  readonly cameraRig = new Object3D();
  readonly worldGroup = new Group(); // steps + blockers
  readonly envGroup = new Group(); // lights, static set dressing
  readonly playerGroup = new Group();

  readonly assets = new Assets();
  readonly input: Input;
  readonly hud = new Hud();
  readonly fsm = new StateMachine();
  private readonly loop: Loop;
  private post: Post;

  // Per-run systems.
  rng = makeRng(1);
  director!: Director;
  escalator!: Escalator;
  player!: Player;
  blockers!: BlockerPool;
  score = 0;
  distanceTotal = 1;
  distanceLeft = 1;
  lastOutcome: "made" | "missed" = "missed";

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({ canvas, antialias: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, CONFIG.maxPixelRatio));
    this.renderer.setClearColor(COLORS.sky);

    this.camera = new PerspectiveCamera(CONFIG.fovBase, 1, 0.1, CONFIG.fogFar + 4);
    this.cameraRig.add(this.camera);
    this.scene.add(this.cameraRig, this.worldGroup, this.envGroup, this.playerGroup);

    this.scene.fog = new Fog(COLORS.fog, CONFIG.fogNear, CONFIG.fogFar);
    this.scene.background = new Color(COLORS.sky);

    const hemi = new HemisphereLight(0xd6e4ff, COLORS.ground, 2.7);
    const dir = new DirectionalLight(0xfff2d6, 2.3);
    dir.position.set(-3, 6, 4);
    // Warm back-fill from down the escalator so the away-facing commuters read.
    const fill = new DirectionalLight(0xccd6ff, 1.6);
    fill.position.set(1, 3, -8);
    this.envGroup.add(hemi, dir, fill);

    this.post = new Post(this.renderer, this.scene, this.camera, CONFIG.ditherEnabled);

    this.input = new Input(canvas);
    this.input.start();

    this.setGameplayCamera();
    this.resize();
    window.addEventListener("resize", this.resize);

    this.loop = new Loop(
      (step) => this.fsm.fixedUpdate(step),
      (dt, alpha) => {
        this.fsm.render(dt, alpha);
        this.post.render();
      },
    );
  }

  /** Behind-and-above chase pose looking down the escalator. */
  setGameplayCamera(): void {
    this.cameraRig.position.set(0, 0, 0);
    this.cameraRig.rotation.set(0, 0, 0);
    this.camera.fov = CONFIG.fovBase;
    this.camera.position.set(0, CONFIG.camHeight, CONFIG.playerZ + CONFIG.camBack);
    this.camera.lookAt(0, CONFIG.camLookY, CONFIG.playerZ - CONFIG.camLookAhead);
    this.camera.updateProjectionMatrix();
  }

  /** Tear down the previous run and build fresh systems for a new descent. */
  newRun(seed?: number): void {
    this.worldGroup.clear();
    this.playerGroup.clear();
    this.rng = makeRng(seed ?? ((Math.random() * 1e9) | 0));
    const minutes = randInt(this.rng, 2, 6);

    this.director = new Director(minutes);
    this.escalator = new Escalator(this.worldGroup);
    this.player = new Player(this.playerGroup, (z) => this.escalator.surfaceY(z));
    this.blockers = new BlockerPool(this.worldGroup, this.rng);
    this.score = 0;
    // Escalator length = descent speed integrated over the countdown (linear
    // ramp => average of start and end speed), scaled by slack so a clean run
    // arrives just before the doors close and stumbles make you miss.
    const seconds = minutes * CONFIG.playSecondsPerMinute;
    const avgSpeed = CONFIG.baseSpeed + CONFIG.speedGain * 0.5;
    this.distanceTotal = avgSpeed * seconds * CONFIG.distanceSlack;
    this.distanceLeft = this.distanceTotal;
  }

  start(): void {
    this.loop.start(performance.now());
  }

  private resize = (): void => {
    const w = innerWidth;
    const h = innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    this.post.setSize(w, h, Math.min(devicePixelRatio, CONFIG.maxPixelRatio));
  };
}

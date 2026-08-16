// Fixed-timestep game loop. Simulation runs at a deterministic fixed dt so
// difficulty and collision are framerate-independent (critical on mobile where
// fps swings wildly); rendering stays uncapped and interpolates via `alpha`.

export const STEP = 1 / 60; // simulation tick, seconds
const MAX_FRAME = 0.1; // clamp dt to avoid spiral-of-death on tab refocus

export class Loop {
  private accumulator = 0;
  private last = 0;
  private raf = 0;
  private running = false;

  constructor(
    private readonly fixedUpdate: (step: number) => void,
    private readonly render: (dt: number, alpha: number) => void,
  ) {}

  start(now: number): void {
    if (this.running) return;
    this.running = true;
    this.last = now;
    this.accumulator = 0;
    this.raf = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private tick = (now: number): void => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.tick);

    const dt = Math.min((now - this.last) / 1000, MAX_FRAME);
    this.last = now;

    this.accumulator += dt;
    while (this.accumulator >= STEP) {
      this.fixedUpdate(STEP);
      this.accumulator -= STEP;
    }
    this.render(dt, this.accumulator / STEP);
  };
}

// Generic finite state machine. Each state owns enter/exit/fixedUpdate/render.
// The active state drives the game loop; transitions are requested by name.

export interface GameState {
  readonly name: string;
  enter(prev: string | null): void;
  exit(next: string): void;
  /** Deterministic simulation tick, fixed dt. */
  fixedUpdate(step: number): void;
  /** Cosmetic per-frame update + draw. `alpha` = interpolation fraction. */
  render(dt: number, alpha: number): void;
}

export class StateMachine {
  private states = new Map<string, GameState>();
  private current: GameState | null = null;
  private pending: string | null = null;

  add(state: GameState): this {
    this.states.set(state.name, state);
    return this;
  }

  /** Queue a transition; applied at the next fixedUpdate boundary so states
   *  never swap mid-tick. */
  change(name: string): void {
    if (!this.states.has(name)) throw new Error(`Unknown state: ${name}`);
    this.pending = name;
  }

  get activeName(): string | null {
    return this.current?.name ?? null;
  }

  private applyPending(): void {
    if (this.pending === null) return;
    const next = this.states.get(this.pending)!;
    const prev = this.current;
    this.pending = null;
    if (prev) prev.exit(next.name);
    this.current = next;
    next.enter(prev?.name ?? null);
  }

  fixedUpdate(step: number): void {
    this.applyPending();
    this.current?.fixedUpdate(step);
    // Apply again so a transition requested inside fixedUpdate takes effect
    // before the next render, keeping visuals in sync with logic.
    this.applyPending();
  }

  render(dt: number, alpha: number): void {
    this.current?.render(dt, alpha);
  }
}

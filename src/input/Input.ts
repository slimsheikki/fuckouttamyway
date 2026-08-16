// Unifies tap, swipe and keyboard into a single lane-change intent (-1 left,
// +1 right). Pointer Events give one code path for touch + mouse. States
// subscribe on enter and unsubscribe on exit.

export type LaneDir = -1 | 1;
type Handler = (dir: LaneDir) => void;

const SWIPE_MIN = 40; // px horizontal to count as a swipe
const TAP_MAX = 12; // px total movement to still count as a tap

export class Input {
  private handlers = new Set<Handler>();
  private startX = 0;
  private startY = 0;
  private moved = 0;
  private tracking = false;
  private started = false;

  constructor(private readonly target: HTMLElement) {}

  onIntent(fn: Handler): () => void {
    this.handlers.add(fn);
    return () => this.handlers.delete(fn);
  }

  private emit(dir: LaneDir): void {
    for (const h of this.handlers) h(dir);
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    this.target.addEventListener("pointerdown", this.onDown);
    this.target.addEventListener("pointermove", this.onMove);
    this.target.addEventListener("pointerup", this.onUp);
    this.target.addEventListener("pointercancel", this.onCancel);
    window.addEventListener("keydown", this.onKey);
  }

  private onDown = (e: PointerEvent): void => {
    this.tracking = true;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.moved = 0;
  };

  private onMove = (e: PointerEvent): void => {
    if (!this.tracking) return;
    this.moved = Math.max(this.moved, Math.abs(e.clientX - this.startX));
  };

  private onUp = (e: PointerEvent): void => {
    if (!this.tracking) return;
    this.tracking = false;
    const dx = e.clientX - this.startX;
    const dy = e.clientY - this.startY;

    // Swipe: dominant horizontal drag.
    if (Math.abs(dx) > SWIPE_MIN && Math.abs(dx) > Math.abs(dy)) {
      this.emit(dx < 0 ? -1 : 1);
      return;
    }
    // Tap: little movement -> pick side by screen half.
    const total = Math.hypot(dx, dy);
    if (total <= TAP_MAX) {
      this.emit(e.clientX < window.innerWidth / 2 ? -1 : 1);
    }
  };

  private onCancel = (): void => {
    this.tracking = false;
  };

  private onKey = (e: KeyboardEvent): void => {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") this.emit(-1);
    else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") this.emit(1);
  };
}

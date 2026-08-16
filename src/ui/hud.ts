// Thin wrapper over the DOM HUD + full-screen overlay. Keeps all
// getElementById lookups in one place; states just call methods.

const $ = <T extends HTMLElement>(id: string): T =>
  document.getElementById(id) as T;

export class Hud {
  private hud = $("hud");
  private clock = $("clock");
  private score = $("score");
  private combo = $("combo");
  private fill = $<HTMLElement>("distance-fill");
  private screen = $("screen");
  private title = $("screen-title");
  private body = $("screen-body");
  private btn = $<HTMLButtonElement>("screen-btn");
  private comboTimer = 0;

  showHud(on: boolean): void {
    this.hud.classList.toggle("hidden", !on);
  }

  setClock(label: string, urgent: boolean): void {
    this.clock.textContent = label;
    this.clock.classList.toggle("urgent", urgent);
  }

  setScore(meters: number): void {
    this.score.textContent = `${Math.floor(meters)} m`;
  }

  /** Distance bar: 1 = top of escalator, 0 = at the platform. */
  setDistance(frac01: number): void {
    this.fill.style.width = `${Math.max(0, Math.min(1, 1 - frac01)) * 100}%`;
  }

  flashCombo(text: string): void {
    this.combo.textContent = text;
    this.combo.classList.add("show");
    this.comboTimer = 0.7;
  }

  tick(dt: number): void {
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo.classList.remove("show");
    }
  }

  /** Show a full-screen panel. `onButton` undefined hides the button. */
  showScreen(
    title: string,
    body: string,
    button?: { label: string; onClick: () => void },
  ): void {
    this.title.textContent = title;
    this.body.innerHTML = body;
    this.screen.classList.remove("hidden");
    if (button) {
      this.btn.textContent = button.label;
      this.btn.classList.remove("hidden");
      this.btn.onclick = button.onClick;
    } else {
      this.btn.classList.add("hidden");
      this.btn.onclick = null;
    }
  }

  hideScreen(): void {
    this.screen.classList.add("hidden");
  }
}

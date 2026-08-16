import { CONFIG } from "../config.js";
import { clamp, lerp } from "../core/math.js";

// Owns the metro countdown and the single difficulty knob. As the countdown
// runs down, `progress` rises 0->1 and drives both descent speed and spawn
// density. The N-minute timetable value seeds the total time.

export class Director {
  readonly minutes: number; // N shown on the timetable (2..6)
  private readonly total: number; // total play seconds
  private elapsed = 0;

  constructor(minutes: number) {
    this.minutes = minutes;
    this.total = minutes * CONFIG.playSecondsPerMinute;
  }

  tick(step: number): void {
    this.elapsed = Math.min(this.total, this.elapsed + step);
  }

  /** Lose time on a stumble — shoves the countdown forward. */
  penalize(seconds: number): void {
    this.elapsed = Math.min(this.total, this.elapsed + seconds);
  }

  get remaining(): number {
    return this.total - this.elapsed;
  }

  get progress(): number {
    return clamp(this.elapsed / this.total, 0, 1);
  }

  get timeUp(): boolean {
    return this.remaining <= 0;
  }

  get speed(): number {
    return CONFIG.baseSpeed + this.progress * CONFIG.speedGain;
  }

  get spawnInterval(): number {
    return lerp(CONFIG.spawnIntervalStart, CONFIG.spawnIntervalEnd, this.progress);
  }

  /** Clock as displayed on the HUD, e.g. "1:07" of metro-minutes. */
  get clockLabel(): string {
    // Map remaining play-seconds back onto the fictional N-minute countdown.
    const frac = this.remaining / this.total; // 1 -> 0
    const totalSecs = Math.ceil(frac * this.minutes * 60);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }
}

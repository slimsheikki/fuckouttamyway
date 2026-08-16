import {
  CanvasTexture,
  RepeatWrapping,
  type Texture,
  NearestFilter,
  SRGBColorSpace,
} from "three";

// Procedural, canvas-painted PS2-style surface textures. The "baked" light,
// grime and material read live in the pixels — no external image assets. All
// are point-filtered and small so they stay chunky. Cached by key.

const cache = new Map<string, Texture>();

function canvas(size: number): { c: HTMLCanvasElement; x: CanvasRenderingContext2D } {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  return { c, x: c.getContext("2d")! };
}

// Deterministic value noise so builds look identical run-to-run.
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hex = (n: number): string => "#" + n.toString(16).padStart(6, "0");

function finish(c: HTMLCanvasElement, repeat: [number, number]): Texture {
  const t = new CanvasTexture(c);
  t.magFilter = NearestFilter;
  t.minFilter = NearestFilter;
  t.generateMipmaps = false;
  t.anisotropy = 1;
  t.colorSpace = SRGBColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  return t;
}

/** Speckle grime + a soft top-down AO gradient over a base colour. */
function grime(
  x: CanvasRenderingContext2D,
  size: number,
  base: number,
  seed: number,
  density = 0.12,
  aoTop = 0.0,
  aoBottom = 0.28,
): void {
  const r = rng(seed);
  x.fillStyle = hex(base);
  x.fillRect(0, 0, size, size);
  // speckle
  for (let i = 0; i < size * size * density; i++) {
    const px = (r() * size) | 0;
    const py = (r() * size) | 0;
    const d = (r() - 0.5) * 0.5;
    x.fillStyle = `rgba(0,0,0,${Math.max(0, d) * 0.5})`;
    x.fillRect(px, py, 1, 1);
    x.fillStyle = `rgba(255,255,255,${Math.max(0, -d) * 0.18})`;
    x.fillRect(px, py, 1, 1);
  }
  // vertical AO (darker toward the bottom = baked contact shadow)
  const g = x.createLinearGradient(0, 0, 0, size);
  g.addColorStop(0, `rgba(0,0,0,${aoTop})`);
  g.addColorStop(1, `rgba(0,0,0,${aoBottom})`);
  x.fillStyle = g;
  x.fillRect(0, 0, size, size);
}

export function concreteTex(): Texture {
  const key = "concrete";
  if (cache.has(key)) return cache.get(key)!;
  const { c, x } = canvas(128);
  grime(x, 128, 0x6f757e, 11, 0.14, 0.05, 0.22);
  const t = finish(c, [3, 3]);
  cache.set(key, t);
  return t;
}

export function tileTex(): Texture {
  const key = "tile";
  if (cache.has(key)) return cache.get(key)!;
  const { c, x } = canvas(128);
  grime(x, 128, 0x8b96a0, 22, 0.06, 0.0, 0.18);
  // grout grid + per-tile shade
  const n = 4;
  const s = 128 / n;
  const r = rng(7);
  for (let iy = 0; iy < n; iy++)
    for (let ix = 0; ix < n; ix++) {
      x.fillStyle = `rgba(${r() < 0.5 ? "0,0,0" : "255,255,255"},${r() * 0.06})`;
      x.fillRect(ix * s, iy * s, s, s);
    }
  x.strokeStyle = "rgba(20,26,34,0.7)";
  x.lineWidth = 2;
  for (let i = 0; i <= n; i++) {
    x.beginPath();
    x.moveTo(i * s, 0);
    x.lineTo(i * s, 128);
    x.moveTo(0, i * s);
    x.lineTo(128, i * s);
    x.stroke();
  }
  const t = finish(c, [4, 2]);
  cache.set(key, t);
  return t;
}

export function metalTex(): Texture {
  const key = "metal";
  if (cache.has(key)) return cache.get(key)!;
  const { c, x } = canvas(64);
  grime(x, 64, 0x9096a0, 33, 0.05, 0.0, 0.15);
  // vertical brushed streaks + one baked highlight band (fake anisotropy)
  const r = rng(5);
  for (let i = 0; i < 60; i++) {
    const px = (r() * 64) | 0;
    x.fillStyle = `rgba(${r() < 0.5 ? "255,255,255" : "0,0,0"},${r() * 0.12})`;
    x.fillRect(px, 0, 1, 64);
  }
  const g = x.createLinearGradient(0, 0, 64, 0);
  g.addColorStop(0.35, "rgba(255,255,255,0)");
  g.addColorStop(0.5, "rgba(255,255,255,0.35)");
  g.addColorStop(0.65, "rgba(255,255,255,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  const t = finish(c, [1, 4]);
  cache.set(key, t);
  return t;
}

/** Diagonal hazard stripes for escalator step edges / safety markings. */
export function stripeTex(): Texture {
  const key = "stripe";
  if (cache.has(key)) return cache.get(key)!;
  const { c, x } = canvas(64);
  x.fillStyle = "#e8b21a";
  x.fillRect(0, 0, 64, 64);
  x.strokeStyle = "#1a1a1a";
  x.lineWidth = 10;
  for (let i = -64; i < 128; i += 24) {
    x.beginPath();
    x.moveTo(i, 0);
    x.lineTo(i + 64, 64);
    x.stroke();
  }
  const t = finish(c, [1, 1]);
  cache.set(key, t);
  return t;
}

/** Blurred colourful poster for ad panels along the tunnel. */
export function posterTex(seed = 1): Texture {
  const key = "poster" + seed;
  if (cache.has(key)) return cache.get(key)!;
  const { c, x } = canvas(64);
  const r = rng(100 + seed);
  const cols = ["#c0392b", "#2980b9", "#27ae60", "#f39c12", "#8e44ad", "#ecf0f1"];
  x.fillStyle = cols[(r() * cols.length) | 0];
  x.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 6; i++) {
    x.fillStyle = cols[(r() * cols.length) | 0];
    x.fillRect((r() * 64) | 0, (r() * 64) | 0, 8 + r() * 30, 8 + r() * 24);
  }
  x.fillStyle = "rgba(0,0,0,0.25)";
  x.fillRect(0, 48, 64, 16); // baked text band
  const t = finish(c, [1, 1]);
  cache.set(key, t);
  return t;
}

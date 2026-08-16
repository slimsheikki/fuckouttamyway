import {
  DataTexture,
  MeshToonMaterial,
  NearestFilter,
  RedFormat,
  SRGBColorSpace,
  type ColorRepresentation,
  type Object3D,
  type Texture,
  Mesh,
  MeshStandardMaterial,
} from "three";
import { CONFIG } from "../config.js";

// Shared cel-shading ramp: a few hard steps instead of a smooth gradient.
// This is the core "toon" tell. NearestFilter keeps the bands crisp.
let sharedRamp: DataTexture | null = null;

/** PS2 vertex snapping: quantize the projected position to a low grid so
 *  geometry jitters like sub-pixel-less PS2 hardware. Subtle by default. */
export function ps2Snap(mat: MeshToonMaterial): void {
  if (!CONFIG.ps2Snap) return;
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      "#include <project_vertex>",
      `#include <project_vertex>
       {
         float g = ${CONFIG.snapGrid.toFixed(1)};
         gl_Position.xy = floor(gl_Position.xy / gl_Position.w * g) / g * gl_Position.w;
       }`,
    );
  };
}

export function toonRamp(steps = CONFIG.toonSteps): DataTexture {
  if (sharedRamp) return sharedRamp;
  const data = new Uint8Array(steps);
  for (let i = 0; i < steps; i++) {
    // Bias the ramp so most of the surface sits in the brighter bands (PS2 look).
    data[i] = Math.round(Math.pow((i + 1) / steps, 0.8) * 255);
  }
  const tex = new DataTexture(data, steps, 1, RedFormat);
  tex.magFilter = NearestFilter;
  tex.minFilter = NearestFilter;
  tex.needsUpdate = true;
  sharedRamp = tex;
  return tex;
}

/** PS2 texture settings: chunky nearest-neighbour, no mips, no anisotropy. */
export function ps2ify(tex: Texture): Texture {
  tex.magFilter = NearestFilter;
  tex.minFilter = NearestFilter;
  tex.generateMipmaps = false;
  tex.anisotropy = 1;
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

export interface ToonOpts {
  color?: ColorRepresentation;
  map?: Texture | null;
}

export function toonMaterial(opts: ToonOpts = {}): MeshToonMaterial {
  const map = opts.map ? ps2ify(opts.map) : null;
  const mat = new MeshToonMaterial({
    color: opts.color ?? 0xffffff,
    map,
    gradientMap: toonRamp(),
  });
  ps2Snap(mat);
  return mat;
}

/**
 * Convert every mesh in a loaded glTF hierarchy to the toon look in place,
 * preserving base colour/texture from the source material. Called on load so
 * gameplay code never sees the original standard materials.
 */
export function toonify(root: Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!mesh.isMesh) return;
    const src = mesh.material as MeshStandardMaterial | MeshStandardMaterial[];
    const convert = (m: MeshStandardMaterial): MeshToonMaterial =>
      toonMaterial({ color: m.color?.getHex() ?? 0xffffff, map: m.map });
    mesh.material = Array.isArray(src) ? src.map(convert) : convert(src);
  });
}

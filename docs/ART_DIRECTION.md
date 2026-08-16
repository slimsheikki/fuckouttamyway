# Art Direction — PS2 / Cel-Shaded Look

**References:** Tony Hawk's Pro Skater, GTA III, Crazy Taxi. Chunky low-poly
geometry, hard-banded lighting, low-res point-filtered textures, heavy fog for
draw distance, black object outlines, dithered framebuffer.

This document is the recipe. Every technique below is already wired into the
codebase so the greybox build reads as PS2 today; the M2 art pass swaps meshes
and textures without touching these systems.

## 1. Toon (cel) shading — `src/render/toon.ts`

- Base material is `THREE.MeshToonMaterial`. The cel banding comes from a custom
  **gradient ramp** (`toonRamp()`): a 4-texel `DataTexture` with `NearestFilter`
  so lighting snaps between a few flat bands instead of a smooth gradient.
- The ramp is biased brighter (`pow(t, 0.8)`) so surfaces sit mostly in the lit
  bands — the PS2 "flat and readable" look rather than muddy.
- `toonify(root)` converts any loaded glTF hierarchy in place: it reads each
  source material's colour + map and rebuilds it as a toon material, so gameplay
  code never sees the original PBR materials.

## 2. Inverted-hull outlines — `src/render/outline.ts`

- Every outlined mesh gets a **back-face shell**: the same geometry drawn with
  `side: BackSide`, pushed outward along its normals in the vertex shader, in
  near-black. This is the authentic per-object toon outline.
- The shell is parented to the source mesh (`renderOrder = -1`) so it inherits
  transforms and the real mesh overdraws the interior.
- The outline fragment fades to fog colour with distance so far outlines don't
  read as hard black scribbles.
- **M2 note:** skinned Mixamo meshes need skinning in the shell shader — switch
  from the standalone `ShaderMaterial` to a toon material + `onBeforeCompile`
  normal-push that keeps the skinning chunks.

## 3. Textures — `ps2ify()` in `src/render/toon.ts`

The single biggest PS2 tell. Every texture:
- `magFilter = minFilter = NearestFilter` (chunky, no bilinear smoothing)
- `generateMipmaps = false`, `anisotropy = 1`
- Source art authored at **64–128 px**. Keep palettes small and flat; let the
  toon ramp do the shading, not the texture.

## 4. Fog & limited draw distance — `src/Game.ts`, `src/config.ts`

- `THREE.Fog` (linear) from `fogNear` to `fogFar`, colour = station teal-grey.
- Camera `far` sits just past `fogFar` so the escalator **fades in** from the
  dark instead of popping — this both sells "limited draw distance" and hides
  the treadmill recycle seam.

## 5. Dither post pass — `src/render/shaders/dither.ts`, `src/render/post.ts`

- `EffectComposer` → `RenderPass` → a single **ordered-dither `ShaderPass`**
  (4×4 Bayer matrix) that quantizes colour to ~16 steps/channel with a dither
  pattern, emulating the banded PS2 framebuffer.
- **Bloom is intentionally OFF** — it's not a PS2 look and costs mobile frames.
- Kept to one extra pass. A CRT/scanline pass can be added behind a flag but
  stays off on mobile.

## 6. Lighting — `src/Game.ts`

- `HemisphereLight` (cool sky / warm ground) for ambient fill + one warm
  `DirectionalLight` that drives the toon ramp's key band, plus a dim cool
  back-fill so silhouettes separate from the fog.
- **No real-time shadows** (PS2 faked them). The player gets a **blob shadow**:
  a dark disc under the feet (`src/world/Player.ts`).

## 7. Optional PS2 vertex wobble (M2 toggle)

Two effects to add via `material.onBeforeCompile`, both behind uniforms shipped
subtle:
- **Vertex snapping** — quantize clip-space XY to a low-res grid for the
  geometry jitter PS2 hardware produced (no sub-pixel precision).
- **Affine texture warp** — drop perspective-correct UV interpolation for the
  signature texture "swim" on large surfaces.

## Palette

Defined in `COLORS` (`src/config.ts`). Player is hi-vis commuter yellow so the
avatar always pops against the cool grey crowd and steps; standers use a small
muted set; timetable LED is Helsinki orange (`#ff7a1a`).

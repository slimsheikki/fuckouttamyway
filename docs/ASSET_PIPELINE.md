# Asset Pipeline — CC0 models to in-game

The game runs fully on greybox primitives today (`Assets.greybox = true`). This
is the plan to swap in real low-poly art without touching gameplay code.

## Sources (all CC0 / commercial-safe — verify each pack's license, log below)

| Asset | Source |
|---|---|
| Low-poly humanoids | Quaternius — https://quaternius.com (Ultimate Modular Characters) |
| Blockout / kits | Kenney — https://kenney.nl/assets |
| Characters | KayKit — https://kaylousberg.itch.io |
| Animations | Mixamo — https://www.mixamo.com (walk / idle / run — free) |
| Audio SFX | Kenney audio, Freesound (CC0 filter) — https://freesound.org |
| Music | FreePD — https://freepd.com (CC0) |

## Model → cel look → glTF → load

1. Grab base low-poly humanoids (Quaternius / KayKit). Confirm CC0; add to
   `CREDITS.md`.
2. In Blender, retarget Mixamo **walk / idle / run** onto the rig (or Mixamo
   auto-rig → export FBX → import). Keep bone counts low.
3. Retexture PS2-style: replace materials with **64–128 px** flat-ish textures
   that read under the toon ramp. Export as PNG.
4. Export **glTF 2.0 (`.glb`)** with animations packed. Optionally run through
   `gltf-transform` for Draco compression + dedupe. One `.glb` per logical asset
   (player, ~3 blocker variants, escalator step, station kit) into
   `public/assets/models/`.
5. Register in `MANIFEST` (`src/core/Assets.ts`). On load each scene is auto
   `toonify()`-ed + `addOutline()`-ed, and `greybox` flips to `false`.

## How the swap stays gameplay-safe

Entity factories (`Player`, `Blocker`, `Escalator`) build primitives today. When
`Assets.greybox` is false they should call `assets.instance(key)` for the mesh
instead — **same colliders, lanes, positions and animation timing**. Collision,
spawning, difficulty and scoring never change, so M2 is a rendering swap only.

## Placeholder greybox mapping (current)

| Entity | Greybox primitive | Target model |
|---|---|---|
| Player | `CapsuleGeometry` (hi-vis) | rigged commuter, walk/run clips |
| Blocker | `BoxGeometry` (muted colours) | standing commuters, idle clip |
| Escalator step | `BoxGeometry` strip | escalator step kit + moving handrail |
| Station / timetable | (M2) | Helsinki station kit + 3D LED sign |

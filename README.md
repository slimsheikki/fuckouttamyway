# F Outta My Way!

A mobile-first, browser-playable PS2-styled game. You're a 9-to-5 commuter in
Helsinki who just clocked out and has to catch the Metro to **Vuosaari**,
leaving in **N minutes**. The escalator down to the platform is packed and
nobody's mindful — the left lane is supposed to be for walkers. Auto-descend,
dodge the standers by switching lanes, and beat the countdown before the doors
close. The closer the metro, the faster you go, the harder it gets.

Built with **Three.js** + **TypeScript** + **Vite**. Cel-shaded, low-poly,
fogged and dithered for an authentic PlayStation 2 look (Tony Hawk / GTA III /
Crazy Taxi). One runtime dependency: `three`.

## Play / develop

```bash
npm install
npm run dev        # http://localhost:5173/fuckouttamyway/
```

- **Controls:** tap left/right screen half, swipe left/right, or Arrow / A-D keys.
- **Build:** `npm run build` (type-checks then bundles to `dist/`).
- **Smoke test:** `npm run preview` in one shell, then `node scripts/smoke.mjs`
  (headless full-run check).

## How it works

- **Fixed-timestep sim, variable render** (`src/core/Loop.ts`) — difficulty and
  collision are framerate-independent, which matters on mobile.
- **World scrolls past a fixed player** — the escalator is a recycled treadmill;
  "distance remaining" is a simple integrator. Steps and blockers are pooled, so
  geometry stays bounded for any run length.
- **Two discrete lanes** collapse collision to a lane-equality + z-overlap test —
  no physics engine.
- **One difficulty knob** (`src/world/Director.ts`): the N-minute countdown drives
  both descent speed and spawn density. The spawner guarantees every run stays
  solvable.
- **State machine** (`src/states/`): Boot → Loading → Intro (timetable) →
  Playing → Result → replay.

## Project layout & docs

- `src/render/` — the PS2 look. See **[docs/ART_DIRECTION.md](docs/ART_DIRECTION.md)**
  for the toon-shading / outline / dither / fog recipe.
- `src/world/` — escalator, lanes, player, blockers, director.
- `docs/ASSET_PIPELINE.md` — swapping greybox primitives for CC0 low-poly models.
- `src/config.ts` — all tuning knobs in one place.

## Status

Playable greybox vertical slice (M0 + M1). Next: **M2** art pass (CC0 models +
Mixamo animations + 3D LED timetable cinematic), **M3** audio & juice, **M4**
deploy. See `docs/` and the design plan for the roadmap.

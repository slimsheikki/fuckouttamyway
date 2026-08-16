# Art Bible — "F Outta My Way!"

Concrete visual spec for every element in the game. Companion to
`ART_DIRECTION.md` (which is the *technical* shader recipe) and
`ASSET_PIPELINE.md` (the CC0 → glTF workflow). This doc is the *what it looks
like*.

---

## 0. The target look: "Tony Hawk 2, on the Metro"

THPS2 is late-PS1 / early-PS2: **baked-in lighting, no dynamic shadows, low-res
hand-painted textures with the light already painted on, chunky ~500–900-tri
characters, vibrant-but-grimy palette, dithered non-AA framebuffer.** GTA III
and Crazy Taxi add the fog-limited street depth and saturated signage.

Our engine already ships the mechanics for this (`src/render/`). The art
proposal is a deliberate **blend**, tunable with three sliders so the art
director can dial the exact spot on the THPS↔cel axis:

| Slider | THPS2 end | Our default | GTA3/cel end |
|---|---|---|---|
| **Outline thickness** (`addOutline`) | 0 (none) | thin (~0.6px) | bold |
| **Toon bands** (`toonRamp` steps) | 5–6 soft (vertex-lit feel) | 4 | 2–3 hard cel |
| **Baked-vs-realtime light** | 100% baked into textures | ~70% baked + subtle real-time ramp | mostly real-time |

**Recommendation:** default to the middle column — mostly baked texture lighting
(true THPS2), a soft 4-band toon ramp so moving characters aren't flat, and a
*thin* outline so silhouettes read at speed without going full cartoon. Ship all
three as live uniforms/config so we can review side-by-side against reference
frames.

Authenticity layers already in code, kept subtle: **affine texture warp +
vertex snapping** (the PS2 "swim/jitter"), **ordered dithering**, **NearestFilter
textures**, **fog draw-distance**, **blob shadows**, **no MSAA**, **~1.0–1.5×
DPR rendered to a slightly downscaled target and point-upscaled**.

**Poly / draw budget (mobile):** whole scene ≤ ~45k tris on screen, ≤ ~40 draw
calls. Achieved by atlasing (one texture per "family"), instancing the crowd,
and the pooled treadmill.

---

## 1. Materials (the whole game uses ~7)

| # | Material | Built on | Used for | Notes |
|---|---|---|---|---|
| M1 | **Toon-baked** | `MeshToonMaterial` + ramp, `map` = baked-light atlas | characters, NPCs, props, station | the workhorse; lighting lives in the texture, ramp adds a little form |
| M2 | **Emissive LED** | `MeshBasicMaterial` (unlit) + canvas texture | timetable, train destination sign, "M" logos | ignores scene light so it "glows"; no bloom |
| M3 | **Emissive tube** | unlit, flat bright | fluorescent ceiling strips, platform lights | drives the *baked* highlights in M1 textures |
| M4 | **Scrolling handrail** | toon + animated `map.offset` | escalator rubber handrail belt | UV scrolls at handrail speed = motion |
| M5 | **Brushed metal skirt** | toon, low-sat grey, baked vertical streaks | escalator side panels, comb plates | fake anisotropic highlight painted in |
| M6 | **Glass** | `MeshBasicMaterial`, dark tint, `transparent`, baked reflection streak | train windows, ad panels | one painted highlight strip = "reflection" |
| M7 | **Floor tile** | toon, tiling 128² grunge | platform + concourse floor | affine-warp most visible here (intended) |

No PBR, no metalness/roughness maps, no normal maps — everything is a flat
colour + a hand-painted light/AO/grime pass baked into a small atlas.

---

## 2. Textures — style & budget

- **Resolution:** 64² for small props, 128² per character/NPC atlas, 128²
  tiling for surfaces, 256² only for the timetable canvas. Point-filtered, no
  mips.
- **Authoring:** hand-paint the light. Every texture carries: base colour →
  soft top-down AO → a warm key highlight (upper-left) → grime/scuffs → tiny
  baked specular dots on metal/edges. This *is* the THPS2 look — the model reads
  as lit even under flat light.
- **Palette — "Helsinki Underground":** cool desaturated base (concrete grey
  `#6f757e`, teal shadow `#1a2230`, steel `#8a8f98`), punched by warm signage
  (`#ff7a1a` metro orange), fluorescent green-white (`#e8f0e0`) light, and a few
  saturated commuter accents. Overall grimy, a touch green in the shadows (dead
  fluorescent cast).
- **Atlas families (one texture each → one draw call each):** `player`,
  `crowd`, `escalator`, `station`, `train`, `props`. UV-pack per family in
  Blender.

---

## 3. The player character(s)

**Fantasy:** the Helsinki knowledge-worker at 16:58, bag half-packed, *just*
clocked out, power-walking so they don't wait 6 minutes for the next train. Dry,
determined, slightly sweaty dignity.

**Silhouette rule:** must be instantly the brightest, most readable thing on
screen. So the player always carries **one hi-vis signature accent** (default: a
mustard-yellow beanie + matching messenger bag) against the muted crowd.

**Default roster (3 selectable, same rig so they share all animation):**
1. **"Aki"** — untucked office shirt, loosened tie flapping, blazer, laptop
   messenger bag, lanyard bouncing, takeaway coffee in one hand.
2. **"Riikka"** — puffer-vest-over-blouse, tote bag, phone in hand, scarf.
3. **"Sami"** — hoodie under a blazer (startup guy), backpack, AirPods, reusable
   coffee cup.

Each ~700–900 tris, one 128² atlas (M1), baked face + clothing (no separate
head geometry detail — features are painted, THPS-style). The coffee/bag/scarf
are the bits that **animate and sell speed** (flap, swing, jiggle).

**Animation set** (Mixamo base + hand-tuned):
- `idle` (concourse, shifting weight, checks phone/watch)
- `walk` (intro walk-up)
- `run` — a *power-walk*, not a sprint: long urgent strides, arms pumping, bag
  swinging. Loop speed scales with descent speed.
- `dodge_L` / `dodge_R` — a shoulder-first lean/turn as you cross lanes
- `stumble` — clip someone: arms windmill, coffee sloshes, half-second hitch
- `win` — slip through the doors, fist-pump / relieved exhale
- `lose` — hands on knees on the platform as the train pulls away

**Blob shadow** under the feet (already in `Player.ts`).

---

## 4. The NPCs (the standers)

The obstacle *and* the comedy. A packed, oblivious Helsinki crowd standing two
abreast, ignoring the walk-left etiquette. **8 archetypes**, muted palette so the
player pops, all on one shared `crowd` atlas, instanced. Each has a distinct
**silhouette** (readability at speed) and an idle + a "startled" reaction.

| # | Archetype | Silhouette tell | Idle | Personality |
|---|---|---|---|---|
| N1 | **Phone Zombie** | head down, glowing phone | thumb-scroll | never looks up until you pass |
| N2 | **Tourist + roller bag** | wide (bag juts into lane) | looks at metro map | blocks extra width |
| N3 | **Newspaper Reader** | arms wide holding paper (Hesari) | page turn | full-lane wingspan |
| N4 | **Grocery Hauler** | two bulging K-Market bags | shifts bags | elderly, slow |
| N5 | **The Couple** | two heads, holding hands | lean together | occupies a lane as a unit |
| N6 | **Winter Coat** | huge puffer, hood up | sniff, stamp feet | pure width, seasonal |
| N7 | **Teens x2** | side-by-side, hoodies | laugh at phone | won't break formation |
| N8 | **Cyclist** | standing bike beside them | wheel wobble | bike is the hitbox |

**Reaction system** — when the player passes within near-miss range, the NPC:
1. **head-snaps** toward the player (fast rotate), 2. plays a **startle** twitch
(flinch back / grab bag / stumble a half-step), 3. pops a **speech bubble**
(§5). Escalates: a *near-miss* = surprised; an actual *bump* = annoyed/angry
bubble + bigger flinch.

Density & variety scale with the difficulty ramp (`Director.progress`): early
crowd is sparse and calm, late crowd is a wall of puffer coats and roller bags.

---

## 5. NPC barks — what they say when you blow past

Helsinki is tri-lingual, so the crowd is too (**Finnish / Swedish / English**) —
that mix *is* the joke and the sense of place. Delivered as a **pixel-font comic
speech bubble** that pops above the head for ~0.6 s with a little "!" burst;
optional short VO one-liner. Two pools, picked by near-miss vs bump.

**Surprised (near-miss) — mostly Finnish/Swedish, dry:**
- `Anteeksi?!` (Excuse me?!)
- `Hei hei!` (Hey!)
- `Huh huh.` (very Finnish sigh of alarm)
- `Mitä?!` (What?!)
- `Onks kiire?` (In a hurry, are we?)
- `No nyt...` (Well now...)
- `Varo vähän!` (Watch it a bit!)
- `Ursäkta!` / `Oj!` (Swedish: Excuse me! / Oops!)
- `Nuoret nykyään.` (Kids these days.)
- Tourist: `Oh! So sorry!`, `Whoa—`, `Excuse you!`

**Bumped (collision) — sharper:**
- `Hei, VARO!` (Hey, WATCH IT!)
- `Ei voi olla totta.` (Un-be-lievable.)
- `Perkele!` — the classic Finnish outburst. *Rating note:* mild profanity; keep
  it **rare** ("golden" bark) and it likely bumps us to PEGI 12 / T. Ship a
  **"clean mode"** config flag that swaps it for `Pyh!` / `Hyi!` so we can hold a
  younger rating if the client wants.
- `Sori vaan!` (sarcastic "so sorry")
- Suitcase tourist: `My bag!`

**Style barks (rare, reward a big combo):** the whole passed cluster reacts in
sequence — a little Mexican-wave of `Huh!` … `Hei!` … `Anteeksi?!` — with a
combo-colored bubble. This is the shareable moment.

Bubbles use the same chunky pixel/monospace UI font as the HUD, high-contrast,
black outline, 1–2 words max so they're legible in a 0.6 s flash on a phone.

---

## 6. The Metro screen (the timetable signage)

The icon of the whole intro. Modeled on **HSL / Helsinki Metro** signage: a dark
box hanging over the escalator throat, **amber-orange dot-matrix LED** text on
near-black, with the metro **"M"** roundel (white M on an orange square).

- **Geometry:** a boxy hanging sign (housing = M5 metal, face = M2 emissive) on
  two struts bolted to the tunnel ceiling.
- **Face content (256² canvas texture, redrawn when N changes):**
  ```
  ┌────────────────────────────┐
  │ [M]  VUOSAARI            2  │   ← destination + minutes, amber dots
  │      Metro · Metron          │   ← FI/SW subtitle line, dim
  └────────────────────────────┘
  ```
  Big minutes digit on the right, `min` label, a subtle **scanning refresh** and
  faint per-dot flicker so it reads as real LED. As the countdown gets urgent it
  **shifts amber → red** and blinks, mirroring the HUD clock.
- **Rendering:** unlit emissive, **no bloom** (PS2), a 1-px dark grid baked
  between "dots," slight affine warp as the camera pushes in during the intro.
- **M0/M1 fallback:** the current DOM `▸ VUOSAARI / N min` panel stands in until
  the 3D sign lands.

---

## 7. The escalators

The stage. Straight from a deep Helsinki metro hall (think Kamppi / Rautatientori
— long, steep, steel).

- **Steps:** grooved die-cast metal, each step's front edge painted **safety
  yellow** (the demarcation combs), baked AO in the tread grooves. The pooled
  treadmill (`Escalator.ts`) already scrolls these; swap the greybox box for the
  grooved-step mesh + `escalator` atlas.
- **Handrails:** black rubber moving belts on each balustrade, material **M4**
  (scrolling UVs) so they visibly travel with you — a huge motion cue.
- **Balustrade / skirt:** brushed stainless side panels (**M5**) with a long
  baked vertical highlight; grimy at the bottom.
- **Lighting:** cool **fluorescent strip** (M3) running the length of each
  balustrade — this is the key light baked into everything nearby, giving the
  green-white cast. A warm spill from the orange timetable above.
- **Tunnel:** concrete barrel-vault ceiling and side walls fading into fog;
  occasional grimy tiled sections, ad panels (M6 glass over posters), a lone
  "⚠ Seiso oikealla / Stå till höger" (stand on the right) sticker — visual irony
  the whole game is about.
- **Comb plates** at top (intro) and bottom (platform) sell entry/exit.

---

## 8. The Metro (the train) & platform — the payoff

The finish line. The **classic Helsinki orange** M100-series train (that bright
orange livery is *the* icon; newer M300 is white+orange — we use orange for
recognizability).

- **Train:** boxy low-poly car, **metro-orange body**, dark grey window band,
  black door recesses, white **"M"** and route info, a lit destination sign
  (M2 emissive: `VUOSAARI`). Windows = M6 glass with a baked interior-glow +
  reflection streak. One car is enough — it fills the platform edge.
- **Platform:** island platform, tiled walls (station atlas), HSL signage,
  yellow platform-edge line, fluorescent ceiling, benches, a clock. Fogged ends.
- **Win cinematic:** camera whips to platform-level; the doors are open with the
  **three-tone HSL door chime**; you slip through as they close, the car pulls
  off. Fist-pump, cut to result.
- **Lose cinematic:** you reach the bottom a beat late — doors *thunk* shut, the
  orange car slides away down the tunnel, you're left on the empty platform.
  Result panel: next train in a while.

---

## 9. Lighting model (scene-wide)

Baked-first, three real-time lights for the moving stuff (already in `Game.ts`):
- **Hemisphere** — cool sky / warm ground ambient fill.
- **Directional key** (warm) — drives the toon ramp's lit band; matches the
  baked highlight direction in the textures (upper-left) so real-time and baked
  agree.
- **Cool back-fill** — separates silhouettes from the fog.
- **Emissive fixtures** (M2/M3) provide the *painted* light — the fluorescent
  strips and orange sign are what the texture bakes reference. No real-time
  shadows anywhere; **blob shadows** under player + key NPCs.
- **Fog** ties depth together and hides the treadmill/crowd recycle.

---

## 10. Asset production checklist (feeds `ASSET_PIPELINE.md`)

Per family, in priority order for M2:
1. **escalator** — grooved step, handrail belt, skirt, comb, fluorescent strip.
   (Biggest visual win; it's 80% of screen time.)
2. **crowd** — 8 NPC archetypes on one atlas + idle/startle clips + bark data.
3. **player** — 3 commuters on the shared rig + the 7-clip anim set.
4. **timetable** — 3D hanging sign + dot-matrix canvas renderer.
5. **station/train** — platform kit + orange car + door chime + win/lose beats.
6. **props** — coffee cups, bags, newspaper, bike, roller case, K-Market bags.

All CC0-sourced (Quaternius/KayKit/Kenney/Mixamo), retextured to the palette
above, atlased, exported `.glb`, logged in `CREDITS.md`.

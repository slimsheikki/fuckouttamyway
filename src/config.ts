// Central tuning knobs. One place for designers to feel the game.

export const CONFIG = {
  // --- Escalator geometry ---
  laneX: 0.55, // |x| of each lane centre
  stepDepth: 0.9, // z-length of one escalator step
  stepCount: 26, // steps in the recycled treadmill
  escalatorSlope: 0.28, // vertical drop per unit z (descent tilt)

  // --- Player ---
  playerZ: 2.0, // fixed z the player sits at (world scrolls past)
  laneSwitchTime: 0.13, // seconds to slide between lanes
  playerHalfZ: 0.35, // collision half-depth on z
  playerHalfX: 0.28,

  // --- Descent / difficulty ---
  baseSpeed: 5.0, // units/s at run start
  speedGain: 7.5, // added over the run as the metro nears
  playSecondsPerMinute: 8, // N metro-minutes compressed to N*this seconds
  distanceSlack: 0.9, // <1 = a clean run reaches the platform with time to spare
  spawnIntervalStart: 1.35, // seconds between spawns, early
  spawnIntervalEnd: 0.5, // seconds between spawns, late
  doubleBlockAfter: 0.55, // progress (0..1) before both-lane pinches allowed
  doubleBlockGap: 1.6, // forced clear gap (s) around a double block

  // --- Blockers ---
  blockerPool: 16,
  blockerHalfZ: 0.4,
  cullBehindZ: 5.0, // recycle once a blocker passes this far behind player

  // --- Scoring ---
  nearMissZ: 0.85, // |dz| window for a near-miss in the other lane
  nearMissPoints: 15,
  hitPenaltyTime: 0.9, // seconds of countdown lost on a bump (stumble)
  hitStunSpeed: 0.35, // speed multiplier during the stumble
  hitStunTime: 0.5,
  instantFailOnHit: false, // config flag: true = one bump ends the run

  // --- Camera (chase pose behind + above the player) ---
  camBack: 6.4, // distance behind the player
  camHeight: 3.7,
  camLookY: 0.7,
  camLookAhead: 9, // how far down the escalator the camera aims
  fovBase: 60,
  fovKick: 12, // extra FOV at full speed

  // --- Render / art sliders (tune the THPS2 <-> cel look) ---
  fogNear: 10,
  fogFar: 36,
  maxPixelRatio: 1.5,
  ditherEnabled: true,
  ps2Snap: true, // quantize vertices in clip space = PS2 geometry jitter
  snapGrid: 220, // higher = subtler snap
  toonSteps: 4, // cel bands (5-6 soft/vertex-lit .. 2-3 hard cel)

  // --- Content ---
  cleanMode: true, // true = family-friendly barks; false = full Finnish spice
} as const;

export const COLORS = {
  fog: 0x1a2230,
  sky: 0x2a3547,
  ground: 0x39414d,
  stepA: 0x8a8f98,
  stepB: 0x6f757e,
  rail: 0x2b2f36,
  player: 0xffcf4d, // hi-vis commuter
  standers: [0x5b6f9c, 0x9c5b64, 0x5b9c6f, 0x8c7bb0, 0xb08a5b] as number[],
  led: 0xff7a1a, // Helsinki timetable orange
} as const;

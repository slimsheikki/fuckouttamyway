import { CONFIG } from "../config.js";

// Two discrete lanes. Left is the Helsinki "walker" lane (etiquette says
// standers keep right); gameplay-wise they're symmetric slots.
export const enum Lane {
  Left = 0,
  Right = 1,
}

export const laneCenterX = (lane: Lane): number =>
  lane === Lane.Left ? -CONFIG.laneX : CONFIG.laneX;

export const otherLane = (lane: Lane): Lane =>
  lane === Lane.Left ? Lane.Right : Lane.Left;

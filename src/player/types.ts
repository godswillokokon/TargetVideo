/**
 * Playback domain types — pure state machine inputs/outputs.
 * UI and react-native-video must not leak into these shapes.
 */

export enum Phase {
  Loading = 'loading',
  Playing = 'playing',
  Cliffhanger = 'cliffhanger',
  Ad = 'ad',
  Ended = 'ended',
  Error = 'error',
}

export type PlaybackState = {
  unlocked: boolean;
  phase: Phase;
  positionSec: number;
  /** Infinity until LOADED sets a real cliff from duration. */
  cliffSec: number;
  /**
   * Seek target parked while the cliff lock is up.
   * Null when playback reached the cliff on its own.
   */
  resumeSec: number | null;
  durationSec: number;
  /** Bumped each time we (re)bind a video source. */
  sourceId: number;
  /** Bumped each time an ad session starts. */
  adSession: number;
  errorMessage: string | null;
};

export type PlaybackEvent =
  | { type: 'LOADED'; durationSec: number; sourceId: number; cliffRatio: number }
  | { type: 'TICK'; positionSec: number; sourceId: number }
  | { type: 'SEEK'; positionSec: number }
  | { type: 'START_AD' }
  | { type: 'AD_FINISHED'; session: number }
  | { type: 'AD_CANCELLED'; session: number }
  | { type: 'AD_FAILED'; session: number }
  | { type: 'ENDED'; sourceId: number }
  | { type: 'FAILED'; message: string }
  | { type: 'RETRY' };

import { Phase, type PlaybackEvent, type PlaybackState } from '@/player/types';

/** Cliff stays at Infinity until LOADED, so the first frames cannot lock. */
export const initialPlaybackState: PlaybackState = {
  unlocked: false,
  phase: Phase.Loading,
  positionSec: 0,
  cliffSec: Number.POSITIVE_INFINITY,
  resumeSec: null,
  durationSec: 0,
  sourceId: 0,
  adSession: 0,
  errorMessage: null,
};

function pastCliff(state: PlaybackState, positionSec: number): boolean {
  return (
    Number.isFinite(state.cliffSec) &&
    positionSec >= state.cliffSec &&
    !state.unlocked
  );
}

/** Shared by the reducer and the player so a scrub cannot skip the cliff. */
export function resolveSeek(
  state: PlaybackState,
  requestedSec: number,
): PlaybackState {
  if (
    state.phase === Phase.Ad ||
    state.phase === Phase.Loading ||
    state.phase === Phase.Error ||
    state.phase === Phase.Cliffhanger
  ) {
    return state;
  }
  const cap = state.durationSec > 0 ? state.durationSec : requestedSec;
  const positionSec = Math.max(0, Math.min(requestedSec, cap));
  if (pastCliff(state, positionSec)) {
    // Hold the frame on the cliff, but keep the requested time for after the ad.
    return {
      ...state,
      positionSec: state.cliffSec,
      phase: Phase.Cliffhanger,
      resumeSec: positionSec,
    };
  }
  return {
    ...state,
    positionSec,
    phase: state.phase === Phase.Ended ? Phase.Playing : state.phase,
    resumeSec: null,
  };
}

/**
 * A progress sample this close to the pending seek is the landed frame.
 * Wider than this, and a sample from before the seek can clear the guard.
 */
export const SEEK_SETTLE_SEC = 0.35;

export function progressMatchesSeek(
  currentTime: number,
  pendingSec: number | null,
): boolean {
  if (pendingSec == null) {
    return true;
  }
  return Math.abs(currentTime - pendingSec) <= SEEK_SETTLE_SEC;
}

export function playbackReducer(
  state: PlaybackState,
  event: PlaybackEvent,
): PlaybackState {
  switch (event.type) {
    case 'LOADED': {
      // A second onLoad for the same source must not kick playback out of the lock.
      if (event.sourceId !== state.sourceId || state.phase !== Phase.Loading) {
        return state;
      }
      if (!Number.isFinite(event.durationSec) || event.durationSec < 2) {
        return {
          ...state,
          phase: Phase.Error,
          errorMessage: 'duration_unavailable',
        };
      }
      return {
        ...state,
        durationSec: event.durationSec,
        cliffSec: event.durationSec * event.cliffRatio,
        phase: Phase.Playing,
        errorMessage: null,
      };
    }

    case 'TICK': {
      if (event.sourceId !== state.sourceId || state.phase !== Phase.Playing) {
        return state;
      }
      if (pastCliff(state, event.positionSec)) {
        return {
          ...state,
          positionSec: state.cliffSec,
          phase: Phase.Cliffhanger,
        };
      }
      // The clock is whole seconds. Ignore sub-second ticks.
      if (Math.floor(event.positionSec) === Math.floor(state.positionSec)) {
        return state;
      }
      return { ...state, positionSec: event.positionSec };
    }

    case 'SEEK':
      return resolveSeek(state, event.positionSec);

    case 'START_AD': {
      if (state.phase !== Phase.Cliffhanger) {
        return state;
      }
      return {
        ...state,
        phase: Phase.Ad,
        adSession: state.adSession + 1,
      };
    }

    case 'AD_FINISHED': {
      if (state.phase !== Phase.Ad || event.session !== state.adSession) {
        return state;
      }
      const resumeSec = state.resumeSec;
      const reachedEnd =
        resumeSec != null &&
        state.durationSec > 0 &&
        resumeSec >= state.durationSec;
      return {
        ...state,
        unlocked: true,
        phase: reachedEnd ? Phase.Ended : Phase.Playing,
        positionSec: resumeSec ?? state.positionSec,
        resumeSec: null,
        errorMessage: null,
      };
    }

    case 'AD_CANCELLED':
    case 'AD_FAILED': {
      if (state.phase !== Phase.Ad || event.session !== state.adSession) {
        return state;
      }
      return {
        ...state,
        phase: Phase.Cliffhanger,
      };
    }

    case 'ENDED': {
      if (event.sourceId !== state.sourceId) {
        return state;
      }
      if (!state.unlocked) {
        return {
          ...state,
          positionSec: Number.isFinite(state.cliffSec)
            ? state.cliffSec
            : state.positionSec,
          phase: Phase.Cliffhanger,
        };
      }
      return { ...state, phase: Phase.Ended };
    }

    case 'FAILED':
      return {
        ...state,
        phase: Phase.Error,
        errorMessage: event.message,
      };

    case 'RETRY':
      return {
        ...state,
        phase: Phase.Loading,
        positionSec: 0,
        cliffSec: Number.POSITIVE_INFINITY,
        resumeSec: null,
        durationSec: 0,
        sourceId: state.sourceId + 1,
        errorMessage: null,
      };

    default:
      return state;
  }
}

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { VideoRef } from 'react-native-video';
import { AdOutcome } from '@/ads/types';
import {
  initialPlaybackState,
  playbackReducer,
  progressMatchesSeek,
  resolveSeek,
} from '@/player/playbackReducer';
import { Phase, type PlaybackState } from '@/player/types';

/** Used only when a caller does not pass the episode's cliffRatio. */
const DEFAULT_CLIFF_RATIO = 0.2;

/** Drop the seek guard if the picture never lands, so the timeline cannot freeze. */
const SEEK_GIVE_UP_MS = 1500;

type Options = {
  cliffRatio?: number;
};

export function usePlaybackController(options: Options = {}) {
  const cliffRatio = options.cliffRatio ?? DEFAULT_CLIFF_RATIO;
  const [state, dispatch] = useReducer(playbackReducer, initialPlaybackState);
  const stateRef = useRef<PlaybackState>(state);
  const videoRef = useRef<VideoRef>(null);
  const lastSeekToCliffForSession = useRef<number | null>(null);
  const pendingSeekSec = useRef<number | null>(null);
  const pendingSeekTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [userPaused, setUserPaused] = useState(false);
  const userPausedRef = useRef(userPaused);

  stateRef.current = state;
  userPausedRef.current = userPaused;

  const paused = state.phase !== Phase.Playing || userPaused;

  const clearPendingSeek = useCallback(() => {
    pendingSeekSec.current = null;
    if (pendingSeekTimer.current) {
      clearTimeout(pendingSeekTimer.current);
      pendingSeekTimer.current = null;
    }
  }, []);

  const armPendingSeek = useCallback((sec: number) => {
    pendingSeekSec.current = sec;
    if (pendingSeekTimer.current) {
      clearTimeout(pendingSeekTimer.current);
    }
    pendingSeekTimer.current = setTimeout(() => {
      pendingSeekTimer.current = null;
      pendingSeekSec.current = null;
    }, SEEK_GIVE_UP_MS);
  }, []);

  useEffect(() => clearPendingSeek, [clearPendingSeek]);

  useEffect(() => {
    const player = videoRef.current;
    if (!player) {
      return;
    }
    if (paused) {
      player.pause();
    } else {
      player.resume();
    }
  }, [paused]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', next => {
      if (next !== 'active') {
        return;
      }
      const player = videoRef.current;
      if (!player) {
        return;
      }
      const shouldPlay =
        stateRef.current.phase === Phase.Playing && !userPausedRef.current;
      if (shouldPlay) {
        player.resume();
      } else {
        player.pause();
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (state.phase !== Phase.Playing) {
      setUserPaused(false);
    }
  }, [state.phase]);

  const togglePlayback = useCallback(() => {
    if (stateRef.current.phase !== Phase.Playing) {
      return;
    }
    setUserPaused(pausedNow => !pausedNow);
  }, []);

  // Hold the frame on the cliff so the ending does not play under the lock.
  useEffect(() => {
    if (state.phase !== Phase.Cliffhanger) {
      return;
    }
    if (lastSeekToCliffForSession.current === state.adSession) {
      return;
    }
    lastSeekToCliffForSession.current = state.adSession;
    const player = videoRef.current;
    if (!player || !Number.isFinite(state.cliffSec)) {
      return;
    }
    player.seek(state.cliffSec);
  }, [state.phase, state.cliffSec, state.adSession]);

  const onLoad = useCallback(
    (data: { duration: number }) => {
      dispatch({
        type: 'LOADED',
        durationSec: data.duration,
        sourceId: stateRef.current.sourceId,
        cliffRatio,
      });
    },
    [cliffRatio, dispatch],
  );

  const onProgress = useCallback(
    (data: { currentTime: number }) => {
      if (!progressMatchesSeek(data.currentTime, pendingSeekSec.current)) {
        return;
      }
      if (pendingSeekSec.current != null) {
        clearPendingSeek();
      }
      dispatch({
        type: 'TICK',
        positionSec: data.currentTime,
        sourceId: stateRef.current.sourceId,
      });
    },
    [clearPendingSeek, dispatch],
  );

  const seekTo = useCallback(
    (requestedSec: number) => {
      const current = stateRef.current;
      const next = resolveSeek(current, requestedSec);
      if (next === current) {
        return;
      }
      armPendingSeek(next.positionSec);
      videoRef.current?.seek(next.positionSec);
      if (next.phase === Phase.Playing) {
        setUserPaused(false);
      }
      dispatch({ type: 'SEEK', positionSec: requestedSec });
    },
    [armPendingSeek, dispatch],
  );

  const onEnd = useCallback(() => {
    dispatch({
      type: 'ENDED',
      sourceId: stateRef.current.sourceId,
    });
  }, [dispatch]);

  const onError = useCallback(() => {
    dispatch({ type: 'FAILED', message: 'playback_failed' });
  }, [dispatch]);

  const retry = useCallback(() => {
    lastSeekToCliffForSession.current = null;
    clearPendingSeek();
    dispatch({ type: 'RETRY' });
  }, [clearPendingSeek, dispatch]);

  const beginAd = useCallback(() => {
    if (stateRef.current.phase !== Phase.Cliffhanger) {
      return;
    }
    dispatch({ type: 'START_AD' });
  }, [dispatch]);

  const resolveAd = useCallback(
    (outcome: AdOutcome, sessionId: number) => {
      if (outcome === AdOutcome.Rewarded) {
        const resumeSec = stateRef.current.resumeSec;
        // Seek while the ad phase still holds the player paused, then unlock.
        if (resumeSec != null) {
          armPendingSeek(resumeSec);
          videoRef.current?.seek(resumeSec);
        }
        dispatch({ type: 'AD_FINISHED', session: sessionId });
        return;
      }
      if (outcome === AdOutcome.Failed) {
        dispatch({ type: 'AD_FAILED', session: sessionId });
        return;
      }
      dispatch({ type: 'AD_CANCELLED', session: sessionId });
    },
    [armPendingSeek, dispatch],
  );

  return {
    state,
    videoRef,
    paused,
    userPaused,
    togglePlayback,
    seekTo,
    onLoad,
    onProgress,
    onEnd,
    onError,
    retry,
    beginAd,
    resolveAd,
  };
}

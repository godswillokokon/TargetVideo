import {
  initialPlaybackState,
  playbackReducer,
  progressMatchesSeek,
  SEEK_SETTLE_SEC,
} from '@/player/playbackReducer';
import { Phase } from '@/player/types';
import type { PlaybackState } from '@/player/types';

const loaded = (overrides: Partial<PlaybackState> = {}): PlaybackState =>
  playbackReducer(
    { ...initialPlaybackState, phase: Phase.Loading, sourceId: 1, ...overrides },
    { type: 'LOADED', durationSec: 100, sourceId: 1, cliffRatio: 0.75 },
  );

describe('playbackReducer', () => {
  it('starts loading with no cliff, then LOADED starts playback', () => {
    expect(initialPlaybackState.phase).toBe(Phase.Loading);
    expect(initialPlaybackState.cliffSec).toBe(Number.POSITIVE_INFINITY);

    const afterLoad = playbackReducer(initialPlaybackState, {
      type: 'LOADED',
      durationSec: 40,
      sourceId: 0,
      cliffRatio: 0.75,
    });
    expect(afterLoad.phase).toBe(Phase.Playing);
    expect(afterLoad.cliffSec).toBe(30);
  });

  it('rejects LOADED with non-usable duration', () => {
    const state = playbackReducer(
      { ...initialPlaybackState, sourceId: 1 },
      { type: 'LOADED', durationSec: 0, sourceId: 1, cliffRatio: 0.75 },
    );
    expect(state.phase).toBe(Phase.Error);
  });

  it('ignores LOADED from a stale sourceId', () => {
    const state = playbackReducer(
      { ...initialPlaybackState, sourceId: 2 },
      { type: 'LOADED', durationSec: 40, sourceId: 1, cliffRatio: 0.75 },
    );
    expect(state.phase).toBe(Phase.Loading);
    expect(state.cliffSec).toBe(Number.POSITIVE_INFINITY);
  });

  it('locks on first tick past cliff when locked', () => {
    const playing = loaded();
    const next = playbackReducer(playing, {
      type: 'TICK',
      positionSec: 76,
      sourceId: 1,
    });
    expect(next.phase).toBe(Phase.Cliffhanger);
    expect(next.positionSec).toBe(75);
    expect(next.unlocked).toBe(false);
  });

  it('ignores ticks inside the same displayed second', () => {
    const playing = playbackReducer(loaded(), {
      type: 'TICK',
      positionSec: 10.1,
      sourceId: 1,
    });
    const again = playbackReducer(playing, {
      type: 'TICK',
      positionSec: 10.8,
      sourceId: 1,
    });
    expect(again).toBe(playing);
  });

  it('does not lock when already unlocked', () => {
    const playing = loaded({ unlocked: true });
    const next = playbackReducer(playing, {
      type: 'TICK',
      positionSec: 90,
      sourceId: 1,
    });
    expect(next.phase).toBe(Phase.Playing);
    expect(next.positionSec).toBe(90);
  });

  it('locks when a seek passes the cliff and remembers the target', () => {
    const playing = loaded();
    const next = playbackReducer(playing, { type: 'SEEK', positionSec: 90 });
    expect(next.phase).toBe(Phase.Cliffhanger);
    expect(next.positionSec).toBe(75);
    expect(next.resumeSec).toBe(90);
  });

  it('caps a seek past the end and resumes there after the ad', () => {
    const playing = loaded();
    const cliff = playbackReducer(playing, { type: 'SEEK', positionSec: 250 });
    expect(cliff.positionSec).toBe(75);
    expect(cliff.resumeSec).toBe(100);

    const ad = playbackReducer(cliff, { type: 'START_AD' });
    const done = playbackReducer(ad, {
      type: 'AD_FINISHED',
      session: ad.adSession,
    });
    expect(done.unlocked).toBe(true);
    expect(done.phase).toBe(Phase.Ended);
    expect(done.positionSec).toBe(100);
    expect(done.resumeSec).toBeNull();
  });

  it('resumes a past-cliff seek after the ad', () => {
    const cliff = playbackReducer(loaded(), { type: 'SEEK', positionSec: 90 });
    const ad = playbackReducer(cliff, { type: 'START_AD' });
    const done = playbackReducer(ad, {
      type: 'AD_FINISHED',
      session: ad.adSession,
    });
    expect(done.unlocked).toBe(true);
    expect(done.phase).toBe(Phase.Playing);
    expect(done.positionSec).toBe(90);
    expect(done.resumeSec).toBeNull();
  });

  it('keeps the skip target when the ad is cancelled', () => {
    const cliff = playbackReducer(loaded(), { type: 'SEEK', positionSec: 90 });
    const ad = playbackReducer(cliff, { type: 'START_AD' });
    const cancelled = playbackReducer(ad, {
      type: 'AD_CANCELLED',
      session: ad.adSession,
    });
    expect(cancelled.phase).toBe(Phase.Cliffhanger);
    expect(cancelled.resumeSec).toBe(90);
  });

  it('allows a seek past the cliff after unlock', () => {
    const playing = loaded({ unlocked: true });
    const next = playbackReducer(playing, { type: 'SEEK', positionSec: 90 });
    expect(next.phase).toBe(Phase.Playing);
    expect(next.positionSec).toBe(90);
  });

  it('ignores late TICK during ad', () => {
    const cliff = playbackReducer(loaded(), {
      type: 'TICK',
      positionSec: 80,
      sourceId: 1,
    });
    const ad = playbackReducer(cliff, { type: 'START_AD' });
    const late = playbackReducer(ad, {
      type: 'TICK',
      positionSec: 99,
      sourceId: 1,
    });
    expect(late.phase).toBe(Phase.Ad);
    expect(late.unlocked).toBe(false);
  });

  it('unlocks only on AD_FINISHED with matching session', () => {
    const cliff = playbackReducer(loaded(), {
      type: 'TICK',
      positionSec: 80,
      sourceId: 1,
    });
    const ad = playbackReducer(cliff, { type: 'START_AD' });
    const session = ad.adSession;

    const stale = playbackReducer(ad, {
      type: 'AD_FINISHED',
      session: session - 1,
    });
    expect(stale.unlocked).toBe(false);
    expect(stale.phase).toBe(Phase.Ad);

    const done = playbackReducer(ad, {
      type: 'AD_FINISHED',
      session,
    });
    expect(done.unlocked).toBe(true);
    expect(done.phase).toBe(Phase.Playing);
    expect(done.positionSec).toBe(75);
    expect(done.resumeSec).toBeNull();
  });

  it('returns to cliffhanger on cancel or fail without unlocking', () => {
    const cliff = playbackReducer(loaded(), {
      type: 'TICK',
      positionSec: 80,
      sourceId: 1,
    });
    const ad = playbackReducer(cliff, { type: 'START_AD' });

    const cancelled = playbackReducer(ad, {
      type: 'AD_CANCELLED',
      session: ad.adSession,
    });
    expect(cancelled.phase).toBe(Phase.Cliffhanger);
    expect(cancelled.unlocked).toBe(false);

    const ad2 = playbackReducer(cancelled, { type: 'START_AD' });
    const failed = playbackReducer(ad2, {
      type: 'AD_FAILED',
      session: ad2.adSession,
    });
    expect(failed.phase).toBe(Phase.Cliffhanger);
    expect(failed.unlocked).toBe(false);
  });

  it('treats ENDED while locked as cliffhanger', () => {
    const playing = loaded();
    const next = playbackReducer(playing, { type: 'ENDED', sourceId: 1 });
    expect(next.phase).toBe(Phase.Cliffhanger);
    expect(next.unlocked).toBe(false);
  });

  it('ignores a second LOADED after playback has started', () => {
    const playing = loaded();
    const again = playbackReducer(playing, {
      type: 'LOADED',
      durationSec: 40,
      sourceId: 1,
      cliffRatio: 0.5,
    });
    expect(again).toBe(playing);
  });

  it('ignores LOADED while the cliff lock is up', () => {
    const cliff = playbackReducer(loaded(), {
      type: 'TICK',
      positionSec: 80,
      sourceId: 1,
    });
    const again = playbackReducer(cliff, {
      type: 'LOADED',
      durationSec: 100,
      sourceId: 1,
      cliffRatio: 0.75,
    });
    expect(again).toBe(cliff);
  });

  it('accepts progress only once a pending seek has landed', () => {
    expect(progressMatchesSeek(10, null)).toBe(true);
    expect(progressMatchesSeek(90, 90)).toBe(true);
    expect(progressMatchesSeek(90.2, 90)).toBe(true);
    expect(progressMatchesSeek(18, 19.2)).toBe(false);
    expect(progressMatchesSeek(10, 80)).toBe(false);
    expect(SEEK_SETTLE_SEC).toBeLessThan(1);
  });

  it('RETRY bumps sourceId and returns to loading', () => {
    const errored = playbackReducer(loaded(), {
      type: 'FAILED',
      message: 'boom',
    });
    const retried = playbackReducer(errored, { type: 'RETRY' });
    expect(retried.phase).toBe(Phase.Loading);
    expect(retried.sourceId).toBe(errored.sourceId + 1);
    expect(retried.cliffSec).toBe(Number.POSITIVE_INFINITY);
  });
});

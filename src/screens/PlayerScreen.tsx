import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Video from 'react-native-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusOnMount } from '@/a11y/useFocusOnMount';
import { FakeRewardedAd } from '@/ads/FakeRewardedAd';
import { AdOutcome } from '@/ads/types';
import { CliffhangerLock } from '@/components/CliffhangerLock';
import { PlayerControls } from '@/components/PlayerControls';
import { PrimaryButton } from '@/components/PrimaryButton';
import {
  copy,
  fill,
  formatPlaybackKicker,
  playbackErrorText,
  resolvePlayback,
} from '@/data/catalog';
import type { RootStackParamList } from '@/navigation/types';
import { Phase } from '@/player/types';
import { usePlaybackController } from '@/player/usePlaybackController';
import { colors, radii, spacing, typography } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Player'>;

const CONTROLS_IDLE_MS = 20_000;

function fitVideo(
  screenWidth: number,
  screenHeight: number,
  videoWidth: number,
  videoHeight: number,
) {
  const videoAspect = videoWidth / videoHeight;
  const screenAspect = screenWidth / screenHeight;
  if (videoAspect >= screenAspect) {
    const width = screenWidth;
    return { width, height: width / videoAspect };
  }
  const height = screenHeight;
  return { width: height * videoAspect, height };
}

export function PlayerScreen({ navigation, route }: Props) {
  const { movie, episode } = resolvePlayback(
    route.params.movieId,
    route.params.seasonNumber,
    route.params.episodeNumber,
  );
  const videoSource = episode.videoSource;
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const [adNotice, setAdNotice] = useState<string | null>(null);
  const [volume, setVolume] = useState(1);
  const volumeRef = useRef(1);
  const volumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryRef = useRef<React.ComponentRef<typeof Pressable>>(null);
  const [videoSize, setVideoSize] = useState({ width: 16, height: 9 });
  const fitted = useMemo(
    () => fitVideo(window.width, window.height, videoSize.width, videoSize.height),
    [window.width, window.height, videoSize.width, videoSize.height],
  );

  const {
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
  } = usePlaybackController({
    cliffRatio: episode.cliffRatio ?? undefined,
  });

  const showTransport =
    videoSource != null &&
    (state.phase === Phase.Playing || state.phase === Phase.Ended);
  const playing = showTransport && state.phase === Phase.Playing && !userPaused;
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const [transportVisible, setTransportVisible] = useState(true);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasPlaying = useRef(playing);

  const clearIdle = useCallback(() => {
    if (idleTimer.current) {
      clearTimeout(idleTimer.current);
      idleTimer.current = null;
    }
  }, []);

  const armIdle = useCallback(() => {
    clearIdle();
    if (!playingRef.current) {
      return;
    }
    idleTimer.current = setTimeout(() => {
      idleTimer.current = null;
      setTransportVisible(false);
    }, CONTROLS_IDLE_MS);
  }, [clearIdle]);

  useEffect(() => {
    const becamePaused = wasPlaying.current && !playing;
    wasPlaying.current = playing;
    if (!showTransport || !playing) {
      clearIdle();
      if (!showTransport || becamePaused) {
        setTransportVisible(true);
      }
      return;
    }
    if (!transportVisible) {
      clearIdle();
      return;
    }
    armIdle();
    return clearIdle;
  }, [showTransport, playing, transportVisible, armIdle, clearIdle]);

  const onVideoPress = () => {
    setTransportVisible(visible => !visible);
  };

  const onControlActivity = () => {
    setTransportVisible(true);
    armIdle();
  };

  useFocusOnMount(
    retryRef,
    videoSource != null && state.phase === Phase.Error,
  );

  useEffect(() => {
    return () => {
      if (volumeTimer.current) {
        clearTimeout(volumeTimer.current);
      }
    };
  }, []);

  const publishVolume = (next: number, immediate: boolean) => {
    const clamped = Math.min(1, Math.max(0, next));
    volumeRef.current = clamped;
    if (!immediate) {
      if (volumeTimer.current != null) {
        return;
      }
      volumeTimer.current = setTimeout(() => {
        volumeTimer.current = null;
        setVolume(volumeRef.current);
      }, 50);
      return;
    }
    if (volumeTimer.current) {
      clearTimeout(volumeTimer.current);
      volumeTimer.current = null;
    }
    setVolume(clamped);
  };

  const onAdOutcome = (outcome: AdOutcome, sessionId: number) => {
    if (outcome === AdOutcome.Failed) {
      setAdNotice(copy.cliffhanger.adFailedNotice);
    } else {
      setAdNotice(null);
    }
    resolveAd(outcome, sessionId);
  };

  const onWatchAd = () => {
    setAdNotice(null);
    beginAd();
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <View style={styles.stage} pointerEvents="none">
        {videoSource != null ? (
          <Video
            key={state.sourceId}
            ref={videoRef}
            // Bundled asset: runtime accepts require(); typings expect ReactVideoSource.
            source={videoSource as never}
            style={fitted}
            resizeMode="contain"
            paused={paused}
            volume={volume}
            muted={volume === 0}
            ignoreSilentSwitch="ignore"
            playInBackground={false}
            playWhenInactive={false}
            progressUpdateInterval={250}
            onLoad={data => {
              const width = data.naturalSize?.width ?? 0;
              const height = data.naturalSize?.height ?? 0;
              if (width > 0 && height > 0) {
                setVideoSize({ width, height });
              }
              onLoad(data);
            }}
            onProgress={onProgress}
            onEnd={onEnd}
            onError={onError}
          />
        ) : null}
      </View>

      <View
        pointerEvents="box-none"
        style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.player.backAccessibilityLabel}
          hitSlop={12}
          onPress={() => navigation.goBack()}
          style={styles.backHit}>
          <Text style={styles.backLabel}>{copy.player.backLabel}</Text>
        </Pressable>
      </View>

      {showTransport ? (
        <View
          pointerEvents="box-none"
          style={[
            styles.controls,
            { paddingTop: insets.top, paddingBottom: insets.bottom },
          ]}>
          <PlayerControls
            title={movie.title}
            episodeLabel={formatPlaybackKicker(movie, episode)}
            positionSec={state.positionSec}
            durationSec={state.durationSec}
            paused={userPaused || state.phase === Phase.Ended}
            volume={volume}
            onTogglePlay={() => {
              if (state.phase === Phase.Ended) {
                seekTo(0);
                return;
              }
              togglePlayback();
            }}
            onSeek={seekTo}
            onVolume={(next, commit) => publishVolume(next, commit === true)}
            transportVisible={transportVisible}
            onVideoPress={onVideoPress}
            onActivity={onControlActivity}
          />
        </View>
      ) : null}

      {videoSource == null ? (
        <View
          style={[
            styles.banner,
            { paddingBottom: insets.bottom + spacing.lg },
          ]}>
          <Text style={styles.bannerTitle}>{copy.player.unavailableTitle}</Text>
          <Text style={styles.bannerBody}>
            {fill(copy.player.unavailableBody, {
              episode: episode.label,
              title: movie.title,
            })}
          </Text>
          <PrimaryButton
            label={copy.player.backLabel}
            onPress={() => navigation.goBack()}
            style={styles.bannerBtn}
          />
        </View>
      ) : null}

      {videoSource != null && state.phase === Phase.Loading ? (
        <View
          style={styles.centerOverlay}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={copy.player.loadingLabel}>
          <ActivityIndicator
            color={colors.primary}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </View>
      ) : null}

      {videoSource != null && state.phase === Phase.Error ? (
        <View
          accessibilityLiveRegion="assertive"
          style={[
            styles.banner,
            { paddingBottom: insets.bottom + spacing.lg },
          ]}>
          <Text style={styles.bannerTitle}>
            {copy.player.playbackErrorTitle}
          </Text>
          <Text style={styles.bannerBody}>
            {playbackErrorText(state.errorMessage)}
          </Text>
          <PrimaryButton
            ref={retryRef}
            label={copy.player.retryLabel}
            onPress={retry}
            style={styles.bannerBtn}
          />
        </View>
      ) : null}

      {videoSource != null && state.phase === Phase.Cliffhanger ? (
        <CliffhangerLock
          bottomInset={insets.bottom}
          onWatchAd={onWatchAd}
          onMaybeLater={() => navigation.goBack()}
          notice={adNotice}
        />
      ) : null}

      {videoSource != null && state.phase === Phase.Ad ? (
        <>
          <FakeRewardedAd
            key={state.adSession}
            sessionId={state.adSession}
            onOutcome={onAdOutcome}
          />
          {__DEV__ ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.player.simulateNoFillLabel}
              onPress={() => onAdOutcome(AdOutcome.Failed, state.adSession)}
              style={[styles.devFail, { bottom: insets.bottom + spacing.md }]}>
              <Text style={styles.devFailLabel}>
                {copy.player.simulateNoFillLabel}
              </Text>
            </Pressable>
          ) : null}
        </>
      ) : null}

    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.black,
  },
  stage: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.black,
  },
  controls: {
    ...StyleSheet.absoluteFill,
    zIndex: 3,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    paddingLeft: spacing.lg,
    paddingBottom: spacing.sm,
    zIndex: 4,
  },
  backHit: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
  },
  backLabel: {
    ...typography.label,
    color: colors.primary,
  },
  centerOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  banner: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: 0,
    backgroundColor: colors.overlay,
    borderRadius: radii.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 3,
  },
  bannerTitle: {
    ...typography.headline,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  bannerBody: {
    ...typography.body,
    color: colors.textMuted,
  },
  bannerBtn: {
    marginTop: spacing.lg,
    alignSelf: 'stretch',
  },
  devFail: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 11,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  devFailLabel: {
    ...typography.caption,
    color: colors.danger,
  },
});

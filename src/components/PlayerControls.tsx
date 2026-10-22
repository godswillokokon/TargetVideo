import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { copy, fill } from '@/data/catalog';
import { colors, radii, spacing, typography } from '@/theme';

type Props = {
  title: string;
  episodeLabel: string;
  positionSec: number;
  durationSec: number;
  paused: boolean;
  volume: number;
  onTogglePlay: () => void;
  onSeek: (positionSec: number) => void;
  onVolume: (volume: number, commit?: boolean) => void;
  transportVisible: boolean;
  onVideoPress: () => void;
  onActivity: () => void;
};

function formatClock(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) {
    return '0:00';
  }
  const total = Math.floor(sec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function PlayerControls({
  title,
  episodeLabel,
  positionSec,
  durationSec,
  paused,
  volume,
  onTogglePlay,
  onSeek,
  onVolume,
  transportVisible,
  onVideoPress,
  onActivity,
}: Props) {
  const [scrubSec, setScrubSec] = useState<number | null>(null);
  const audibleRef = useRef(volume || 1);

  useEffect(() => {
    if (volume > 0) {
      audibleRef.current = volume;
    }
  }, [volume]);
  const shownSec = scrubSec ?? positionSec;
  const remaining = Math.max(0, durationSec - shownSec);
  const progress = durationSec > 0 ? Math.min(1, shownSec / durationSec) : 0;

  const skip = (delta: number) => {
    onActivity();
    const base = scrubSec ?? positionSec;
    onSeek(Math.max(0, base + delta));
    setScrubSec(null);
  };
  const skipSeconds = copy.player.skipSeconds;
  const skipBackLabel = fill(copy.player.skipBackAccessibility, {
    seconds: skipSeconds,
  });
  const skipForwardLabel = fill(copy.player.skipForwardAccessibility, {
    seconds: skipSeconds,
  });

  return (
    <View style={styles.root} pointerEvents="box-none">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          transportVisible
            ? copy.player.hideControlsAccessibility
            : copy.player.showControlsAccessibility
        }
        onPress={onVideoPress}
        style={styles.videoTap}
      />
      <View style={styles.volumeRow} pointerEvents="box-none">
        <View style={styles.volumePill}>
          <Track
            value={volume}
            accessibilityLabel={copy.player.volumeLabel}
            onChange={ratio => {
              onActivity();
              onVolume(ratio);
            }}
            onCommit={ratio => {
              onActivity();
              onVolume(ratio, true);
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              volume === 0 ? copy.player.unmuteLabel : copy.player.muteLabel
            }
            hitSlop={8}
            onPress={() => {
              onActivity();
              onVolume(volume === 0 ? audibleRef.current || 1 : 0, true);
            }}
            style={styles.speakerHit}>
            <Text style={styles.speaker}>
              {volume === 0 ? copy.player.mutedGlyph : copy.player.audibleGlyph}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.transport} pointerEvents="box-none">
        {transportVisible ? (
          <>
            <RoundButton
              label={String(skipSeconds)}
              glyph={copy.player.skipBackGlyph}
              accessibilityLabel={skipBackLabel}
              onPress={() => skip(-skipSeconds)}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                paused ? copy.player.playLabel : copy.player.pauseLabel
              }
              onPress={() => {
                onActivity();
                onTogglePlay();
              }}
              style={styles.play}>
              <Text style={styles.playGlyph}>
                {paused ? copy.player.playGlyph : copy.player.pauseGlyph}
              </Text>
            </Pressable>
            <RoundButton
              label={String(skipSeconds)}
              glyph={copy.player.skipForwardGlyph}
              accessibilityLabel={skipForwardLabel}
              onPress={() => skip(skipSeconds)}
            />
          </>
        ) : null}
      </View>

      <View style={styles.bottom}>
        <Text style={styles.kicker}>{episodeLabel}</Text>
        <Text style={styles.title}>{title}</Text>

        <View style={styles.timeline}>
          <Text style={styles.time}>{formatClock(shownSec)}</Text>
          <Track
            value={progress}
            accessibilityLabel={copy.player.positionLabel}
            onChange={ratio => {
              if (durationSec <= 0) {
                return;
              }
              onActivity();
              setScrubSec(ratio * durationSec);
            }}
            onCommit={ratio => {
              if (durationSec <= 0) {
                return;
              }
              onActivity();
              onSeek(ratio * durationSec);
              setScrubSec(null);
            }}
          />
          <Text style={styles.time}>-{formatClock(remaining)}</Text>
        </View>
      </View>
    </View>
  );
}

function RoundButton({
  label,
  glyph,
  accessibilityLabel,
  onPress,
}: {
  label: string;
  glyph: string;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={styles.round}>
      <Text style={styles.roundGlyph}>{glyph}</Text>
      <Text style={styles.roundLabel}>{label}</Text>
    </Pressable>
  );
}

const SLIDER_STEP = 0.1;

function Track({
  value,
  accessibilityLabel,
  onChange,
  onCommit,
}: {
  value: number;
  accessibilityLabel: string;
  onChange: (ratio: number) => void;
  onCommit?: (ratio: number) => void;
}) {
  const widthRef = useRef(1);
  const dragRef = useRef<number | null>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const shown = drag ?? value;

  const ratioFromLocation = (locationX: number) =>
    Math.min(1, Math.max(0, locationX / Math.max(1, widthRef.current)));

  const apply = (ratio: number) => {
    if (onCommit) {
      onCommit(ratio);
      return;
    }
    onChange(ratio);
  };

  const moveTo = (locationX: number) => {
    const ratio = ratioFromLocation(locationX);
    dragRef.current = ratio;
    setDrag(ratio);
    onChange(ratio);
  };

  const releaseAt = (locationX: number) => {
    const ratio = ratioFromLocation(locationX);
    dragRef.current = null;
    setDrag(null);
    onChange(ratio);
    onCommit?.(ratio);
  };

  const stepBy = (direction: 1 | -1) => {
    apply(Math.min(1, Math.max(0, shown + direction * SLIDER_STEP)));
  };

  return (
    <View
      collapsable={false}
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(shown * 100) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={event => {
        if (event.nativeEvent.actionName === 'increment') {
          stepBy(1);
          return;
        }
        if (event.nativeEvent.actionName === 'decrement') {
          stepBy(-1);
        }
      }}
      onLayout={event => {
        const width = event.nativeEvent.layout.width;
        if (width > 0) {
          widthRef.current = width;
        }
      }}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => false}
      onResponderTerminationRequest={() => false}
      onResponderGrant={event => moveTo(event.nativeEvent.locationX)}
      onResponderMove={event => moveTo(event.nativeEvent.locationX)}
      onResponderRelease={event => releaseAt(event.nativeEvent.locationX)}
      onResponderTerminate={() => {
        const ratio = dragRef.current;
        dragRef.current = null;
        setDrag(null);
        if (ratio != null) {
          apply(ratio);
        }
      }}
      style={styles.track}>
      <View pointerEvents="none" style={styles.trackRail} />
      <View
        pointerEvents="none"
        style={[
          styles.trackFill,
          { transform: [{ scaleX: Math.max(shown, 0.001) }] },
        ]}
      />
      <View
        pointerEvents="none"
        style={[styles.knob, { left: `${shown * 100}%` }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'space-between',
  },
  videoTap: {
    ...StyleSheet.absoluteFill,
    zIndex: 0,
  },
  volumeRow: {
    zIndex: 1,
    alignItems: 'flex-end',
    paddingTop: spacing.sm,
    paddingRight: spacing.lg,
  },
  volumePill: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 168,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(40,40,40,0.72)',
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
  },
  speakerHit: {
    marginLeft: spacing.sm,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speaker: {
    fontSize: 14,
  },
  transport: {
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  round: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(60,60,60,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundGlyph: {
    color: colors.white,
    fontSize: 16,
    lineHeight: 18,
  },
  roundLabel: {
    ...typography.caption,
    color: colors.white,
    fontSize: 11,
    marginTop: -2,
  },
  play: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(70,70,70,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playGlyph: {
    color: colors.white,
    fontSize: 22,
  },
  bottom: {
    zIndex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  kicker: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.72)',
  },
  title: {
    ...typography.headline,
    color: colors.white,
    marginTop: 2,
  },
  timeline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  time: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.85)',
    minWidth: 44,
  },
  track: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
  },
  trackRail: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    width: '100%',
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.white,
    transformOrigin: 'left center',
  },
  knob: {
    position: 'absolute',
    width: 12,
    height: 12,
    marginLeft: -6,
    top: 16,
    borderRadius: 6,
    backgroundColor: colors.white,
  },
});

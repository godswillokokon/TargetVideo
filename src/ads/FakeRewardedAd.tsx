import React, { useEffect, useRef, useState } from 'react';
import {
  AppState,
  type AppStateStatus,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusOnMount } from '@/a11y/useFocusOnMount';
import { AdOutcome } from '@/ads/types';
import { copy, fill } from '@/data/catalog';
import { colors, spacing, typography } from '@/theme';

type Props = {
  sessionId: number;
  onOutcome: (outcome: AdOutcome, sessionId: number) => void;
};


export function FakeRewardedAd({ sessionId, onOutcome }: Props) {
  const insets = useSafeAreaInsets();
  const durationMs = copy.ad.durationMs;
  const [remainingMs, setRemainingMs] = useState(durationMs);
  const settled = useRef(false);
  const deadlineRef = useRef(Date.now() + durationMs);
  const remainingRef = useRef(durationMs);
  const clockPaused = useRef(false);
  const closeRef = useRef<React.ComponentRef<typeof Pressable>>(null);
  useFocusOnMount(closeRef);

  const settle = (outcome: AdOutcome) => {
    if (settled.current) {
      return;
    }
    settled.current = true;
    onOutcome(outcome, sessionId);
  };

  useEffect(() => {
    clockPaused.current = false;
    remainingRef.current = durationMs;
    deadlineRef.current = Date.now() + durationMs;
    const tick = () => {
      if (clockPaused.current) {
        return;
      }
      const left = Math.max(0, deadlineRef.current - Date.now());
      remainingRef.current = left;
      setRemainingMs(left);
      if (left <= 0) {
        settle(AdOutcome.Rewarded);
      }
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
    // sessionId identity for this mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, durationMs]);

  useEffect(() => {
    const onAppState = (next: AppStateStatus) => {
      if (next === 'background') {
        settle(AdOutcome.Cancelled);
        return;
      }
      // Control Center is inactive, not leaving the app. Hold the countdown.
      if (next === 'inactive') {
        remainingRef.current = Math.max(0, deadlineRef.current - Date.now());
        clockPaused.current = true;
        return;
      }
      if (next === 'active') {
        clockPaused.current = false;
        deadlineRef.current = Date.now() + remainingRef.current;
        setRemainingMs(remainingRef.current);
      }
    };
    const sub = AppState.addEventListener('change', onAppState);
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const secondsLeft = Math.ceil(remainingMs / 1000);

  return (
    <View
      style={[styles.root, { paddingTop: insets.top + spacing.lg }]}
      accessibilityViewIsModal
      accessibilityLabel={copy.ad.accessibilityLabel}>
      <View style={styles.header}>
        <Text style={styles.adLabel}>{copy.ad.label}</Text>
        <Pressable
          ref={closeRef}
          accessibilityRole="button"
          accessibilityLabel={copy.ad.closeAccessibilityLabel}
          hitSlop={12}
          onPress={() => settle(AdOutcome.Cancelled)}
          style={styles.closeHit}>
          <Text style={styles.close}>{copy.ad.closeGlyph}</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        <Text style={styles.brand}>{copy.ad.brand}</Text>
        <Text style={styles.headline}>{copy.ad.headline}</Text>
        <Text style={styles.countdown} accessibilityLiveRegion="polite">
          {secondsLeft > 0
            ? fill(copy.ad.rewardIn, { seconds: secondsLeft })
            : copy.ad.unlocking}
        </Text>
        <Text style={styles.hint}>{copy.ad.hint}</Text>
      </View>

      <View style={{ height: insets.bottom + spacing.xl }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.background,
    zIndex: 10,
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  adLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  closeHit: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  close: {
    ...typography.headline,
    color: colors.textMuted,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  brand: {
    ...typography.caption,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  headline: {
    ...typography.title,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  countdown: {
    ...typography.headline,
    color: colors.lockGold,
    marginBottom: spacing.md,
  },
  hint: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
});

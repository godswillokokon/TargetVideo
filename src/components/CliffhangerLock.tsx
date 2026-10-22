import React, { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusOnMount } from '@/a11y/useFocusOnMount';
import { ButtonVariant, PrimaryButton } from '@/components/PrimaryButton';
import { copy } from '@/data/catalog';
import { colors, radii, spacing, typography } from '@/theme';

type Props = {
  bottomInset: number;
  onWatchAd: () => void;
  onMaybeLater: () => void;
  notice?: string | null;
};

export function CliffhangerLock({
  bottomInset,
  onWatchAd,
  onMaybeLater,
  notice,
}: Props) {
  const watchRef = useRef<React.ComponentRef<typeof Pressable>>(null);
  useFocusOnMount(watchRef);

  return (
    <View
      style={[styles.scrim, { paddingBottom: bottomInset + spacing.lg }]}
      accessibilityViewIsModal>
      <View style={styles.card}>
        <Text style={styles.lockIcon} accessibilityLabel={copy.cliffhanger.lockedLabel}>
          {copy.cliffhanger.lockGlyph}
        </Text>
        <Text
          style={styles.title}
          accessibilityRole="header"
          accessibilityLiveRegion="polite">
          {copy.cliffhanger.title}
        </Text>
        <Text style={styles.body}>{copy.cliffhanger.body}</Text>

        {notice ? (
          <Text style={styles.notice} accessibilityLiveRegion="polite">
            {notice}
          </Text>
        ) : null}

        <PrimaryButton
          ref={watchRef}
          label={copy.cliffhanger.watchAdLabel}
          onPress={onWatchAd}
          accessibilityLabel={copy.cliffhanger.watchAdAccessibility}
          style={styles.primary}
        />

        <PrimaryButton
          label={copy.cliffhanger.laterLabel}
          variant={ButtonVariant.Ghost}
          onPress={onMaybeLater}
          accessibilityLabel={copy.cliffhanger.laterLabel}
          style={styles.later}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    zIndex: 4,
  },
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lockIcon: {
    fontSize: 28,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.headline,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  body: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  notice: {
    ...typography.caption,
    color: colors.lockGold,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  primary: {
    alignSelf: 'stretch',
    marginBottom: spacing.sm,
  },
  later: {
    alignSelf: 'stretch',
    marginTop: spacing.sm,
  },
});

import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { copy, fill } from '@/data/catalog';
import { colors, radii, spacing, typography } from '@/theme';

type Props = {
  title: string;
  poster: ImageSourcePropType;
  badge?: 'NEW' | 'PRO';
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  width?: number;
};

export function PosterCard({
  title,
  poster,
  badge,
  onPress,
  style,
  width = 120,
}: Props) {
  const height = Math.round(width * 1.5);

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'image'}
      accessibilityLabel={
        badge ? fill(copy.home.posterWithBadge, { title, badge }) : title
      }
      accessibilityHint={onPress ? copy.home.posterHint : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.wrap,
        { width },
        pressed && onPress && styles.pressed,
        style,
      ]}>
      <View style={[styles.imageWrap, { width, height }]}>
        <Image source={poster} style={styles.image} resizeMode="cover" />
        {badge ? (
          <View style={styles.badge} accessibilityElementsHidden>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.title} numberOfLines={2} importantForAccessibility="no">
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginRight: spacing.md,
  },
  pressed: {
    opacity: 0.85,
  },
  imageWrap: {
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  badgeText: {
    ...typography.caption,
    fontSize: 10,
    color: colors.black,
    fontWeight: '700',
  },
  title: {
    ...typography.caption,
    color: colors.text,
    marginTop: spacing.sm,
  },
});

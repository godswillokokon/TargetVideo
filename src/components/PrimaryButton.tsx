import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, radii, spacing, typography } from '@/theme';

export enum ButtonVariant {
  Primary = 'primary',
  Ghost = 'ghost',
}

type Props = Omit<PressableProps, 'style'> & {
  label: string;
  variant?: ButtonVariant;
  style?: StyleProp<ViewStyle>;
};

export const PrimaryButton = React.forwardRef<
  React.ComponentRef<typeof Pressable>,
  Props
>(function PrimaryButtonWithRef(
  {
    label,
    variant = ButtonVariant.Primary,
    disabled,
    style,
    accessibilityState,
    ...rest
  },
  ref,
) {
  const isDisabled = !!disabled;
  const isGhost = variant === ButtonVariant.Ghost;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{
        disabled: isDisabled,
        ...accessibilityState,
      }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        isGhost ? styles.ghost : styles.primary,
        pressed && !isDisabled && (isGhost ? styles.ghostPressed : styles.primaryPressed),
        isDisabled && styles.disabled,
        style,
      ]}
      {...rest}
      ref={ref}>
      <Text style={[styles.label, isGhost && styles.ghostLabel]}>{label}</Text>
    </Pressable>
  );
});

PrimaryButton.displayName = 'PrimaryButton';

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.primary,
  },
  primaryPressed: {
    backgroundColor: colors.primaryPressed,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  ghostPressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    ...typography.label,
    color: colors.black,
  },
  ghostLabel: {
    color: colors.textMuted,
  },
});

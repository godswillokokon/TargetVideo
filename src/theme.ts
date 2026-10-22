export const colors = {
  background: '#0B0D10',
  surface: '#14181F',
  surfaceElevated: '#1C222C',
  border: '#2A3340',
  text: '#F4F6F8',
  textMuted: '#9AA3B2',
  primary: '#2EE6D6',
  primaryPressed: '#24C4B6',
  danger: '#FF5C7A',
  lockGold: '#E8C872',
  overlay: 'rgba(0, 0, 0, 0.72)',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export const spacing = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const typography = {
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: 0.2,
  },
  headline: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
  },
  caption: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
} as const;

export const colors = {
  bg: '#eef6f9',
  blobTop: '#b6f5e8',
  blobBottom: '#ffd8b3',

  primary: '#0b8f83',
  primaryText: '#ffffff',

  textDark: '#10222e',
  textBody: '#54707e',
  textLabel: '#2a4a59',
  textValue: '#133141',

  accent: '#0d6f69',
  accentBg: 'rgba(250, 255, 255, 0.88)',
  accentBorder: 'rgba(17, 184, 169, 0.2)',

  resultBg: '#f8fcff',
  resultBorder: 'rgba(16, 49, 66, 0.12)',

  inputBorder: 'rgba(17, 45, 61, 0.15)',
  inputBg: '#ffffff',

  white: '#ffffff',
  secondaryBorder: 'rgba(16, 49, 66, 0.16)',
  secondaryText: '#264857',

  // Severity
  low: '#17643f',
  lowBg: 'rgba(232, 250, 241, 0.9)',
  lowBorder: 'rgba(25, 125, 77, 0.35)',

  medium: '#8f5a00',
  mediumBg: 'rgba(255, 243, 215, 0.9)',
  mediumBorder: 'rgba(181, 109, 0, 0.35)',

  high: '#b53b2f',
  highBg: 'rgba(255, 236, 233, 0.85)',
  highBorder: 'rgba(181, 59, 47, 0.35)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

export const commonStyles = {
  primaryButton: {
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    paddingVertical: 13,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  primaryButtonText: {
    color: colors.primaryText,
    fontSize: 14,
    fontWeight: '800' as const,
  },
  secondaryButton: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.secondaryBorder,
    backgroundColor: colors.white,
    paddingVertical: 13,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexDirection: 'row' as const,
    gap: spacing.sm,
  },
  secondaryButtonText: {
    color: colors.secondaryText,
    fontSize: 14,
    fontWeight: '800' as const,
  },
  sectionTitle: {
    fontSize: 24,
    lineHeight: 27,
    fontWeight: '800' as const,
    color: colors.textDark,
    letterSpacing: -0.3,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textBody,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: colors.textLabel,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    backgroundColor: colors.inputBg,
    fontSize: 15,
    color: colors.textValue,
  },
  scrollContent: {
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
} as const;

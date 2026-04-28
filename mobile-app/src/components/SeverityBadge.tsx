import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii } from '../styles/theme';
import type { Severity } from '../types';

interface Props {
  level: Severity;
  label?: string;
}

const CONFIG: Record<Severity, { bg: string; border: string; text: string }> = {
  LOW: { bg: colors.lowBg, border: colors.lowBorder, text: colors.low },
  MEDIUM: { bg: colors.mediumBg, border: colors.mediumBorder, text: colors.medium },
  HIGH: { bg: colors.highBg, border: colors.highBorder, text: colors.high },
};

export function SeverityBadge({ level, label }: Props) {
  const cfg = CONFIG[level] ?? CONFIG.LOW;
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <Text style={[styles.text, { color: cfg.text }]}>{label ?? level}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radii.full,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

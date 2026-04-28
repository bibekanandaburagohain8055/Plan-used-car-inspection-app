import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../styles/theme';

interface Props {
  message: string;
  onDismiss: () => void;
}

export function ErrorCard({ message, onDismiss }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.text} numberOfLines={4}>{message}</Text>
      <Pressable onPress={onDismiss} hitSlop={8} style={styles.dismiss}>
        <Text style={styles.dismissText}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.highBorder,
    backgroundColor: colors.highBg,
    padding: spacing.md,
  },
  text: {
    flex: 1,
    color: colors.high,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  dismiss: {
    paddingTop: 1,
  },
  dismissText: {
    color: colors.high,
    fontSize: 14,
    fontWeight: '700',
  },
});

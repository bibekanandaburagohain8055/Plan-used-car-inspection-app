import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useInspection } from '../context/InspectionContext';
import { colors, commonStyles, radii, spacing } from '../styles/theme';
import { API_BASE_URL } from '../constants/config';

const TAGS = ['Vehicle API', 'Camera Capture', 'Engine Audio', 'AI Final Report'];

export function IntroScreen() {
  const { goToStep } = useInspection();

  return (
    <View style={styles.container}>
      <Text style={styles.headline}>Used Car{'\n'}AI Inspector</Text>
      <Text style={commonStyles.bodyText}>
        India vehicle lookup, real camera inspection, engine audio recording, and OpenAI-generated
        buying report — all in one flow.
      </Text>

      <View style={styles.tagRow}>
        {TAGS.map((tag) => (
          <View key={tag} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>

      <View style={styles.endpointCard}>
        <Text style={styles.endpointLabel}>Backend endpoint</Text>
        <Text style={styles.endpointUrl}>{API_BASE_URL}</Text>
        <Text style={styles.endpointHint}>Set EXPO_PUBLIC_API_BASE_URL for device testing.</Text>
      </View>

      <View style={styles.spacer} />

      <Pressable style={commonStyles.primaryButton} onPress={() => goToStep('details')}>
        <Text style={commonStyles.primaryButtonText}>Start Inspection</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.md,
  },
  headline: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '800',
    color: colors.textDark,
    letterSpacing: -0.6,
    marginTop: spacing.sm,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tag: {
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    backgroundColor: colors.accentBg,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  tagText: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 12,
  },
  endpointCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.resultBorder,
    backgroundColor: colors.white,
    padding: spacing.md,
    gap: 4,
  },
  endpointLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textLabel,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  endpointUrl: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textDark,
  },
  endpointHint: {
    fontSize: 12,
    color: colors.textBody,
  },
  spacer: { flex: 1 },
});

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useInspection } from '../context/InspectionContext';
import { STRUCTURAL_CHECKPOINTS } from '../data/checkpoints';
import { colors, commonStyles, radii, spacing } from '../styles/theme';

export function StructuralScreen() {
  const { structuralState, structuralSummary, toggleStructural, goToStep } = useInspection();

  return (
    <ScrollView contentContainerStyle={commonStyles.scrollContent} showsVerticalScrollIndicator={false}>
      <Text style={commonStyles.sectionTitle}>Structural Check</Text>
      <Text style={commonStyles.bodyText}>
        Mark each point reviewed and flag suspicious accident indicators.
      </Text>

      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNum}>{structuralSummary.reviewed}</Text>
          <Text style={styles.summaryLabel}>Reviewed</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNum, structuralSummary.flagged > 0 && styles.summaryNumFlagged]}>
            {structuralSummary.flagged}
          </Text>
          <Text style={styles.summaryLabel}>Flagged</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNum}>{STRUCTURAL_CHECKPOINTS.length}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
      </View>

      {STRUCTURAL_CHECKPOINTS.map((item) => {
        const state = structuralState[item.id];
        return (
          <View
            key={item.id}
            style={[
              styles.card,
              state?.reviewed && styles.cardReviewed,
              state?.flagged && styles.cardFlagged,
            ]}
          >
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardBody}>{item.description}</Text>
            <View style={styles.actions}>
              <Pressable
                style={[styles.btn, styles.btnReview, state?.reviewed && styles.btnReviewActive]}
                onPress={() => toggleStructural(item.id, 'reviewed')}
              >
                <Text style={styles.btnReviewText}>
                  {state?.reviewed ? '✓ Reviewed' : 'Mark Reviewed'}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.btn, styles.btnFlag, state?.flagged && styles.btnFlagActive]}
                onPress={() => toggleStructural(item.id, 'flagged')}
              >
                <Text style={styles.btnFlagText}>
                  {state?.flagged ? '⚠ Flagged' : 'Flag Issue'}
                </Text>
              </Pressable>
            </View>
          </View>
        );
      })}

      <Pressable style={commonStyles.primaryButton} onPress={() => goToStep('noise')}>
        <Text style={commonStyles.primaryButtonText}>Continue to Engine Audio</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  summary: {
    flexDirection: 'row',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.resultBorder,
    backgroundColor: colors.resultBg,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  summaryItem: { alignItems: 'center', gap: 2 },
  summaryNum: { fontSize: 22, fontWeight: '800', color: colors.textDark },
  summaryNumFlagged: { color: colors.high },
  summaryLabel: { fontSize: 11, color: colors.textBody, fontWeight: '600' },
  divider: { width: 1, height: 30, backgroundColor: colors.resultBorder },
  card: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(16, 46, 63, 0.12)',
    backgroundColor: colors.white,
    padding: 11,
    gap: spacing.sm,
  },
  cardReviewed: {
    borderColor: colors.lowBorder,
    backgroundColor: colors.lowBg,
  },
  cardFlagged: {
    borderColor: colors.highBorder,
    backgroundColor: colors.highBg,
  },
  cardTitle: { color: '#173546', fontWeight: '800', fontSize: 14 },
  cardBody: { color: '#4d6876', fontSize: 12, lineHeight: 17 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  btn: {
    flex: 1,
    borderRadius: radii.sm,
    borderWidth: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnReview: { borderColor: 'rgba(17, 132, 123, 0.3)', backgroundColor: '#f4fffc' },
  btnReviewActive: {
    backgroundColor: 'rgba(22, 153, 110, 0.16)',
    borderColor: 'rgba(22, 153, 110, 0.4)',
  },
  btnFlag: { borderColor: 'rgba(171, 63, 53, 0.25)', backgroundColor: '#fff9f8' },
  btnFlagActive: {
    backgroundColor: 'rgba(192, 69, 56, 0.16)',
    borderColor: 'rgba(192, 69, 56, 0.4)',
  },
  btnReviewText: { color: '#0d6962', fontSize: 12, fontWeight: '700' },
  btnFlagText: { color: '#a53d2e', fontSize: 12, fontWeight: '700' },
});

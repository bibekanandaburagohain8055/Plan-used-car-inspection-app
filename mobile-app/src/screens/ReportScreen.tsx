import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ErrorCard } from '../components/ErrorCard';
import { ReportCard } from '../components/ReportCard';
import { useInspection } from '../context/InspectionContext';
import { PHOTO_CHECKPOINTS, STRUCTURAL_CHECKPOINTS } from '../data/checkpoints';
import { colors, commonStyles, radii, spacing } from '../styles/theme';

interface SignalRowProps {
  label: string;
  value: string;
  ok?: boolean;
}

function SignalRow({ label, value, ok }: SignalRowProps) {
  return (
    <View style={styles.signalRow}>
      <Text style={styles.signalLabel}>{label}</Text>
      <Text style={[styles.signalValue, ok === true && styles.signalGood, ok === false && styles.signalMissing]}>
        {value}
      </Text>
    </View>
  );
}

export function ReportScreen() {
  const {
    vehicleData,
    capturedPhotoCount,
    photoAnalysis,
    structuralSummary,
    audioAnalysis,
    fallbackScore,
    reportLoading,
    finalReport,
    reportError,
    doGenerateReport,
    clearReportError,
    restartInspection,
  } = useInspection();

  return (
    <ScrollView contentContainerStyle={commonStyles.scrollContent} showsVerticalScrollIndicator={false}>
      <Text style={commonStyles.sectionTitle}>Final Report</Text>
      <Text style={commonStyles.bodyText}>
        Generate a structured buying decision from all captured signals.
      </Text>

      {/* Signal summary */}
      <View style={styles.signalCard}>
        <Text style={styles.signalTitle}>Signal Summary</Text>
        <SignalRow
          label="Vehicle API"
          value={vehicleData ? `${vehicleData._mode === 'live' ? 'Live' : 'Mock'} · ${vehicleData.makerModel || 'fetched'}` : 'Not fetched'}
          ok={Boolean(vehicleData)}
        />
        <SignalRow
          label="Photos"
          value={`${capturedPhotoCount} / ${PHOTO_CHECKPOINTS.length} captured`}
          ok={capturedPhotoCount > 0}
        />
        <SignalRow
          label="Photo AI"
          value={photoAnalysis ? `Done · ${photoAnalysis.risk_level} risk` : 'Pending'}
          ok={Boolean(photoAnalysis)}
        />
        <SignalRow
          label="Structural"
          value={`${structuralSummary.reviewed}/${STRUCTURAL_CHECKPOINTS.length} reviewed · ${structuralSummary.flagged} flagged`}
          ok={structuralSummary.reviewed > 0}
        />
        <SignalRow
          label="Audio AI"
          value={audioAnalysis ? `Done · ${audioAnalysis.risk_level} risk` : 'Pending'}
          ok={Boolean(audioAnalysis)}
        />
        {!finalReport ? (
          <View style={styles.fallbackRow}>
            <Text style={styles.fallbackLabel}>Estimated score (pre-AI)</Text>
            <Text style={styles.fallbackScore}>{fallbackScore}/100</Text>
          </View>
        ) : null}
      </View>

      <Pressable
        style={[commonStyles.primaryButton, reportLoading && styles.disabled]}
        onPress={doGenerateReport}
        disabled={reportLoading}
      >
        {reportLoading ? (
          <ActivityIndicator size="small" color={colors.primaryText} style={styles.spinner} />
        ) : null}
        <Text style={commonStyles.primaryButtonText}>
          {reportLoading ? 'Generating Report…' : 'Generate Final AI Report'}
        </Text>
      </Pressable>

      {reportError ? <ErrorCard message={reportError} onDismiss={clearReportError} /> : null}
      {finalReport ? <ReportCard report={finalReport} /> : null}

      <Pressable style={commonStyles.secondaryButton} onPress={restartInspection}>
        <Text style={commonStyles.secondaryButtonText}>Start New Inspection</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  signalCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.resultBorder,
    backgroundColor: colors.resultBg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  signalTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textLabel,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  signalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  signalLabel: {
    fontSize: 12,
    color: colors.textBody,
    fontWeight: '600',
    flex: 1,
  },
  signalValue: {
    fontSize: 12,
    color: colors.textValue,
    fontWeight: '700',
    textAlign: 'right',
    flex: 1.5,
  },
  signalGood: { color: colors.low },
  signalMissing: { color: colors.medium },
  fallbackRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.resultBorder,
  },
  fallbackLabel: { fontSize: 12, color: colors.textBody, fontWeight: '600' },
  fallbackScore: { fontSize: 16, fontWeight: '800', color: colors.textDark },
  disabled: { opacity: 0.7 },
  spinner: { marginRight: spacing.xs },
});

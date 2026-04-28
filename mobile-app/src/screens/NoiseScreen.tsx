import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AudioAnalysisCard } from '../components/AudioAnalysisCard';
import { ErrorCard } from '../components/ErrorCard';
import { useInspection } from '../context/InspectionContext';
import { colors, commonStyles, radii, spacing } from '../styles/theme';

const STATUS_LABEL: Record<string, string> = {
  idle: 'Ready to record',
  recording: 'Recording engine…',
  recorded: 'Recording complete',
};

const STATUS_COLOR: Record<string, string> = {
  idle: colors.textBody,
  recording: colors.high,
  recorded: colors.low,
};

export function NoiseScreen() {
  const {
    noiseState,
    audioClip,
    audioAnalysis,
    audioTranscript,
    audioAnalyzeLoading,
    audioError,
    doStartRecording,
    doStopRecording,
    doAnalyzeAudio,
    clearAudioError,
    goToStep,
  } = useInspection();

  return (
    <ScrollView contentContainerStyle={commonStyles.scrollContent} showsVerticalScrollIndicator={false}>
      <Text style={commonStyles.sectionTitle}>Engine Noise</Text>
      <Text style={commonStyles.bodyText}>
        Record engine idle + light rev, then run AI audio analysis to detect abnormal sounds.
      </Text>

      <View style={styles.recorderCard}>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[noiseState] }]} />
          <Text style={[styles.statusText, { color: STATUS_COLOR[noiseState] }]}>
            {STATUS_LABEL[noiseState]}
          </Text>
        </View>

        {noiseState !== 'recording' ? (
          <Pressable style={commonStyles.secondaryButton} onPress={doStartRecording}>
            <Text style={commonStyles.secondaryButtonText}>
              {noiseState === 'recorded' ? 'Re-record' : 'Start Recording'}
            </Text>
          </Pressable>
        ) : (
          <Pressable style={styles.stopButton} onPress={doStopRecording}>
            <View style={styles.stopIcon} />
            <Text style={styles.stopText}>Stop Recording</Text>
          </Pressable>
        )}

        {audioClip ? (
          <Pressable
            style={[commonStyles.secondaryButton, audioAnalyzeLoading && styles.disabled]}
            onPress={doAnalyzeAudio}
            disabled={audioAnalyzeLoading}
          >
            {audioAnalyzeLoading ? <ActivityIndicator size="small" color={colors.accent} /> : null}
            <Text style={commonStyles.secondaryButtonText}>
              {audioAnalyzeLoading ? 'Analyzing…' : 'Run AI Audio Analysis'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {audioError ? <ErrorCard message={audioError} onDismiss={clearAudioError} /> : null}

      {audioAnalysis ? (
        <AudioAnalysisCard data={audioAnalysis} transcript={audioTranscript} />
      ) : null}

      <Pressable style={commonStyles.primaryButton} onPress={() => goToStep('report')}>
        <Text style={commonStyles.primaryButtonText}>Continue to Final Report</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  recorderCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.resultBorder,
    backgroundColor: colors.white,
    padding: spacing.md,
    gap: spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
  },
  stopButton: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.highBorder,
    backgroundColor: colors.highBg,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stopIcon: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: colors.high,
  },
  stopText: { color: colors.high, fontSize: 14, fontWeight: '800' },
  disabled: { opacity: 0.6 },
});

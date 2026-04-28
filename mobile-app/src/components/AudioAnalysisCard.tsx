import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../styles/theme';
import type { AudioAnalysisResult } from '../types';
import { SeverityBadge } from './SeverityBadge';

interface Props {
  data: AudioAnalysisResult;
  transcript?: string;
}

export function AudioAnalysisCard({ data, transcript }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>AI Audio Analysis</Text>
        <SeverityBadge level={data.risk_level} label={`${data.risk_level} RISK`} />
      </View>

      <Text style={styles.summary}>{data.summary}</Text>

      {transcript ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Transcript</Text>
          <Text style={styles.transcript}>{transcript}</Text>
        </View>
      ) : null}

      {data.likely_causes.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Likely Causes</Text>
          {data.likely_causes.map((cause, i) => (
            <Text key={i} style={styles.bullet}>• {cause}</Text>
          ))}
        </View>
      ) : null}

      {data.next_checks.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Next Checks</Text>
          {data.next_checks.map((check, i) => (
            <Text key={i} style={styles.bullet}>• {check}</Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.resultBorder,
    backgroundColor: colors.resultBg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    color: '#214353',
    flex: 1,
  },
  summary: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textBody,
  },
  section: {
    gap: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textLabel,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  transcript: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textBody,
    fontStyle: 'italic',
  },
  bullet: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textValue,
  },
});

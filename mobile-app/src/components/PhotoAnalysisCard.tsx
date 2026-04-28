import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../styles/theme';
import type { PhotoAnalysisResult } from '../types';
import { SeverityBadge } from './SeverityBadge';

interface Props {
  data: PhotoAnalysisResult;
}

export function PhotoAnalysisCard({ data }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>AI Photo Analysis</Text>
        <SeverityBadge level={data.risk_level} label={`${data.risk_level} RISK`} />
      </View>

      <Text style={styles.summary}>{data.summary}</Text>

      {data.findings.length > 0 ? (
        <View style={styles.findings}>
          {data.findings.map((finding, i) => (
            <View key={i} style={styles.finding}>
              <View style={styles.findingHeader}>
                <Text style={styles.findingLabel}>{finding.label}</Text>
                <SeverityBadge level={finding.severity} />
              </View>
              <Text style={styles.findingIssue}>{finding.issue}</Text>
              {finding.evidence ? (
                <Text style={styles.findingDetail}>
                  <Text style={styles.detailKey}>Evidence: </Text>
                  {finding.evidence}
                </Text>
              ) : null}
              {finding.recommendation ? (
                <Text style={styles.findingDetail}>
                  <Text style={styles.detailKey}>Action: </Text>
                  {finding.recommendation}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.empty}>No specific findings flagged.</Text>
      )}
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
  findings: {
    gap: spacing.sm,
  },
  finding: {
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.resultBorder,
    backgroundColor: colors.white,
    padding: spacing.sm,
    gap: 4,
  },
  findingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  findingLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#214353',
    flex: 1,
  },
  findingIssue: {
    fontSize: 12,
    color: colors.textValue,
    lineHeight: 17,
  },
  findingDetail: {
    fontSize: 11,
    color: colors.textBody,
    lineHeight: 16,
  },
  detailKey: {
    fontWeight: '700',
    color: colors.textLabel,
  },
  empty: {
    fontSize: 12,
    color: colors.textBody,
    fontStyle: 'italic',
  },
});

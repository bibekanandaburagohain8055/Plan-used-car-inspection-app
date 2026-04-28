import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../styles/theme';
import type { Decision, FinalReport, Severity } from '../types';
import { SeverityBadge } from './SeverityBadge';

interface Props {
  report: FinalReport;
}

const DECISION_CONFIG: Record<Decision, { bg: string; border: string; text: string; label: string }> = {
  BUY: { bg: colors.lowBg, border: colors.lowBorder, text: colors.low, label: 'BUY' },
  NEGOTIATE: { bg: colors.mediumBg, border: colors.mediumBorder, text: colors.medium, label: 'NEGOTIATE' },
  AVOID: { bg: colors.highBg, border: colors.highBorder, text: colors.high, label: 'AVOID' },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Bullet({ text }: { text: string }) {
  return <Text style={styles.bullet}>• {text}</Text>;
}

function formatINR(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function ReportCard({ report }: Props) {
  const decision = report.decision ?? 'NEGOTIATE';
  const decisionCfg = DECISION_CONFIG[decision] ?? DECISION_CONFIG.NEGOTIATE;
  const confidence = report.confidence as Severity;

  return (
    <View style={styles.card}>
      {/* Decision banner */}
      <View style={[styles.decisionBanner, { backgroundColor: decisionCfg.bg, borderColor: decisionCfg.border }]}>
        <View style={styles.decisionLeft}>
          <Text style={[styles.decisionLabel, { color: decisionCfg.text }]}>{decisionCfg.label}</Text>
          <Text style={styles.decisionSub}>
            Score {report.overall_score ?? '—'}/100
          </Text>
        </View>
        <SeverityBadge level={confidence} label={`${confidence} CONFIDENCE`} />
      </View>

      {/* Vehicle summary */}
      <Section title="Vehicle">
        <View style={styles.grid}>
          <View style={styles.gridRow}>
            <Text style={styles.gridLabel}>Registration</Text>
            <Text style={styles.gridValue}>{report.vehicle_summary?.registration || '—'}</Text>
          </View>
          <View style={styles.gridRow}>
            <Text style={styles.gridLabel}>Model</Text>
            <Text style={styles.gridValue}>{report.vehicle_summary?.make_model || '—'}</Text>
          </View>
          <View style={styles.gridRow}>
            <Text style={styles.gridLabel}>Fuel</Text>
            <Text style={styles.gridValue}>{report.vehicle_summary?.fuel_type || '—'}</Text>
          </View>
          <View style={styles.gridRow}>
            <Text style={styles.gridLabel}>RC Status</Text>
            <Text style={styles.gridValue}>{report.vehicle_summary?.registration_status || '—'}</Text>
          </View>
        </View>
      </Section>

      {/* Red flags */}
      {report.red_flags?.length ? (
        <Section title="Red Flags">
          <View style={styles.redFlagList}>
            {report.red_flags.map((flag, i) => (
              <View key={i} style={styles.redFlag}>
                <Text style={styles.redFlagText}>⚠ {flag}</Text>
              </View>
            ))}
          </View>
        </Section>
      ) : null}

      {/* Inspection findings */}
      {report.inspection_findings?.length ? (
        <Section title="Findings">
          {report.inspection_findings.map((f, i) => (
            <View key={i} style={styles.finding}>
              <View style={styles.findingRow}>
                <Text style={styles.findingCategory}>{f.category}</Text>
                <SeverityBadge level={f.severity} />
              </View>
              {f.evidence ? <Text style={styles.findingDetail}>{f.evidence}</Text> : null}
              {f.recommendation ? (
                <Text style={styles.findingRec}>→ {f.recommendation}</Text>
              ) : null}
            </View>
          ))}
        </Section>
      ) : null}

      {/* Repair estimates */}
      {report.repair_estimates_inr?.length ? (
        <Section title="Repair Estimates">
          {report.repair_estimates_inr.map((est, i) => (
            <View key={i} style={styles.estimateRow}>
              <Text style={styles.estimateItem}>{est.item}</Text>
              <Text style={styles.estimateRange}>
                {formatINR(est.min)}–{formatINR(est.max)}
              </Text>
            </View>
          ))}
        </Section>
      ) : null}

      {/* Negotiation */}
      {report.negotiation_strategy ? (
        <Section title="Negotiation">
          <Text style={styles.discountRange}>
            Target discount:{' '}
            {formatINR(report.negotiation_strategy.target_discount_min)}–
            {formatINR(report.negotiation_strategy.target_discount_max)}
          </Text>
          {report.negotiation_strategy.talking_points?.map((point, i) => (
            <Bullet key={i} text={point} />
          ))}
        </Section>
      ) : null}

      {/* Next steps */}
      {report.next_steps?.length ? (
        <Section title="Next Steps">
          {report.next_steps.map((step, i) => (
            <Bullet key={i} text={step} />
          ))}
        </Section>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.resultBorder,
    backgroundColor: colors.white,
    padding: spacing.md,
    gap: spacing.md,
  },
  decisionBanner: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  decisionLeft: {
    gap: 2,
  },
  decisionLabel: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  decisionSub: {
    fontSize: 12,
    color: colors.textBody,
    fontWeight: '600',
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textLabel,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  grid: {
    gap: 4,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  gridLabel: {
    fontSize: 12,
    color: colors.textBody,
    fontWeight: '600',
    flex: 1,
  },
  gridValue: {
    fontSize: 12,
    color: colors.textValue,
    fontWeight: '700',
    flex: 1.5,
    textAlign: 'right',
  },
  redFlagList: {
    gap: 4,
  },
  redFlag: {
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.highBorder,
    backgroundColor: colors.highBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  redFlagText: {
    fontSize: 12,
    color: colors.high,
    fontWeight: '600',
    lineHeight: 17,
  },
  finding: {
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.resultBorder,
    backgroundColor: colors.resultBg,
    padding: spacing.sm,
    gap: 4,
  },
  findingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  findingCategory: {
    fontSize: 12,
    fontWeight: '800',
    color: '#214353',
    flex: 1,
  },
  findingDetail: {
    fontSize: 12,
    color: colors.textBody,
    lineHeight: 17,
  },
  findingRec: {
    fontSize: 11,
    color: colors.accent,
    fontWeight: '600',
    lineHeight: 16,
  },
  estimateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.resultBorder,
  },
  estimateItem: {
    fontSize: 12,
    color: colors.textValue,
    flex: 1,
  },
  estimateRange: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textDark,
  },
  discountRange: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textValue,
  },
  bullet: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textBody,
  },
});

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../styles/theme';
import type { VehicleData } from '../types';

interface Props {
  data: VehicleData;
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: 'good' | 'bad' }) {
  const valueStyle = [
    styles.value,
    highlight === 'good' && styles.valueGood,
    highlight === 'bad' && styles.valueBad,
  ];
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={valueStyle} numberOfLines={2}>{value || '—'}</Text>
    </View>
  );
}

export function VehicleDataCard({ data }: Props) {
  const hasBlacklist = Boolean(data.blacklistStatus && data.blacklistStatus.toLowerCase() !== 'not blacklisted' && data.blacklistStatus.trim() !== '');
  const hasFinance = Boolean(data.financeBank && data.financeBank.trim() !== '');

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Vehicle Details</Text>
        <View style={[styles.modeBadge, data._mode === 'live' ? styles.liveBadge : styles.mockBadge]}>
          <Text style={[styles.modeText, data._mode === 'live' ? styles.liveText : styles.mockText]}>
            {data._mode === 'live' ? `Live · ${data._provider || 'API'}` : 'Demo Data'}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <Row label="Registration" value={data.registrationNumber} />
      <Row label="Owner" value={data.ownerName} />
      <Row label="Model" value={data.makerModel} />
      <Row label="Fuel" value={data.fuelType} />
      {data.yearOfManufacture ? <Row label="Year" value={data.yearOfManufacture} /> : null}
      {data.colour ? <Row label="Colour" value={data.colour} /> : null}
      {data.state ? <Row label="State" value={data.state} /> : null}
      {data.registrationDate ? <Row label="Reg. Date" value={data.registrationDate} /> : null}
      {data.fitnessUpto ? <Row label="Fitness Upto" value={data.fitnessUpto} /> : null}
      {data.insuranceExpiry ? <Row label="Insurance Expiry" value={data.insuranceExpiry} /> : null}
      {data.blacklistStatus !== undefined && data.blacklistStatus !== null ? (
        <Row
          label="Blacklist"
          value={data.blacklistStatus || 'Not Blacklisted'}
          highlight={hasBlacklist ? 'bad' : 'good'}
        />
      ) : null}
      {hasFinance ? <Row label="Finance / Hypothecation" value={data.financeBank} highlight="bad" /> : null}
      {data.noc ? <Row label="NOC" value={data.noc} /> : null}
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
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    color: '#214353',
  },
  modeBadge: {
    borderRadius: radii.full,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  liveBadge: { backgroundColor: colors.lowBg, borderColor: colors.lowBorder },
  mockBadge: { backgroundColor: colors.mediumBg, borderColor: colors.mediumBorder },
  modeText: { fontSize: 11, fontWeight: '700' },
  liveText: { color: colors.low },
  mockText: { color: colors.medium },
  divider: {
    height: 1,
    backgroundColor: colors.resultBorder,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  label: {
    fontSize: 12,
    color: colors.textBody,
    fontWeight: '600',
    flex: 1,
  },
  value: {
    fontSize: 12,
    color: colors.textValue,
    fontWeight: '700',
    flex: 2,
    textAlign: 'right',
  },
  valueGood: { color: colors.low },
  valueBad: { color: colors.high },
});

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
  const isActive = data.registrationStatus?.toLowerCase().includes('active');

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
      <Row
        label="Status"
        value={data.registrationStatus || '—'}
        highlight={isActive ? 'good' : data.registrationStatus ? 'bad' : undefined}
      />
      {data.insuranceValidTill ? (
        <Row label="Insurance till" value={data.insuranceValidTill} />
      ) : null}
      {data.registeredAt ? <Row label="Registered at" value={data.registeredAt} /> : null}
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

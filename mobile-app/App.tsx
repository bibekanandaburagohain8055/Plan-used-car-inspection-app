import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { InspectionProvider, useInspection } from './src/context/InspectionContext';
import { STEPS } from './src/data/checkpoints';
import { DetailsScreen } from './src/screens/DetailsScreen';
import { IntroScreen } from './src/screens/IntroScreen';
import { NoiseScreen } from './src/screens/NoiseScreen';
import { PhotosScreen } from './src/screens/PhotosScreen';
import { ReportScreen } from './src/screens/ReportScreen';
import { StructuralScreen } from './src/screens/StructuralScreen';
import { colors } from './src/styles/theme';

function AppShell() {
  const { stepIndex, currentStep, goBack, isDraftLoading } = useInspection();

  if (isDraftLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const renderScreen = () => {
    switch (currentStep.id) {
      case 'intro':      return <IntroScreen />;
      case 'details':    return <DetailsScreen />;
      case 'photos':     return <PhotosScreen />;
      case 'structural': return <StructuralScreen />;
      case 'noise':      return <NoiseScreen />;
      case 'report':     return <ReportScreen />;
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.blobTop} />
      <View style={styles.blobBottom} />

      <View style={styles.shell}>
        <View style={styles.header}>
          <Pressable
            onPress={goBack}
            disabled={stepIndex === 0}
            style={[styles.backButton, stepIndex === 0 && styles.backButtonDisabled]}
          >
            <Text style={styles.backText}>{'<'}</Text>
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>SECONDHAND SATHI</Text>
            <Text style={styles.headerTitle}>{currentStep.title}</Text>
          </View>

          <View style={styles.progressPill}>
            <Text style={styles.progressText}>
              {stepIndex + 1}/{STEPS.length}
            </Text>
          </View>
        </View>

        <View style={styles.card}>{renderScreen()}</View>
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <InspectionProvider>
      <AppShell />
    </InspectionProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  blobTop: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    right: -70,
    top: -50,
    backgroundColor: colors.blobTop,
  },
  blobBottom: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    left: -90,
    bottom: -100,
    backgroundColor: colors.blobBottom,
  },
  shell: { flex: 1, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(18, 44, 57, 0.15)',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  backButtonDisabled: { opacity: 0.45 },
  backText: { color: '#1f4456', fontSize: 16, fontWeight: '700' },
  headerText: { flex: 1 },
  eyebrow: { fontSize: 11, letterSpacing: 1.1, color: colors.accent, fontWeight: '800' },
  headerTitle: { marginTop: 2, fontSize: 15, color: '#1f3f4f', fontWeight: '700' },
  progressPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(17, 184, 169, 0.25)',
    backgroundColor: 'rgba(240, 255, 252, 0.85)',
  },
  progressText: { fontSize: 12, fontWeight: '700', color: '#0a6f6a' },
  card: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(18, 40, 55, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.86)',
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
});

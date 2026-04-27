import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  createInitialPhotoState,
  createInitialStructuralState,
  PHOTO_CHECKPOINTS,
  STEPS,
  STRUCTURAL_CHECKPOINTS,
} from './src/data/checkpoints';
import { CarDetails, StepId } from './src/types';

const QUICK_TAGS = ['RC + VAHAN', 'Photo Inspection', 'Pillar + Chassis Check', 'Engine Noise AI'];
const WAVE_IDLE = [14, 22, 16, 20, 14];

type NoiseState = 'idle' | 'recording' | 'analyzed';
type Decision = 'BUY' | 'NEGOTIATE' | 'AVOID';

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const formatInr = (value: string): string => {
  if (!value.trim()) return 'Price not added';
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return value;
  return `Rs ${parsed.toLocaleString('en-IN')}`;
};

export default function App() {
  const [stepIndex, setStepIndex] = useState(0);
  const [details, setDetails] = useState<CarDetails>({
    carName: '',
    registrationNumber: '',
    askingPrice: '',
    odometer: '',
  });
  const [photoState, setPhotoState] = useState<Record<string, boolean>>(createInitialPhotoState());
  const [structuralState, setStructuralState] = useState<Record<string, { reviewed: boolean; flagged: boolean }>>(
    createInitialStructuralState()
  );
  const [noiseState, setNoiseState] = useState<NoiseState>('idle');
  const [waveHeights, setWaveHeights] = useState<number[]>(WAVE_IDLE);

  const currentStep = STEPS[stepIndex];

  const photoCapturedCount = useMemo(
    () => Object.values(photoState).filter(Boolean).length,
    [photoState]
  );

  const structuralSummary = useMemo(() => {
    const reviewed = STRUCTURAL_CHECKPOINTS.filter((item) => structuralState[item.id]?.reviewed).length;
    const flaggedItems = STRUCTURAL_CHECKPOINTS.filter((item) => structuralState[item.id]?.flagged);

    return {
      reviewed,
      flaggedCount: flaggedItems.length,
      flaggedTitles: flaggedItems.map((item) => item.title),
    };
  }, [structuralState]);

  const score = useMemo(() => {
    const penalty = noiseState === 'analyzed' ? 8 : 0;
    const value = 58 + photoCapturedCount * 4 + structuralSummary.reviewed * 2 - structuralSummary.flaggedCount * 6 - penalty;
    return clamp(value, 20, 95);
  }, [noiseState, photoCapturedCount, structuralSummary.flaggedCount, structuralSummary.reviewed]);

  const decision = useMemo((): { label: Decision; message: string; color: string } => {
    if (score >= 82 && structuralSummary.flaggedCount <= 1) {
      return {
        label: 'BUY',
        message: 'Strong profile. Complete final mechanic PPI before payment.',
        color: '#197d4d',
      };
    }

    if (score >= 66 && structuralSummary.flaggedCount <= 3) {
      return {
        label: 'NEGOTIATE',
        message: 'Good candidate with risks. Negotiate with documented repair estimates.',
        color: '#9b6800',
      };
    }

    return {
      label: 'AVOID',
      message: 'High structural risk. Only proceed with expert verification and deep discount.',
      color: '#b53b2f',
    };
  }, [score, structuralSummary.flaggedCount]);

  useEffect(() => {
    if (noiseState !== 'recording') {
      return;
    }

    const waveTimer = setInterval(() => {
      setWaveHeights(Array.from({ length: 5 }, () => Math.floor(Math.random() * 30) + 12));
    }, 150);

    const recordingTimer = setTimeout(() => {
      setNoiseState('analyzed');
      setWaveHeights([16, 30, 24, 28, 18]);
    }, 2400);

    return () => {
      clearInterval(waveTimer);
      clearTimeout(recordingTimer);
    };
  }, [noiseState]);

  const goToStep = (id: StepId): void => {
    const index = STEPS.findIndex((step) => step.id === id);
    if (index >= 0) {
      setStepIndex(index);
    }
  };

  const updateDetailField = (key: keyof CarDetails, value: string): void => {
    setDetails((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const togglePhoto = (id: string): void => {
    setPhotoState((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const toggleStructural = (id: string, field: 'reviewed' | 'flagged'): void => {
    setStructuralState((prev) => {
      const next = !prev[id]?.[field];
      return {
        ...prev,
        [id]: {
          reviewed: field === 'reviewed' ? next : prev[id]?.reviewed ?? false,
          flagged: field === 'flagged' ? next : prev[id]?.flagged ?? false,
        },
      };
    });
  };

  const startRecording = (): void => {
    if (noiseState === 'recording') {
      return;
    }
    setNoiseState('recording');
    setWaveHeights([20, 18, 22, 16, 19]);
  };

  const resetInspection = (): void => {
    setDetails({
      carName: '',
      registrationNumber: '',
      askingPrice: '',
      odometer: '',
    });
    setPhotoState(createInitialPhotoState());
    setStructuralState(createInitialStructuralState());
    setNoiseState('idle');
    setWaveHeights(WAVE_IDLE);
    setStepIndex(0);
  };

  const vehicleName = details.carName.trim() || 'Selected Vehicle';
  const vehicleMeta = `${details.registrationNumber.trim() || 'Reg no not added'} | ${formatInr(
    details.askingPrice
  )} | ${details.odometer.trim() ? `${details.odometer.trim()} km` : 'Odometer not added'}`;

  const negotiationText =
    decision.label === 'BUY'
      ? 'Negotiation: Minimal, ask for service package + documentation'
      : decision.label === 'NEGOTIATE'
        ? 'Negotiation: Rs 30,000 to Rs 70,000 lower + full mechanic PPI'
        : 'Negotiation: Prefer walk away unless full structural proof is provided';

  const renderScreen = () => {
    if (currentStep.id === 'intro') {
      return (
        <View style={styles.contentWrap}>
          <Text style={styles.headline}>Buy Better Used Cars in India</Text>
          <Text style={styles.mutedText}>
            Guided flow for details capture, visual inspection, structural damage checks, and engine sound risk.
          </Text>

          <View style={styles.tagRow}>
            {QUICK_TAGS.map((tag) => (
              <View key={tag} style={styles.tagPill}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>

          <View style={styles.heroCard}>
            <Text style={styles.heroLabel}>Estimated Time</Text>
            <Text style={styles.heroValue}>8-10 min</Text>
            <Text style={styles.heroSub}>Best in daylight + quiet surroundings</Text>
          </View>

          <Pressable style={styles.primaryButton} onPress={() => goToStep('details')}>
            <Text style={styles.primaryButtonText}>Start Inspection</Text>
          </Pressable>
        </View>
      );
    }

    if (currentStep.id === 'details') {
      return (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Fill Car Details</Text>
          <Text style={styles.mutedText}>Enter basics to personalize checks and report output.</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Car Name</Text>
            <TextInput
              value={details.carName}
              onChangeText={(text) => updateDetailField('carName', text)}
              placeholder="e.g. Hyundai i20 Sportz"
              placeholderTextColor="#8ca2af"
              style={styles.input}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Registration Number</Text>
            <TextInput
              value={details.registrationNumber}
              onChangeText={(text) => updateDetailField('registrationNumber', text.toUpperCase())}
              placeholder="e.g. AS01AB1234"
              placeholderTextColor="#8ca2af"
              autoCapitalize="characters"
              style={styles.input}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Asking Price (INR)</Text>
            <TextInput
              value={details.askingPrice}
              onChangeText={(text) => updateDetailField('askingPrice', text.replace(/[^0-9]/g, ''))}
              placeholder="e.g. 520000"
              placeholderTextColor="#8ca2af"
              keyboardType="numeric"
              style={styles.input}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Odometer (km)</Text>
            <TextInput
              value={details.odometer}
              onChangeText={(text) => updateDetailField('odometer', text.replace(/[^0-9]/g, ''))}
              placeholder="e.g. 64000"
              placeholderTextColor="#8ca2af"
              keyboardType="numeric"
              style={styles.input}
            />
          </View>

          <Pressable style={styles.primaryButton} onPress={() => goToStep('photos')}>
            <Text style={styles.primaryButtonText}>Save and Continue</Text>
          </Pressable>
        </ScrollView>
      );
    }

    if (currentStep.id === 'photos') {
      return (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Capture Car Photos</Text>
          <Text style={styles.mutedText}>Tap each tile to simulate captured evidence.</Text>

          <View style={styles.counterPill}>
            <Text style={styles.counterText}>{photoCapturedCount} / 6 photos captured</Text>
          </View>

          <View style={styles.gridWrap}>
            {PHOTO_CHECKPOINTS.map((item) => {
              const captured = photoState[item.id];
              return (
                <Pressable
                  key={item.id}
                  onPress={() => togglePhoto(item.id)}
                  style={[styles.photoTile, captured && styles.photoTileCaptured]}
                >
                  <Text style={[styles.photoTileLabel, captured && styles.photoTileLabelCaptured]}>
                    {captured ? `${item.label} - Captured` : item.label}
                  </Text>
                  <Text style={styles.photoTileHint}>{item.hint}</Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable style={styles.primaryButton} onPress={() => goToStep('structural')}>
            <Text style={styles.primaryButtonText}>Continue to Structural Check</Text>
          </Pressable>
        </ScrollView>
      );
    }

    if (currentStep.id === 'structural') {
      return (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Structural Damage Check</Text>
          <Text style={styles.mutedText}>Review each point and flag suspicious accident indicators.</Text>

          <View style={styles.counterPill}>
            <Text style={styles.counterText}>
              Reviewed {structuralSummary.reviewed}/10 | Flagged {structuralSummary.flaggedCount}
            </Text>
          </View>

          <View style={styles.structuralList}>
            {STRUCTURAL_CHECKPOINTS.map((item) => {
              const state = structuralState[item.id];
              return (
                <View
                  key={item.id}
                  style={[
                    styles.structuralCard,
                    state.reviewed && styles.structuralCardReviewed,
                    state.flagged && styles.structuralCardFlagged,
                  ]}
                >
                  <Text style={styles.structuralTitle}>{item.title}</Text>
                  <Text style={styles.structuralBody}>{item.description}</Text>

                  <View style={styles.structuralActionRow}>
                    <Pressable
                      style={[styles.smallButton, styles.smallButtonReview, state.reviewed && styles.smallButtonReviewActive]}
                      onPress={() => toggleStructural(item.id, 'reviewed')}
                    >
                      <Text
                        style={[
                          styles.smallButtonText,
                          styles.smallButtonReviewText,
                          state.reviewed && styles.smallButtonReviewTextActive,
                        ]}
                      >
                        {state.reviewed ? 'Reviewed' : 'Mark Reviewed'}
                      </Text>
                    </Pressable>

                    <Pressable
                      style={[styles.smallButton, styles.smallButtonFlag, state.flagged && styles.smallButtonFlagActive]}
                      onPress={() => toggleStructural(item.id, 'flagged')}
                    >
                      <Text style={[styles.smallButtonText, styles.smallButtonFlagText, state.flagged && styles.smallButtonFlagTextActive]}>
                        {state.flagged ? 'Flagged' : 'Flag Issue'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>

          <Pressable style={styles.primaryButton} onPress={() => goToStep('noise')}>
            <Text style={styles.primaryButtonText}>Continue to Engine Noise</Text>
          </Pressable>
        </ScrollView>
      );
    }

    if (currentStep.id === 'noise') {
      const isRecording = noiseState === 'recording';

      return (
        <View style={styles.contentWrap}>
          <Text style={styles.sectionTitle}>Listen to Engine Noise</Text>
          <Text style={styles.mutedText}>Place phone 15-20 cm from hood and record idle + light rev.</Text>

          <View style={styles.noiseCard}>
            <View style={styles.waveWrap}>
              {waveHeights.map((height, index) => (
                <View
                  key={index}
                  style={[
                    styles.waveBar,
                    {
                      height,
                    },
                    isRecording && styles.waveBarActive,
                  ]}
                />
              ))}
            </View>

            <Text style={styles.noiseStatusText}>
              {noiseState === 'idle' && 'Ready to record'}
              {noiseState === 'recording' && 'Listening... capturing 20 second sample'}
              {noiseState === 'analyzed' && 'Analysis complete'}
            </Text>

            <Pressable
              style={[styles.secondaryButton, isRecording && styles.secondaryButtonDisabled]}
              disabled={isRecording}
              onPress={startRecording}
            >
              <Text style={styles.secondaryButtonText}>
                {noiseState === 'recording' ? 'Recording...' : noiseState === 'analyzed' ? 'Record Again' : 'Start Recording'}
              </Text>
            </Pressable>
          </View>

          {noiseState === 'analyzed' && (
            <View style={styles.riskCard}>
              <Text style={styles.riskTitle}>Noise Risk: Mild irregular tick at idle</Text>
              <Text style={styles.riskBody}>Possible belt or pulley wear. Recommend mechanic confirmation.</Text>
            </View>
          )}

          <Pressable style={styles.primaryButton} onPress={() => goToStep('report')}>
            <Text style={styles.primaryButtonText}>Generate Final Report</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Final Inspection Report</Text>

        <View style={styles.reportCard}>
          <Text style={styles.reportLabel}>Vehicle</Text>
          <Text style={styles.reportVehicle}>{vehicleName}</Text>
          <Text style={styles.reportMeta}>{vehicleMeta}</Text>

          <View style={styles.scoreRow}>
            <View>
              <Text style={styles.reportLabel}>Health Score</Text>
              <Text style={styles.scoreValue}>{score}</Text>
            </View>

            <View>
              <Text style={styles.reportLabel}>Decision</Text>
              <Text style={[styles.decisionValue, { color: decision.color }]}>{decision.label}</Text>
            </View>
          </View>

          <View style={styles.listWrap}>
            <Text style={styles.listItem}>- RC details captured</Text>
            <Text style={styles.listItem}>- Photos captured: {photoCapturedCount} / 6</Text>
            <Text style={styles.listItem}>- Structural reviewed: {structuralSummary.reviewed} / 10</Text>
            <Text style={styles.listItem}>- Structural issues flagged: {structuralSummary.flaggedCount}</Text>
            <Text style={styles.listItem}>
              - Flagged areas: {structuralSummary.flaggedTitles.length ? structuralSummary.flaggedTitles.join(', ') : 'None'}
            </Text>
            <Text style={styles.listItem}>
              - Engine noise: {noiseState === 'analyzed' ? 'Mild anomaly detected' : 'Not analyzed'}
            </Text>
          </View>

          <View style={styles.summaryBox}>
            <Text style={styles.summaryText}>{decision.message}</Text>
            <Text style={styles.summarySubText}>{negotiationText}</Text>
          </View>
        </View>

        <Pressable style={styles.secondaryButton} onPress={resetInspection}>
          <Text style={styles.secondaryButtonText}>Run New Inspection</Text>
        </Pressable>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      <View style={styles.backgroundBlobTop} />
      <View style={styles.backgroundBlobBottom} />

      <View style={styles.appShell}>
        <View style={styles.header}>
          <Pressable
            onPress={() => setStepIndex((prev) => clamp(prev - 1, 0, STEPS.length - 1))}
            disabled={stepIndex === 0}
            style={[styles.backButton, stepIndex === 0 && styles.backButtonDisabled]}
          >
            <Text style={styles.backButtonText}>{'<'} </Text>
          </Pressable>

          <View style={styles.headerTextWrap}>
            <Text style={styles.eyebrow}>SECONDHAND SATHI</Text>
            <Text style={styles.headerTitle}>{currentStep.title}</Text>
          </View>

          <View style={styles.progressPill}>
            <Text style={styles.progressPillText}>
              {stepIndex + 1}/{STEPS.length}
            </Text>
          </View>
        </View>

        <View style={styles.screenCard}>{renderScreen()}</View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#eef6f9',
  },
  backgroundBlobTop: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    right: -70,
    top: -50,
    backgroundColor: '#b6f5e8',
  },
  backgroundBlobBottom: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    left: -90,
    bottom: -100,
    backgroundColor: '#ffd8b3',
  },
  appShell: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
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
  backButtonDisabled: {
    opacity: 0.45,
  },
  backButtonText: {
    color: '#1f4456',
    fontSize: 16,
    fontWeight: '700',
  },
  headerTextWrap: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.1,
    color: '#0d6f69',
    fontWeight: '800',
  },
  headerTitle: {
    marginTop: 2,
    fontSize: 15,
    color: '#1f3f4f',
    fontWeight: '700',
  },
  progressPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(17, 184, 169, 0.25)',
    backgroundColor: 'rgba(240, 255, 252, 0.85)',
  },
  progressPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0a6f6a',
  },
  screenCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(18, 40, 55, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.86)',
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  contentWrap: {
    flex: 1,
    gap: 14,
  },
  scrollContent: {
    gap: 14,
    paddingBottom: 12,
  },
  headline: {
    fontSize: 30,
    lineHeight: 33,
    fontWeight: '800',
    color: '#10222e',
    letterSpacing: -0.4,
  },
  sectionTitle: {
    fontSize: 24,
    lineHeight: 27,
    fontWeight: '800',
    color: '#10222e',
    letterSpacing: -0.3,
  },
  mutedText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#54707e',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(17, 184, 169, 0.2)',
    backgroundColor: 'rgba(250, 255, 255, 0.88)',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  tagText: {
    color: '#0f6f68',
    fontWeight: '700',
    fontSize: 12,
  },
  heroCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(15, 40, 53, 0.1)',
    backgroundColor: '#ffffff',
    padding: 14,
    gap: 5,
  },
  heroLabel: {
    fontSize: 12,
    color: '#5f7785',
    fontWeight: '700',
  },
  heroValue: {
    fontSize: 32,
    lineHeight: 34,
    fontWeight: '800',
    color: '#143140',
  },
  heroSub: {
    fontSize: 13,
    color: '#54707e',
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2a4a59',
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(17, 45, 61, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: '#ffffff',
    fontSize: 15,
    color: '#133141',
  },
  counterPill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(15, 42, 59, 0.12)',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  counterText: {
    fontSize: 12,
    color: '#2f5161',
    fontWeight: '700',
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoTile: {
    width: '48.7%',
    minHeight: 98,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(39, 79, 96, 0.25)',
    borderStyle: 'dashed',
    backgroundColor: '#f8fcfe',
    padding: 10,
    gap: 6,
  },
  photoTileCaptured: {
    borderStyle: 'solid',
    borderColor: 'rgba(25, 125, 77, 0.4)',
    backgroundColor: 'rgba(216, 248, 231, 0.7)',
  },
  photoTileLabel: {
    color: '#2b4a58',
    fontWeight: '800',
    fontSize: 13,
    lineHeight: 17,
  },
  photoTileLabelCaptured: {
    color: '#17643f',
  },
  photoTileHint: {
    color: '#607987',
    fontSize: 11,
    lineHeight: 14,
  },
  structuralList: {
    gap: 10,
  },
  structuralCard: {
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(16, 46, 63, 0.12)',
    backgroundColor: '#ffffff',
    padding: 11,
    gap: 8,
  },
  structuralCardReviewed: {
    borderColor: 'rgba(25, 125, 77, 0.35)',
    backgroundColor: 'rgba(232, 250, 241, 0.85)',
  },
  structuralCardFlagged: {
    borderColor: 'rgba(181, 59, 47, 0.35)',
    backgroundColor: 'rgba(255, 236, 233, 0.85)',
  },
  structuralTitle: {
    color: '#173546',
    fontWeight: '800',
    fontSize: 14,
  },
  structuralBody: {
    color: '#4d6876',
    fontSize: 12,
    lineHeight: 17,
  },
  structuralActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  smallButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallButtonReview: {
    borderColor: 'rgba(17, 132, 123, 0.3)',
    backgroundColor: '#f4fffc',
  },
  smallButtonReviewActive: {
    backgroundColor: 'rgba(22, 153, 110, 0.16)',
    borderColor: 'rgba(22, 153, 110, 0.4)',
  },
  smallButtonFlag: {
    borderColor: 'rgba(171, 63, 53, 0.25)',
    backgroundColor: '#fff9f8',
  },
  smallButtonFlagActive: {
    backgroundColor: 'rgba(192, 69, 56, 0.16)',
    borderColor: 'rgba(192, 69, 56, 0.4)',
  },
  smallButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  smallButtonReviewText: {
    color: '#0d6962',
  },
  smallButtonReviewTextActive: {
    color: '#146741',
  },
  smallButtonFlagText: {
    color: '#a53d2e',
  },
  smallButtonFlagTextActive: {
    color: '#8c2e22',
  },
  noiseCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(15, 40, 53, 0.1)',
    backgroundColor: '#ffffff',
    padding: 14,
    gap: 12,
  },
  waveWrap: {
    height: 90,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 44, 59, 0.12)',
    backgroundColor: '#f3fafc',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  waveBar: {
    width: 8,
    borderRadius: 999,
    backgroundColor: '#8fb4c2',
  },
  waveBarActive: {
    backgroundColor: '#0e9d8f',
  },
  noiseStatusText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#345566',
  },
  riskCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(181, 114, 0, 0.3)',
    backgroundColor: '#fff2df',
    padding: 11,
    gap: 5,
  },
  riskTitle: {
    fontSize: 13,
    color: '#694904',
    fontWeight: '800',
  },
  riskBody: {
    fontSize: 12,
    lineHeight: 16,
    color: '#7f5a07',
  },
  reportCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(15, 44, 58, 0.12)',
    backgroundColor: '#ffffff',
    padding: 14,
    gap: 10,
  },
  reportLabel: {
    color: '#617784',
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  reportVehicle: {
    color: '#163241',
    fontWeight: '800',
    fontSize: 21,
    lineHeight: 24,
  },
  reportMeta: {
    color: '#55707e',
    fontSize: 12,
    lineHeight: 17,
  },
  scoreRow: {
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 46, 62, 0.1)',
    backgroundColor: '#f5fbfd',
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scoreValue: {
    marginTop: 4,
    color: '#153141',
    fontSize: 36,
    lineHeight: 38,
    fontWeight: '800',
  },
  decisionValue: {
    marginTop: 8,
    fontSize: 20,
    fontWeight: '800',
  },
  listWrap: {
    gap: 5,
  },
  listItem: {
    color: '#385463',
    fontSize: 12,
    lineHeight: 17,
  },
  summaryBox: {
    marginTop: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 49, 66, 0.12)',
    backgroundColor: '#f8fcff',
    padding: 10,
    gap: 6,
  },
  summaryText: {
    color: '#244352',
    fontWeight: '700',
    fontSize: 13,
    lineHeight: 18,
  },
  summarySubText: {
    color: '#486473',
    fontSize: 12,
    lineHeight: 17,
  },
  primaryButton: {
    marginTop: 'auto',
    borderRadius: 12,
    backgroundColor: '#0b8f83',
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 49, 66, 0.16)',
    backgroundColor: '#ffffff',
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonDisabled: {
    opacity: 0.6,
  },
  secondaryButtonText: {
    color: '#264857',
    fontSize: 14,
    fontWeight: '800',
  },
});

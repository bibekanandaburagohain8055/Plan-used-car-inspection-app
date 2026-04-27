import { StatusBar } from 'expo-status-bar';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  analyzeAudio,
  analyzePhotos,
  generateFinalReport,
  lookupVehicle,
  type PhotoAssetInput,
} from './src/api/client';
import { API_BASE_URL } from './src/constants/config';
import {
  createInitialStructuralState,
  PHOTO_CHECKPOINTS,
  STEPS,
  STRUCTURAL_CHECKPOINTS,
} from './src/data/checkpoints';
import { CarDetails } from './src/types';

type NoiseState = 'idle' | 'recording' | 'recorded';

type CapturedPhoto = {
  uri: string;
  name: string;
  type: string;
  label: string;
};

type FinalReport = {
  vehicle_summary?: {
    registration?: string;
    make_model?: string;
    fuel_type?: string;
    registration_status?: string;
  };
  overall_score?: number;
  decision?: 'BUY' | 'NEGOTIATE' | 'AVOID';
  confidence?: 'LOW' | 'MEDIUM' | 'HIGH';
  red_flags?: string[];
  inspection_findings?: Array<{
    category?: string;
    severity?: 'LOW' | 'MEDIUM' | 'HIGH';
    evidence?: string;
    recommendation?: string;
  }>;
  repair_estimates_inr?: Array<{
    item?: string;
    min?: number;
    max?: number;
  }>;
  negotiation_strategy?: {
    target_discount_min?: number;
    target_discount_max?: number;
    talking_points?: string[];
  };
  next_steps?: string[];
};

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const createInitialPhotoState = (): Record<string, CapturedPhoto | null> =>
  Object.fromEntries(PHOTO_CHECKPOINTS.map((item) => [item.id, null]));

export default function App() {
  const [stepIndex, setStepIndex] = useState(0);

  const [details, setDetails] = useState<CarDetails>({
    carName: '',
    registrationNumber: '',
    askingPrice: '',
    odometer: '',
  });

  const [vehicleData, setVehicleData] = useState<Record<string, unknown> | null>(null);
  const [vehicleLoading, setVehicleLoading] = useState(false);
  const [vehicleError, setVehicleError] = useState<string | null>(null);

  const [photos, setPhotos] = useState<Record<string, CapturedPhoto | null>>(createInitialPhotoState());
  const [photoAnalyzeLoading, setPhotoAnalyzeLoading] = useState(false);
  const [photoAnalysis, setPhotoAnalysis] = useState<Record<string, unknown> | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [structuralState, setStructuralState] = useState<Record<string, { reviewed: boolean; flagged: boolean }>>(
    createInitialStructuralState()
  );

  const [noiseState, setNoiseState] = useState<NoiseState>('idle');
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [audioClip, setAudioClip] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [audioAnalyzeLoading, setAudioAnalyzeLoading] = useState(false);
  const [audioTranscript, setAudioTranscript] = useState('');
  const [audioAnalysis, setAudioAnalysis] = useState<Record<string, unknown> | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);

  const [reportLoading, setReportLoading] = useState(false);
  const [finalReport, setFinalReport] = useState<FinalReport | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  const currentStep = STEPS[stepIndex];

  const capturedPhotoCount = useMemo(
    () => Object.values(photos).filter((item) => item !== null).length,
    [photos]
  );

  const structuralSummary = useMemo(() => {
    const reviewed = STRUCTURAL_CHECKPOINTS.filter((item) => structuralState[item.id]?.reviewed).length;
    const flagged = STRUCTURAL_CHECKPOINTS.filter((item) => structuralState[item.id]?.flagged).length;

    return {
      reviewed,
      flagged,
    };
  }, [structuralState]);

  const fallbackScore = useMemo(() => {
    const noisePenalty = audioAnalysis ? 8 : 0;
    return clamp(58 + capturedPhotoCount * 4 + structuralSummary.reviewed * 2 - structuralSummary.flagged * 6 - noisePenalty, 20, 95);
  }, [audioAnalysis, capturedPhotoCount, structuralSummary.flagged, structuralSummary.reviewed]);

  useEffect(() => {
    return () => {
      if (recording) {
        void recording.stopAndUnloadAsync();
      }
    };
  }, [recording]);

  const updateDetailField = (key: keyof CarDetails, value: string): void => {
    setDetails((prev) => ({ ...prev, [key]: value }));
  };

  const handleVehicleLookup = async (): Promise<void> => {
    const reg = details.registrationNumber.trim();
    if (!reg) {
      Alert.alert('Registration required', 'Please enter the vehicle registration number first.');
      return;
    }

    setVehicleLoading(true);
    setVehicleError(null);

    try {
      const response = await lookupVehicle(reg);
      setVehicleData(response.data);
    } catch (error) {
      setVehicleError(error instanceof Error ? error.message : 'Vehicle lookup failed');
    } finally {
      setVehicleLoading(false);
    }
  };

  const capturePhoto = async (checkpointId: string): Promise<void> => {
    setPhotoError(null);

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Camera access needed', 'Please allow camera permission to capture inspection photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: false,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    if (!asset?.uri) {
      return;
    }

    const checkpoint = PHOTO_CHECKPOINTS.find((item) => item.id === checkpointId);
    const label = checkpoint?.label || checkpointId;

    setPhotos((prev) => ({
      ...prev,
      [checkpointId]: {
        uri: asset.uri,
        name: asset.fileName || `${checkpointId}-${Date.now()}.jpg`,
        type: asset.mimeType || 'image/jpeg',
        label,
      },
    }));
  };

  const analyzeCapturedPhotos = async (): Promise<void> => {
    const inputs: PhotoAssetInput[] = Object.values(photos)
      .filter((item): item is CapturedPhoto => Boolean(item))
      .map((item) => ({
        uri: item.uri,
        name: item.name,
        type: item.type,
        label: item.label,
      }));

    if (!inputs.length) {
      Alert.alert('No photos', 'Capture at least one photo before AI validation.');
      return;
    }

    setPhotoAnalyzeLoading(true);
    setPhotoError(null);

    try {
      const result = await analyzePhotos(inputs);
      setPhotoAnalysis(result.analysis ?? null);
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : 'Photo analysis failed');
    } finally {
      setPhotoAnalyzeLoading(false);
    }
  };

  const toggleStructural = (id: string, field: 'reviewed' | 'flagged'): void => {
    setStructuralState((prev) => {
      const current = prev[id] || { reviewed: false, flagged: false };

      return {
        ...prev,
        [id]: {
          reviewed: field === 'reviewed' ? !current.reviewed : current.reviewed,
          flagged: field === 'flagged' ? !current.flagged : current.flagged,
        },
      };
    });
  };

  const startRecording = async (): Promise<void> => {
    setAudioError(null);

    const permission = await Audio.requestPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Microphone required', 'Please allow microphone access to record engine sound.');
      return;
    }

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await newRecording.startAsync();

      setRecording(newRecording);
      setNoiseState('recording');
    } catch (error) {
      setAudioError(error instanceof Error ? error.message : 'Unable to start recording');
    }
  };

  const stopRecording = async (): Promise<void> => {
    if (!recording) {
      return;
    }

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      setRecording(null);
      setNoiseState('recorded');

      if (uri) {
        setAudioClip({
          uri,
          name: `engine-${Date.now()}.m4a`,
          type: 'audio/m4a',
        });
      }
    } catch (error) {
      setAudioError(error instanceof Error ? error.message : 'Unable to stop recording');
      setRecording(null);
      setNoiseState('idle');
    }
  };

  const analyzeEngineAudio = async (): Promise<void> => {
    if (!audioClip) {
      Alert.alert('No recording', 'Record engine sound first.');
      return;
    }

    setAudioAnalyzeLoading(true);
    setAudioError(null);

    try {
      const result = await analyzeAudio(audioClip);
      setAudioTranscript(result.transcript || '');
      setAudioAnalysis(result.analysis ?? null);
    } catch (error) {
      setAudioError(error instanceof Error ? error.message : 'Audio analysis failed');
    } finally {
      setAudioAnalyzeLoading(false);
    }
  };

  const generateAiReport = async (): Promise<void> => {
    setReportLoading(true);
    setReportError(null);

    const structuralChecks = STRUCTURAL_CHECKPOINTS.map((item) => ({
      title: item.title,
      reviewed: structuralState[item.id]?.reviewed ?? false,
      flagged: structuralState[item.id]?.flagged ?? false,
    }));

    try {
      const response = await generateFinalReport({
        details,
        vehicleApiData: vehicleData ?? {},
        photoAnalysis: photoAnalysis ?? {},
        structuralChecks,
        audioAnalysis: audioAnalysis ?? {},
      });

      setFinalReport((response.report || null) as FinalReport | null);
    } catch (error) {
      setReportError(error instanceof Error ? error.message : 'Report generation failed');
    } finally {
      setReportLoading(false);
    }
  };

  const restartInspection = (): void => {
    setStepIndex(0);
    setDetails({ carName: '', registrationNumber: '', askingPrice: '', odometer: '' });
    setVehicleData(null);
    setVehicleError(null);
    setPhotos(createInitialPhotoState());
    setPhotoAnalysis(null);
    setPhotoError(null);
    setStructuralState(createInitialStructuralState());
    setNoiseState('idle');
    setRecording(null);
    setAudioClip(null);
    setAudioTranscript('');
    setAudioAnalysis(null);
    setAudioError(null);
    setFinalReport(null);
    setReportError(null);
  };

  const goToStep = (id: (typeof STEPS)[number]['id']): void => {
    const index = STEPS.findIndex((step) => step.id === id);
    if (index >= 0) {
      setStepIndex(index);
    }
  };

  const renderIntro = () => (
    <View style={styles.contentWrap}>
      <Text style={styles.headline}>Used Car AI Inspector</Text>
      <Text style={styles.mutedText}>
        Live mobile app with India vehicle lookup, real camera, real engine audio recording, and OpenAI-generated final report.
      </Text>

      <View style={styles.tagRow}>
        {['Vehicle API', 'Camera Capture', 'Engine Audio', 'AI Final Report'].map((tag) => (
          <View key={tag} style={styles.tagPill}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>Backend Endpoint</Text>
        <Text style={styles.heroValueTiny}>{API_BASE_URL}</Text>
        <Text style={styles.heroSub}>Set `EXPO_PUBLIC_API_BASE_URL` for physical device testing.</Text>
      </View>

      <Pressable style={styles.primaryButton} onPress={() => goToStep('details')}>
        <Text style={styles.primaryButtonText}>Start Inspection</Text>
      </Pressable>
    </View>
  );

  const renderDetails = () => (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Fill Car Details</Text>
      <Text style={styles.mutedText}>Fetch vehicle details using your configured India vehicle API connector.</Text>

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

      <Pressable style={styles.secondaryButton} onPress={handleVehicleLookup}>
        <Text style={styles.secondaryButtonText}>{vehicleLoading ? 'Fetching...' : 'Fetch Vehicle API Details'}</Text>
      </Pressable>

      {vehicleError ? <Text style={styles.errorText}>{vehicleError}</Text> : null}

      {vehicleData ? (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>Vehicle API Response</Text>
          <Text style={styles.resultBody}>{JSON.stringify(vehicleData, null, 2)}</Text>
        </View>
      ) : null}

      <Pressable style={styles.primaryButton} onPress={() => goToStep('photos')}>
        <Text style={styles.primaryButtonText}>Continue to Photo Capture</Text>
      </Pressable>
    </ScrollView>
  );

  const renderPhotos = () => (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Capture Car Photos</Text>
      <Text style={styles.mutedText}>Capture each checkpoint with real camera and run AI validation.</Text>

      <View style={styles.counterPill}>
        <Text style={styles.counterText}>{capturedPhotoCount} / {PHOTO_CHECKPOINTS.length} photos captured</Text>
      </View>

      <View style={styles.photoList}>
        {PHOTO_CHECKPOINTS.map((checkpoint) => {
          const asset = photos[checkpoint.id];
          return (
            <View key={checkpoint.id} style={styles.photoRow}>
              <View style={styles.photoInfo}>
                <Text style={styles.photoLabel}>{checkpoint.label}</Text>
                <Text style={styles.photoHint}>{checkpoint.hint}</Text>
                <Text style={asset ? styles.photoCapturedText : styles.photoPendingText}>
                  {asset ? 'Captured' : 'Pending'}
                </Text>
              </View>

              {asset ? <Image source={{ uri: asset.uri }} style={styles.photoThumb} /> : <View style={styles.photoThumbPlaceholder} />}

              <Pressable style={styles.smallActionBtn} onPress={() => capturePhoto(checkpoint.id)}>
                <Text style={styles.smallActionText}>{asset ? 'Retake' : 'Capture'}</Text>
              </Pressable>
            </View>
          );
        })}
      </View>

      <Pressable style={styles.secondaryButton} onPress={analyzeCapturedPhotos}>
        <Text style={styles.secondaryButtonText}>{photoAnalyzeLoading ? 'Analyzing Photos...' : 'Run AI Photo Validation'}</Text>
      </Pressable>

      {photoError ? <Text style={styles.errorText}>{photoError}</Text> : null}

      {photoAnalysis ? (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>AI Photo Analysis</Text>
          <Text style={styles.resultBody}>{JSON.stringify(photoAnalysis, null, 2)}</Text>
        </View>
      ) : null}

      <Pressable style={styles.primaryButton} onPress={() => goToStep('structural')}>
        <Text style={styles.primaryButtonText}>Continue to Structural Check</Text>
      </Pressable>
    </ScrollView>
  );

  const renderStructural = () => (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Structural Damage Check</Text>
      <Text style={styles.mutedText}>Mark reviewed points and flag suspicious accident indicators.</Text>

      <View style={styles.counterPill}>
        <Text style={styles.counterText}>Reviewed {structuralSummary.reviewed}/10 | Flagged {structuralSummary.flagged}</Text>
      </View>

      <View style={styles.structuralList}>
        {STRUCTURAL_CHECKPOINTS.map((item) => {
          const state = structuralState[item.id];

          return (
            <View
              key={item.id}
              style={[
                styles.structuralCard,
                state?.reviewed && styles.structuralCardReviewed,
                state?.flagged && styles.structuralCardFlagged,
              ]}
            >
              <Text style={styles.structuralTitle}>{item.title}</Text>
              <Text style={styles.structuralBody}>{item.description}</Text>

              <View style={styles.structuralActionRow}>
                <Pressable
                  style={[styles.smallButton, styles.smallButtonReview, state?.reviewed && styles.smallButtonReviewActive]}
                  onPress={() => toggleStructural(item.id, 'reviewed')}
                >
                  <Text style={[styles.smallButtonText, styles.smallButtonReviewText]}>
                    {state?.reviewed ? 'Reviewed' : 'Mark Reviewed'}
                  </Text>
                </Pressable>

                <Pressable
                  style={[styles.smallButton, styles.smallButtonFlag, state?.flagged && styles.smallButtonFlagActive]}
                  onPress={() => toggleStructural(item.id, 'flagged')}
                >
                  <Text style={[styles.smallButtonText, styles.smallButtonFlagText]}>
                    {state?.flagged ? 'Flagged' : 'Flag Issue'}
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>

      <Pressable style={styles.primaryButton} onPress={() => goToStep('noise')}>
        <Text style={styles.primaryButtonText}>Continue to Engine Audio</Text>
      </Pressable>
    </ScrollView>
  );

  const renderNoise = () => (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Engine Noise Recording</Text>
      <Text style={styles.mutedText}>Record real engine idle + light rev, then run AI audio analysis.</Text>

      <View style={styles.noiseCard}>
        <Text style={styles.noiseStatusLabel}>
          {noiseState === 'idle' && 'Ready to record'}
          {noiseState === 'recording' && 'Recording...'}
          {noiseState === 'recorded' && 'Recording complete'}
        </Text>

        {noiseState !== 'recording' ? (
          <Pressable style={styles.secondaryButton} onPress={startRecording}>
            <Text style={styles.secondaryButtonText}>Start Recording</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.secondaryButton} onPress={stopRecording}>
            <Text style={styles.secondaryButtonText}>Stop Recording</Text>
          </Pressable>
        )}

        <Pressable style={styles.secondaryButton} onPress={analyzeEngineAudio}>
          <Text style={styles.secondaryButtonText}>{audioAnalyzeLoading ? 'Analyzing Audio...' : 'Run AI Audio Analysis'}</Text>
        </Pressable>

        {audioError ? <Text style={styles.errorText}>{audioError}</Text> : null}
      </View>

      {audioTranscript ? (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>Transcript</Text>
          <Text style={styles.resultBody}>{audioTranscript}</Text>
        </View>
      ) : null}

      {audioAnalysis ? (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>AI Audio Analysis</Text>
          <Text style={styles.resultBody}>{JSON.stringify(audioAnalysis, null, 2)}</Text>
        </View>
      ) : null}

      <Pressable style={styles.primaryButton} onPress={() => goToStep('report')}>
        <Text style={styles.primaryButtonText}>Continue to Final Report</Text>
      </Pressable>
    </ScrollView>
  );

  const renderReport = () => (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>AI Final Report</Text>
      <Text style={styles.mutedText}>Generate a structured buying decision from all captured signals.</Text>

      <View style={styles.resultCard}>
        <Text style={styles.resultTitle}>Current Signal Summary</Text>
        <Text style={styles.listItem}>- Vehicle API: {vehicleData ? 'Connected' : 'Not fetched'}</Text>
        <Text style={styles.listItem}>- Photos captured: {capturedPhotoCount}/{PHOTO_CHECKPOINTS.length}</Text>
        <Text style={styles.listItem}>- Photo AI analysis: {photoAnalysis ? 'Available' : 'Pending'}</Text>
        <Text style={styles.listItem}>- Structural reviewed: {structuralSummary.reviewed}/10</Text>
        <Text style={styles.listItem}>- Structural flagged: {structuralSummary.flagged}</Text>
        <Text style={styles.listItem}>- Audio AI analysis: {audioAnalysis ? 'Available' : 'Pending'}</Text>
        <Text style={styles.listItem}>- Fallback score (without AI report schema): {fallbackScore}</Text>
      </View>

      <Pressable style={styles.primaryButton} onPress={generateAiReport}>
        <Text style={styles.primaryButtonText}>{reportLoading ? 'Generating Report...' : 'Generate Final AI Report'}</Text>
      </Pressable>

      {reportError ? <Text style={styles.errorText}>{reportError}</Text> : null}

      {finalReport ? (
        <View style={styles.reportCard}>
          <Text style={styles.reportHeading}>Decision: {finalReport.decision || 'N/A'}</Text>
          <Text style={styles.reportMeta}>Score: {finalReport.overall_score ?? 'N/A'} | Confidence: {finalReport.confidence ?? 'N/A'}</Text>

          <Text style={styles.reportSectionTitle}>Vehicle Summary</Text>
          <Text style={styles.listItem}>- Reg: {finalReport.vehicle_summary?.registration || details.registrationNumber || 'N/A'}</Text>
          <Text style={styles.listItem}>- Model: {finalReport.vehicle_summary?.make_model || details.carName || 'N/A'}</Text>
          <Text style={styles.listItem}>- Fuel: {finalReport.vehicle_summary?.fuel_type || 'N/A'}</Text>
          <Text style={styles.listItem}>- Reg Status: {finalReport.vehicle_summary?.registration_status || 'N/A'}</Text>

          <Text style={styles.reportSectionTitle}>Red Flags</Text>
          {(finalReport.red_flags || []).map((flag, index) => (
            <Text key={`${flag}-${index}`} style={styles.listItem}>- {flag}</Text>
          ))}
          {!finalReport.red_flags?.length ? <Text style={styles.listItem}>- None listed</Text> : null}

          <Text style={styles.reportSectionTitle}>Inspection Findings</Text>
          {(finalReport.inspection_findings || []).map((finding, index) => (
            <Text key={`${finding.category}-${index}`} style={styles.listItem}>
              - {finding.category}: {finding.severity} | {finding.evidence}
            </Text>
          ))}

          <Text style={styles.reportSectionTitle}>Repair Estimate (INR)</Text>
          {(finalReport.repair_estimates_inr || []).map((item, index) => (
            <Text key={`${item.item}-${index}`} style={styles.listItem}>
              - {item.item}: Rs {item.min ?? 0} to Rs {item.max ?? 0}
            </Text>
          ))}

          <Text style={styles.reportSectionTitle}>Negotiation</Text>
          <Text style={styles.listItem}>
            - Target discount: Rs {finalReport.negotiation_strategy?.target_discount_min ?? 0} to Rs {finalReport.negotiation_strategy?.target_discount_max ?? 0}
          </Text>
          {(finalReport.negotiation_strategy?.talking_points || []).map((point, index) => (
            <Text key={`${point}-${index}`} style={styles.listItem}>- {point}</Text>
          ))}

          <Text style={styles.reportSectionTitle}>Next Steps</Text>
          {(finalReport.next_steps || []).map((step, index) => (
            <Text key={`${step}-${index}`} style={styles.listItem}>- {step}</Text>
          ))}
        </View>
      ) : null}

      <Pressable style={styles.secondaryButton} onPress={restartInspection}>
        <Text style={styles.secondaryButtonText}>Run New Inspection</Text>
      </Pressable>
    </ScrollView>
  );

  const renderScreen = () => {
    if (currentStep.id === 'intro') return renderIntro();
    if (currentStep.id === 'details') return renderDetails();
    if (currentStep.id === 'photos') return renderPhotos();
    if (currentStep.id === 'structural') return renderStructural();
    if (currentStep.id === 'noise') return renderNoise();
    return renderReport();
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
  heroValueTiny: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
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
  photoList: {
    gap: 9,
  },
  photoRow: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 46, 63, 0.12)',
    backgroundColor: '#ffffff',
    padding: 10,
    gap: 8,
  },
  photoInfo: {
    gap: 2,
  },
  photoLabel: {
    color: '#173546',
    fontWeight: '800',
    fontSize: 14,
  },
  photoHint: {
    color: '#4d6876',
    fontSize: 12,
    lineHeight: 17,
  },
  photoPendingText: {
    color: '#8f5a00',
    fontWeight: '700',
    fontSize: 12,
  },
  photoCapturedText: {
    color: '#17643f',
    fontWeight: '700',
    fontSize: 12,
  },
  photoThumb: {
    width: '100%',
    height: 140,
    borderRadius: 10,
    backgroundColor: '#f0f5f8',
  },
  photoThumbPlaceholder: {
    width: '100%',
    height: 80,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(22, 49, 66, 0.15)',
    borderStyle: 'dashed',
    backgroundColor: '#f7fbfd',
  },
  smallActionBtn: {
    borderWidth: 1,
    borderColor: 'rgba(16, 49, 66, 0.16)',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    paddingVertical: 9,
    alignItems: 'center',
  },
  smallActionText: {
    color: '#1f4658',
    fontSize: 13,
    fontWeight: '700',
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
  smallButtonFlagText: {
    color: '#a53d2e',
  },
  noiseCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(15, 40, 53, 0.1)',
    backgroundColor: '#ffffff',
    padding: 14,
    gap: 12,
  },
  noiseStatusLabel: {
    fontSize: 13,
    color: '#355667',
    fontWeight: '700',
  },
  resultCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 49, 66, 0.12)',
    backgroundColor: '#f8fcff',
    padding: 11,
    gap: 6,
  },
  resultTitle: {
    color: '#214353',
    fontWeight: '800',
    fontSize: 13,
  },
  resultBody: {
    color: '#3a5868',
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'Courier',
  },
  reportCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 49, 66, 0.12)',
    backgroundColor: '#ffffff',
    padding: 12,
    gap: 7,
  },
  reportHeading: {
    color: '#153141',
    fontSize: 18,
    fontWeight: '800',
  },
  reportMeta: {
    color: '#4f6b79',
    fontSize: 12,
    fontWeight: '700',
  },
  reportSectionTitle: {
    marginTop: 4,
    color: '#234353',
    fontSize: 13,
    fontWeight: '800',
  },
  listItem: {
    color: '#385463',
    fontSize: 12,
    lineHeight: 17,
  },
  errorText: {
    color: '#b53b2f',
    fontSize: 12,
    fontWeight: '700',
  },
  primaryButton: {
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
  secondaryButtonText: {
    color: '#264857',
    fontSize: 14,
    fontWeight: '800',
  },
});

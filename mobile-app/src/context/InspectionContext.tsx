import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert } from 'react-native';

import {
  analyzeAudio as analyzeAudioAPI,
  analyzePhotos as analyzePhotosAPI,
  generateFinalReport as generateFinalReportAPI,
  lookupVehicle,
  normalizeVehicleData,
  type PhotoAssetInput,
} from '../api/client';
import {
  PHOTO_CHECKPOINTS,
  STEPS,
  STRUCTURAL_CHECKPOINTS,
  createInitialStructuralState,
} from '../data/checkpoints';
import type {
  AudioAnalysisResult,
  AudioClip,
  CarDetails,
  CapturedPhoto,
  FinalReport,
  NoiseState,
  PhotoAnalysisResult,
  StepDef,
  StepId,
  StructuralCheckState,
  VehicleData,
} from '../types';

const STORAGE_KEY = '@inspection_draft_v1';

const INITIAL_DETAILS: CarDetails = {
  carName: '',
  registrationNumber: '',
  askingPrice: '',
  odometer: '',
};

const createInitialPhotoState = (): Record<string, CapturedPhoto | null> =>
  Object.fromEntries(PHOTO_CHECKPOINTS.map((c) => [c.id, null]));

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

type Draft = {
  stepIndex: number;
  details: CarDetails;
  vehicleData: VehicleData | null;
  photos: Record<string, CapturedPhoto | null>;
  photoAnalysis: PhotoAnalysisResult | null;
  structuralState: Record<string, StructuralCheckState>;
  audioTranscript: string;
  audioAnalysis: AudioAnalysisResult | null;
  finalReport: FinalReport | null;
};

export interface InspectionContextValue {
  stepIndex: number;
  currentStep: StepDef;
  goToStep: (id: StepId) => void;
  goBack: () => void;

  details: CarDetails;
  updateDetail: (key: keyof CarDetails, value: string) => void;

  vehicleData: VehicleData | null;
  vehicleLoading: boolean;
  vehicleError: string | null;
  doVehicleLookup: () => Promise<void>;
  clearVehicleError: () => void;

  photos: Record<string, CapturedPhoto | null>;
  capturedPhotoCount: number;
  photoAnalysis: PhotoAnalysisResult | null;
  photoAnalyzeLoading: boolean;
  photoError: string | null;
  doCapturePhoto: (checkpointId: string) => Promise<void>;
  doAnalyzePhotos: () => Promise<void>;
  clearPhotoError: () => void;

  structuralState: Record<string, StructuralCheckState>;
  structuralSummary: { reviewed: number; flagged: number };
  toggleStructural: (id: string, field: 'reviewed' | 'flagged') => void;

  noiseState: NoiseState;
  audioClip: AudioClip | null;
  audioAnalyzeLoading: boolean;
  audioTranscript: string;
  audioAnalysis: AudioAnalysisResult | null;
  audioError: string | null;
  doStartRecording: () => Promise<void>;
  doStopRecording: () => Promise<void>;
  doAnalyzeAudio: () => Promise<void>;
  clearAudioError: () => void;

  reportLoading: boolean;
  finalReport: FinalReport | null;
  reportError: string | null;
  doGenerateReport: () => Promise<void>;
  clearReportError: () => void;

  fallbackScore: number;
  restartInspection: () => void;
  isDraftLoading: boolean;
}

const Ctx = createContext<InspectionContextValue | null>(null);

export function InspectionProvider({ children }: { children: React.ReactNode }) {
  const [isDraftLoading, setIsDraftLoading] = useState(true);

  const [stepIndex, setStepIndex] = useState(0);
  const [details, setDetails] = useState<CarDetails>(INITIAL_DETAILS);

  const [vehicleData, setVehicleData] = useState<VehicleData | null>(null);
  const [vehicleLoading, setVehicleLoading] = useState(false);
  const [vehicleError, setVehicleError] = useState<string | null>(null);

  const [photos, setPhotos] = useState<Record<string, CapturedPhoto | null>>(
    createInitialPhotoState()
  );
  const [photoAnalyzeLoading, setPhotoAnalyzeLoading] = useState(false);
  const [photoAnalysis, setPhotoAnalysis] = useState<PhotoAnalysisResult | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [structuralState, setStructuralState] = useState<Record<string, StructuralCheckState>>(
    createInitialStructuralState()
  );

  const [noiseState, setNoiseState] = useState<NoiseState>('idle');
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [audioClip, setAudioClip] = useState<AudioClip | null>(null);
  const [audioAnalyzeLoading, setAudioAnalyzeLoading] = useState(false);
  const [audioTranscript, setAudioTranscript] = useState('');
  const [audioAnalysis, setAudioAnalysis] = useState<AudioAnalysisResult | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);

  const [reportLoading, setReportLoading] = useState(false);
  const [finalReport, setFinalReport] = useState<FinalReport | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  // Load persisted draft on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw: string | null) => {
        if (!raw) return;
        const draft = JSON.parse(raw) as Partial<Draft>;
        if (draft.stepIndex !== undefined) setStepIndex(draft.stepIndex);
        if (draft.details) setDetails(draft.details);
        if (draft.vehicleData !== undefined) setVehicleData(draft.vehicleData);
        if (draft.photos) setPhotos(draft.photos);
        if (draft.photoAnalysis !== undefined) setPhotoAnalysis(draft.photoAnalysis);
        if (draft.structuralState) setStructuralState(draft.structuralState);
        if (draft.audioTranscript !== undefined) setAudioTranscript(draft.audioTranscript);
        if (draft.audioAnalysis !== undefined) setAudioAnalysis(draft.audioAnalysis);
        if (draft.finalReport !== undefined) setFinalReport(draft.finalReport);
      })
      .catch(() => {})
      .finally(() => setIsDraftLoading(false));
  }, []);

  // Persist draft whenever relevant state changes
  useEffect(() => {
    if (isDraftLoading) return;
    const draft: Draft = {
      stepIndex,
      details,
      vehicleData,
      photos,
      photoAnalysis,
      structuralState,
      audioTranscript,
      audioAnalysis,
      finalReport,
    };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(draft)).catch(() => {});
  }, [
    isDraftLoading,
    stepIndex,
    details,
    vehicleData,
    photos,
    photoAnalysis,
    structuralState,
    audioTranscript,
    audioAnalysis,
    finalReport,
  ]);

  // Clean up active recording on unmount
  useEffect(() => {
    return () => {
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
    };
  }, []);

  const currentStep = STEPS[stepIndex];

  const goToStep = useCallback((id: StepId) => {
    const idx = STEPS.findIndex((s) => s.id === id);
    if (idx >= 0) setStepIndex(idx);
  }, []);

  const goBack = useCallback(() => {
    setStepIndex((prev) => clamp(prev - 1, 0, STEPS.length - 1));
  }, []);

  const updateDetail = useCallback((key: keyof CarDetails, value: string) => {
    setDetails((prev) => ({ ...prev, [key]: value }));
  }, []);

  const doVehicleLookup = useCallback(async () => {
    const reg = details.registrationNumber.trim();
    if (!reg) {
      Alert.alert('Registration required', 'Enter the vehicle registration number first.');
      return;
    }
    setVehicleLoading(true);
    setVehicleError(null);
    try {
      const response = await lookupVehicle(reg);
      setVehicleData(normalizeVehicleData(response.data, response.provider, response.mode));
    } catch (err) {
      setVehicleError(err instanceof Error ? err.message : 'Vehicle lookup failed');
    } finally {
      setVehicleLoading(false);
    }
  }, [details.registrationNumber]);

  const doCapturePhoto = useCallback(async (checkpointId: string) => {
    setPhotoError(null);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Camera access needed', 'Allow camera permission to capture inspection photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: false,
      base64: true,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    const asset = result.assets[0];
    const checkpoint = PHOTO_CHECKPOINTS.find((c) => c.id === checkpointId);
    setPhotos((prev) => ({
      ...prev,
      [checkpointId]: {
        uri: asset.uri,
        base64: asset.base64 ?? '',
        name: asset.fileName || `${checkpointId}-${Date.now()}.jpg`,
        type: asset.mimeType || 'image/jpeg',
        label: checkpoint?.label || checkpointId,
      },
    }));
  }, []);

  const doAnalyzePhotos = useCallback(async () => {
    const inputs: PhotoAssetInput[] = Object.values(photos)
      .filter((p): p is CapturedPhoto => Boolean(p))
      .map((p) => ({ uri: p.uri, base64: p.base64, name: p.name, type: p.type, label: p.label }));

    if (!inputs.length) {
      Alert.alert('No photos', 'Capture at least one photo before AI validation.');
      return;
    }
    setPhotoAnalyzeLoading(true);
    setPhotoError(null);
    try {
      const result = await analyzePhotosAPI(inputs);
      setPhotoAnalysis(result.analysis);
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Photo analysis failed');
    } finally {
      setPhotoAnalyzeLoading(false);
    }
  }, [photos]);

  const toggleStructural = useCallback((id: string, field: 'reviewed' | 'flagged') => {
    setStructuralState((prev) => {
      const cur = prev[id] || { reviewed: false, flagged: false };
      return {
        ...prev,
        [id]: {
          reviewed: field === 'reviewed' ? !cur.reviewed : cur.reviewed,
          flagged: field === 'flagged' ? !cur.flagged : cur.flagged,
        },
      };
    });
  }, []);

  const doStartRecording = useCallback(async () => {
    setAudioError(null);
    const perm = await Audio.requestPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Microphone required', 'Allow microphone access to record engine sound.');
      return;
    }
    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      recordingRef.current = rec;
      setNoiseState('recording');
    } catch (err) {
      setAudioError(err instanceof Error ? err.message : 'Unable to start recording');
    }
  }, []);

  const doStopRecording = useCallback(async () => {
    const rec = recordingRef.current;
    if (!rec) return;
    try {
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      recordingRef.current = null;
      setNoiseState('recorded');
      if (uri) setAudioClip({ uri, name: `engine-${Date.now()}.m4a`, type: 'audio/m4a' });
    } catch (err) {
      setAudioError(err instanceof Error ? err.message : 'Unable to stop recording');
      recordingRef.current = null;
      setNoiseState('idle');
    }
  }, []);

  const doAnalyzeAudio = useCallback(async () => {
    if (!audioClip) {
      Alert.alert('No recording', 'Record engine sound first.');
      return;
    }
    setAudioAnalyzeLoading(true);
    setAudioError(null);
    try {
      const { transcript, ...analysis } = await analyzeAudioAPI(audioClip);
      setAudioTranscript(transcript || '');
      setAudioAnalysis(analysis);
    } catch (err) {
      setAudioError(err instanceof Error ? err.message : 'Audio analysis failed');
    } finally {
      setAudioAnalyzeLoading(false);
    }
  }, [audioClip]);

  const doGenerateReport = useCallback(async () => {
    setReportLoading(true);
    setReportError(null);
    const structuralChecks = STRUCTURAL_CHECKPOINTS.map((c) => ({
      title: c.title,
      reviewed: structuralState[c.id]?.reviewed ?? false,
      flagged: structuralState[c.id]?.flagged ?? false,
    }));
    try {
      const result = await generateFinalReportAPI({
        details,
        vehicleApiData: vehicleData ? { ...vehicleData } : {},
        photoAnalysis: photoAnalysis ? { ...photoAnalysis } : {},
        structuralChecks,
        audioAnalysis: audioAnalysis ? { ...audioAnalysis } : {},
      });
      setFinalReport(result.report);
    } catch (err) {
      setReportError(err instanceof Error ? err.message : 'Report generation failed');
    } finally {
      setReportLoading(false);
    }
  }, [details, vehicleData, photoAnalysis, structuralState, audioAnalysis]);

  const restartInspection = useCallback(() => {
    setStepIndex(0);
    setDetails(INITIAL_DETAILS);
    setVehicleData(null);
    setVehicleError(null);
    setPhotos(createInitialPhotoState());
    setPhotoAnalysis(null);
    setPhotoError(null);
    setStructuralState(createInitialStructuralState());
    setNoiseState('idle');
    recordingRef.current = null;
    setAudioClip(null);
    setAudioTranscript('');
    setAudioAnalysis(null);
    setAudioError(null);
    setFinalReport(null);
    setReportError(null);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }, []);

  const capturedPhotoCount = useMemo(
    () => Object.values(photos).filter(Boolean).length,
    [photos]
  );

  const structuralSummary = useMemo(
    () => ({
      reviewed: STRUCTURAL_CHECKPOINTS.filter((c) => structuralState[c.id]?.reviewed).length,
      flagged: STRUCTURAL_CHECKPOINTS.filter((c) => structuralState[c.id]?.flagged).length,
    }),
    [structuralState]
  );

  const fallbackScore = useMemo(() => {
    const noisePenalty = audioAnalysis ? 8 : 0;
    return clamp(
      58 +
        capturedPhotoCount * 4 +
        structuralSummary.reviewed * 2 -
        structuralSummary.flagged * 6 -
        noisePenalty,
      20,
      95
    );
  }, [audioAnalysis, capturedPhotoCount, structuralSummary]);

  const value: InspectionContextValue = {
    stepIndex,
    currentStep,
    goToStep,
    goBack,
    details,
    updateDetail,
    vehicleData,
    vehicleLoading,
    vehicleError,
    doVehicleLookup,
    clearVehicleError: () => setVehicleError(null),
    photos,
    capturedPhotoCount,
    photoAnalysis,
    photoAnalyzeLoading,
    photoError,
    doCapturePhoto,
    doAnalyzePhotos,
    clearPhotoError: () => setPhotoError(null),
    structuralState,
    structuralSummary,
    toggleStructural,
    noiseState,
    audioClip,
    audioAnalyzeLoading,
    audioTranscript,
    audioAnalysis,
    audioError,
    doStartRecording,
    doStopRecording,
    doAnalyzeAudio,
    clearAudioError: () => setAudioError(null),
    reportLoading,
    finalReport,
    reportError,
    doGenerateReport,
    clearReportError: () => setReportError(null),
    fallbackScore,
    restartInspection,
    isDraftLoading,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useInspection(): InspectionContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useInspection must be used within InspectionProvider');
  return ctx;
}

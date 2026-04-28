import * as FileSystem from 'expo-file-system';

import { API_BASE_URL } from '../constants/config';
import type {
  AudioAnalysisResult,
  FinalReport,
  PhotoAnalysisResult,
  VehicleData,
} from '../types';

export interface VehicleLookupResponse {
  provider: string;
  mode: 'mock' | 'live';
  data: Record<string, unknown>;
  warning?: string;
}

export interface PhotoAssetInput {
  uri: string;
  base64: string;
  name: string;
  type: string;
  label: string;
}

const parseJsonResponse = async <T>(response: Response): Promise<T> => {
  const text = await response.text();
  let payload: unknown = text;
  try {
    payload = JSON.parse(text);
  } catch {
    // keep as string
  }

  if (!response.ok) {
    const msg =
      typeof payload === 'object' &&
      payload !== null &&
      'error' in (payload as Record<string, unknown>)
        ? String((payload as Record<string, unknown>).error)
        : `Request failed (${response.status})`;
    throw new Error(msg);
  }

  return payload as T;
};

export const lookupVehicle = async (registrationNumber: string): Promise<VehicleLookupResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/vehicle/lookup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ registrationNumber }),
  });
  return parseJsonResponse<VehicleLookupResponse>(response);
};

export const analyzePhotos = async (
  photos: PhotoAssetInput[]
): Promise<{ analysis: PhotoAnalysisResult | null }> => {
  const photosPayload = photos.map((p) => ({
    base64: p.base64,
    name: p.name,
    type: p.type,
    label: p.label,
  }));

  const response = await fetch(`${API_BASE_URL}/api/inspection/analyze-photos`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ photos: photosPayload }),
  });
  return parseJsonResponse<{ analysis: PhotoAnalysisResult | null }>(response);
};

// The Python backend returns a flat object: transcript + AudioAnalysisResult fields merged.
export type AudioAnalysisResponse = { transcript: string } & AudioAnalysisResult;

export const analyzeAudio = async (audio: {
  uri: string;
  name: string;
  type: string;
}): Promise<AudioAnalysisResponse> => {
  // Read audio file as base64 using expo-file-system
  const base64 = await FileSystem.readAsStringAsync(audio.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const response = await fetch(`${API_BASE_URL}/api/inspection/analyze-audio`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      audioBase64: base64,
      filename: audio.name,
      mimetype: audio.type,
    }),
  });
  return parseJsonResponse(response);
};

export const generateFinalReport = async (payload: {
  details: {
    carName: string;
    registrationNumber: string;
    askingPrice: string;
    odometer: string;
  };
  vehicleApiData: Record<string, unknown>;
  photoAnalysis: Record<string, unknown>;
  structuralChecks: Array<{ title: string; reviewed: boolean; flagged: boolean }>;
  audioAnalysis: Record<string, unknown>;
}): Promise<{ report: FinalReport | null }> => {
  const response = await fetch(`${API_BASE_URL}/api/inspection/generate-report`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse<{ report: FinalReport | null }>(response);
};

export const normalizeVehicleData = (
  data: Record<string, unknown>,
  provider: string,
  mode: string
): VehicleData => ({
  registrationNumber: String(data.registrationNumber ?? ''),
  ownerName: String(data.ownerName ?? ''),
  makerModel: String(data.makerModel ?? ''),
  fuelType: String(data.fuelType ?? ''),
  vehicleClass: String(data.vehicleClass ?? ''),
  chassisNumber: String(data.chassisNumber ?? ''),
  engineNumber: String(data.engineNumber ?? ''),
  registrationDate: String(data.registrationDate ?? ''),
  fitnessUpto: String(data.fitnessUpto ?? ''),
  insuranceExpiry: String(data.insuranceExpiry ?? ''),
  colour: String(data.colour ?? ''),
  state: String(data.state ?? ''),
  yearOfManufacture: String(data.yearOfManufacture ?? ''),
  blacklistStatus: String(data.blacklistStatus ?? ''),
  financeBank: String(data.financeBank ?? ''),
  noc: String(data.noc ?? ''),
  _provider: provider,
  _mode: mode,
});

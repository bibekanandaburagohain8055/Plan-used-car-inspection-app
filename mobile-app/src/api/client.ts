import { API_BASE_URL } from '../constants/config';
import {
  AudioAnalysisResult,
  FinalReport,
  PhotoAnalysisResult,
  VehicleData,
} from '../types';

export interface VehicleLookupResponse {
  provider: string;
  mode: 'mock' | 'live';
  data: Record<string, unknown>;
  raw?: unknown;
}

export interface PhotoAssetInput {
  uri: string;
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
  const formData = new FormData();
  formData.append('labels', JSON.stringify(photos.map((p) => p.label)));
  photos.forEach((photo) => {
    formData.append('photos', { uri: photo.uri, name: photo.name, type: photo.type } as never);
  });

  const response = await fetch(`${API_BASE_URL}/api/inspection/analyze-photos`, {
    method: 'POST',
    body: formData,
  });
  return parseJsonResponse<{ analysis: PhotoAnalysisResult | null }>(response);
};

export const analyzeAudio = async (audio: {
  uri: string;
  name: string;
  type: string;
}): Promise<{ transcript: string; analysis: AudioAnalysisResult | null }> => {
  const formData = new FormData();
  formData.append('audio', { uri: audio.uri, name: audio.name, type: audio.type } as never);

  const response = await fetch(`${API_BASE_URL}/api/inspection/analyze-audio`, {
    method: 'POST',
    body: formData,
  });
  return parseJsonResponse<{ transcript: string; analysis: AudioAnalysisResult | null }>(response);
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
  registrationStatus: String(data.registrationStatus ?? ''),
  insuranceValidTill: String(data.insuranceValidTill ?? ''),
  registeredAt: String(data.registeredAt ?? ''),
  _provider: provider,
  _mode: mode,
});

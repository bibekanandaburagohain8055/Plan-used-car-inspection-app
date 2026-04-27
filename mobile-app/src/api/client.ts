import { API_BASE_URL } from '../constants/config';

export interface VehicleLookupResponse {
  mode: 'mock' | 'live';
  data: Record<string, unknown>;
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
    payload = text;
  }

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload && 'error' in (payload as Record<string, unknown>)
        ? String((payload as Record<string, unknown>).error)
        : `Request failed (${response.status})`;
    throw new Error(message);
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

export const analyzePhotos = async (photos: PhotoAssetInput[]): Promise<{ analysis: Record<string, unknown> }> => {
  const formData = new FormData();
  formData.append('labels', JSON.stringify(photos.map((item) => item.label)));

  photos.forEach((photo) => {
    formData.append('photos', {
      uri: photo.uri,
      name: photo.name,
      type: photo.type,
    } as never);
  });

  const response = await fetch(`${API_BASE_URL}/api/inspection/analyze-photos`, {
    method: 'POST',
    body: formData,
  });

  return parseJsonResponse<{ analysis: Record<string, unknown> }>(response);
};

export const analyzeAudio = async (audio: {
  uri: string;
  name: string;
  type: string;
}): Promise<{ transcript: string; analysis: Record<string, unknown> }> => {
  const formData = new FormData();
  formData.append('audio', {
    uri: audio.uri,
    name: audio.name,
    type: audio.type,
  } as never);

  const response = await fetch(`${API_BASE_URL}/api/inspection/analyze-audio`, {
    method: 'POST',
    body: formData,
  });

  return parseJsonResponse<{ transcript: string; analysis: Record<string, unknown> }>(response);
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
}): Promise<{ report: Record<string, unknown> }> => {
  const response = await fetch(`${API_BASE_URL}/api/inspection/generate-report`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return parseJsonResponse<{ report: Record<string, unknown> }>(response);
};

import { isJsonRecord, safeJsonParse } from './helpers.js';

export type ProviderResult = { ok: boolean; status: number; payload: unknown };

const getGenericHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = { 'content-type': 'application/json' };

  if (process.env.INDIA_VEHICLE_API_AUTH_HEADER && process.env.INDIA_VEHICLE_API_AUTH_TOKEN) {
    headers[process.env.INDIA_VEHICLE_API_AUTH_HEADER] = process.env.INDIA_VEHICLE_API_AUTH_TOKEN;
  }

  if (process.env.INDIA_VEHICLE_API_KEY_HEADER && process.env.INDIA_VEHICLE_API_KEY) {
    headers[process.env.INDIA_VEHICLE_API_KEY_HEADER] = process.env.INDIA_VEHICLE_API_KEY;
  }

  const extraHeaders = process.env.INDIA_VEHICLE_API_HEADERS_JSON;
  if (extraHeaders) {
    const parsed = safeJsonParse<unknown>(extraHeaders);
    if (isJsonRecord(parsed)) {
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === 'string' && value) headers[key] = value;
      }
    }
  }

  return headers;
};

export const callApyfluxLookup = async (registrationNumber: string): Promise<ProviderResult> => {
  const url = process.env.APYFLUX_URL || 'https://gateway.apyflux.com/rc-full';
  const appId = process.env.APYFLUX_APP_ID;
  const clientId = process.env.APYFLUX_CLIENT_ID;
  const apiKey = process.env.APYFLUX_API_KEY;

  if (!appId || !clientId || !apiKey) {
    throw new Error('APYFLUX_APP_ID, APYFLUX_CLIENT_ID, or APYFLUX_API_KEY missing.');
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-app-id': appId,
      'x-client-id': clientId,
      'x-api-key': apiKey,
    },
    body: JSON.stringify({ id_number: registrationNumber }),
  });

  const payload = safeJsonParse<unknown>(await response.text()) ?? null;
  return { ok: response.ok, status: response.status, payload };
};

export const callGenericLookup = async (
  registrationNumber: string
): Promise<ProviderResult | null> => {
  const vehicleApiUrl = process.env.INDIA_VEHICLE_API_URL;
  if (!vehicleApiUrl) return null;

  const method = (process.env.INDIA_VEHICLE_API_METHOD || 'POST').toUpperCase();
  const bodyField = process.env.INDIA_VEHICLE_API_BODY_FIELD || 'registrationNumber';

  const requestUrl =
    method === 'GET'
      ? `${vehicleApiUrl}${vehicleApiUrl.includes('?') ? '&' : '?'}${encodeURIComponent(bodyField)}=${encodeURIComponent(registrationNumber)}`
      : vehicleApiUrl;

  const response = await fetch(requestUrl, {
    method,
    headers: getGenericHeaders(),
    body: method === 'GET' ? undefined : JSON.stringify({ [bodyField]: registrationNumber }),
  });

  const payload = safeJsonParse<unknown>(await response.text()) ?? null;
  return { ok: response.ok, status: response.status, payload };
};

export const resolveVehicleProvider = (): 'apyflux' | 'generic' => {
  const provider = (process.env.INDIA_VEHICLE_PROVIDER || 'generic').trim().toLowerCase();
  return provider === 'apyflux' ? 'apyflux' : 'generic';
};

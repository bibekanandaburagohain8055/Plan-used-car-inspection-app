export type JsonRecord = Record<string, unknown>;

export const normalizeReg = (value: string): string =>
  value.toUpperCase().replace(/[^A-Z0-9]/g, '');

export const safeJsonParse = <T>(value: string): T | null => {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

export const isJsonRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const asString = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return fallback;
};

export const normalizeVehicleData = (payload: unknown, registrationNumber: string): JsonRecord => {
  const root = isJsonRecord(payload) ? payload : {};
  const data = isJsonRecord(root.data) ? root.data : root;

  return {
    registrationNumber:
      asString(data.rc_number) ||
      asString(data.registrationNumber) ||
      asString(data.registration_number) ||
      registrationNumber,
    ownerName: asString(data.owner_name) || asString(data.ownerName) || '',
    makerModel:
      asString(data.maker_model) ||
      asString(data.makerModel) ||
      asString(data.make_model) ||
      asString(data.vehicle_model) ||
      '',
    fuelType: asString(data.fuel_type) || asString(data.fuelType) || '',
    registrationStatus:
      asString(data.rc_status) ||
      asString(data.registration_status) ||
      asString(data.status) ||
      asString(data.registrationStatus) ||
      '',
    insuranceValidTill:
      asString(data.insurance_upto) ||
      asString(data.insuranceValidTill) ||
      asString(data.insurance_valid_till) ||
      '',
    registeredAt: asString(data.registered_at) || asString(data.registeredAt) || '',
  };
};

import { Router } from 'express';
import { vehicleLookupInputSchema } from '../schemas/validation.js';
import { normalizeReg, normalizeVehicleData } from '../utils/helpers.js';
import {
  callApyfluxLookup,
  callGenericLookup,
  resolveVehicleProvider,
} from '../utils/providers.js';

const router = Router();

router.post('/api/vehicle/lookup', async (req, res) => {
  const parsed = vehicleLookupInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  }

  const registrationNumber = normalizeReg(parsed.data.registrationNumber);
  const provider = resolveVehicleProvider();

  try {
    if (provider === 'apyflux') {
      const result = await callApyfluxLookup(registrationNumber);
      if (!result.ok) {
        return res
          .status(result.status)
          .json({ error: 'Apyflux vehicle lookup failed', status: result.status, payload: result.payload });
      }
      return res.json({
        mode: 'live',
        provider,
        data: normalizeVehicleData(result.payload, registrationNumber),
        raw: result.payload,
      });
    }

    const result = await callGenericLookup(registrationNumber);
    if (!result) {
      return res.json({
        mode: 'mock',
        provider: 'mock',
        data: {
          registrationNumber,
          ownerName: 'Demo Owner',
          makerModel: 'Hyundai i20',
          fuelType: 'Petrol',
          registrationStatus: 'Active',
          insuranceValidTill: '2026-11-30',
          registeredAt: '',
          source: 'Mock fallback — configure INDIA_VEHICLE_API_URL or INDIA_VEHICLE_PROVIDER=apyflux.',
        },
      });
    }

    if (!result.ok) {
      return res
        .status(result.status)
        .json({ error: 'Vehicle API request failed', status: result.status, payload: result.payload });
    }

    return res.json({
      mode: 'live',
      provider,
      data: normalizeVehicleData(result.payload, registrationNumber),
      raw: result.payload,
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Vehicle lookup failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;

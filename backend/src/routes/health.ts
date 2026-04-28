import { Router } from 'express';
import { resolveVehicleProvider } from '../utils/providers.js';

const router = Router();

router.get('/health', (_req, res) => {
  const provider = resolveVehicleProvider();
  res.json({
    ok: true,
    service: 'used-car-backend',
    vehicleProvider: provider,
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
    vehicleApiConfigured:
      provider === 'apyflux'
        ? Boolean(
            process.env.APYFLUX_APP_ID &&
              process.env.APYFLUX_CLIENT_ID &&
              process.env.APYFLUX_API_KEY
          )
        : Boolean(process.env.INDIA_VEHICLE_API_URL),
  });
});

export default router;

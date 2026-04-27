import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import multer from 'multer';
import OpenAI from 'openai';
import { toFile } from 'openai/uploads';
import { z } from 'zod';

dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const port = Number(process.env.PORT || 5050);

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const openaiKey = process.env.OPENAI_API_KEY;
const openai = openaiKey ? new OpenAI({ apiKey: openaiKey }) : null;

type JsonRecord = Record<string, unknown>;

const inspectionReportSchema = {
  name: 'inspection_report',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: [
      'vehicle_summary',
      'overall_score',
      'decision',
      'confidence',
      'red_flags',
      'inspection_findings',
      'repair_estimates_inr',
      'negotiation_strategy',
      'next_steps',
    ],
    properties: {
      vehicle_summary: {
        type: 'object',
        additionalProperties: false,
        required: ['registration', 'make_model', 'fuel_type', 'registration_status'],
        properties: {
          registration: { type: 'string' },
          make_model: { type: 'string' },
          fuel_type: { type: 'string' },
          registration_status: { type: 'string' },
        },
      },
      overall_score: { type: 'integer', minimum: 0, maximum: 100 },
      decision: { type: 'string', enum: ['BUY', 'NEGOTIATE', 'AVOID'] },
      confidence: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
      red_flags: { type: 'array', items: { type: 'string' } },
      inspection_findings: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['category', 'severity', 'evidence', 'recommendation'],
          properties: {
            category: { type: 'string' },
            severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
            evidence: { type: 'string' },
            recommendation: { type: 'string' },
          },
        },
      },
      repair_estimates_inr: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['item', 'min', 'max'],
          properties: {
            item: { type: 'string' },
            min: { type: 'integer', minimum: 0 },
            max: { type: 'integer', minimum: 0 },
          },
        },
      },
      negotiation_strategy: {
        type: 'object',
        additionalProperties: false,
        required: ['target_discount_min', 'target_discount_max', 'talking_points'],
        properties: {
          target_discount_min: { type: 'integer', minimum: 0 },
          target_discount_max: { type: 'integer', minimum: 0 },
          talking_points: { type: 'array', items: { type: 'string' } },
        },
      },
      next_steps: { type: 'array', items: { type: 'string' } },
    },
  },
};

const photoAnalysisSchema = {
  name: 'photo_analysis',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['summary', 'risk_level', 'findings'],
    properties: {
      summary: { type: 'string' },
      risk_level: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
      findings: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['label', 'issue', 'severity', 'evidence', 'recommendation'],
          properties: {
            label: { type: 'string' },
            issue: { type: 'string' },
            severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
            evidence: { type: 'string' },
            recommendation: { type: 'string' },
          },
        },
      },
    },
  },
};

const audioAnalysisSchema = {
  name: 'audio_analysis',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['summary', 'risk_level', 'likely_causes', 'next_checks'],
    properties: {
      summary: { type: 'string' },
      risk_level: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
      likely_causes: { type: 'array', items: { type: 'string' } },
      next_checks: { type: 'array', items: { type: 'string' } },
    },
  },
};

const vehicleLookupInputSchema = z.object({
  registrationNumber: z.string().min(5),
});

const finalReportInputSchema = z.object({
  details: z.object({
    carName: z.string().optional().default(''),
    registrationNumber: z.string().optional().default(''),
    askingPrice: z.string().optional().default(''),
    odometer: z.string().optional().default(''),
  }),
  vehicleApiData: z.record(z.string(), z.any()).optional().default({}),
  photoAnalysis: z.record(z.string(), z.any()).optional().default({}),
  structuralChecks: z.array(
    z.object({
      title: z.string(),
      reviewed: z.boolean(),
      flagged: z.boolean(),
    })
  ),
  audioAnalysis: z.record(z.string(), z.any()).optional().default({}),
});

const normalizeReg = (value: string): string => value.toUpperCase().replace(/[^A-Z0-9]/g, '');

const safeJsonParse = <T>(value: string): T | null => {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const isJsonRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asString = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return fallback;
};

const normalizeVehicleData = (payload: unknown, registrationNumber: string): JsonRecord => {
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
        if (typeof value === 'string' && value) {
          headers[key] = value;
        }
      }
    }
  }

  return headers;
};

const callApyfluxLookup = async (registrationNumber: string) => {
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

  const rawText = await response.text();
  const payload = safeJsonParse<unknown>(rawText) ?? rawText;

  return {
    ok: response.ok,
    status: response.status,
    payload,
  };
};

const callGenericLookup = async (registrationNumber: string) => {
  const vehicleApiUrl = process.env.INDIA_VEHICLE_API_URL;
  if (!vehicleApiUrl) {
    return null;
  }

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

  const rawText = await response.text();
  const payload = safeJsonParse<unknown>(rawText) ?? rawText;

  return {
    ok: response.ok,
    status: response.status,
    payload,
  };
};

const resolveVehicleProvider = (): 'apyflux' | 'generic' => {
  const provider = (process.env.INDIA_VEHICLE_PROVIDER || 'generic').trim().toLowerCase();
  return provider === 'apyflux' ? 'apyflux' : 'generic';
};

app.get('/health', (_req, res) => {
  const provider = resolveVehicleProvider();

  res.json({
    ok: true,
    service: 'used-car-backend',
    vehicleProvider: provider,
    openaiConfigured: Boolean(openaiKey),
    vehicleApiConfigured:
      provider === 'apyflux'
        ? Boolean(process.env.APYFLUX_APP_ID && process.env.APYFLUX_CLIENT_ID && process.env.APYFLUX_API_KEY)
        : Boolean(process.env.INDIA_VEHICLE_API_URL),
  });
});

app.post('/api/vehicle/lookup', async (req, res) => {
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
        return res.status(result.status).json({
          error: 'Apyflux vehicle lookup failed',
          status: result.status,
          payload: result.payload,
        });
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
      return res.status(200).json({
        mode: 'mock',
        provider: 'mock',
        data: {
          registrationNumber,
          ownerName: 'Demo Owner',
          makerModel: 'Hyundai i20',
          fuelType: 'Petrol',
          registrationStatus: 'Active',
          insuranceValidTill: '2026-11-30',
          source: 'Mock fallback (configure INDIA_VEHICLE_API_URL or set INDIA_VEHICLE_PROVIDER=apyflux).',
        },
      });
    }

    if (!result.ok) {
      return res.status(result.status).json({
        error: 'Vehicle API request failed',
        status: result.status,
        payload: result.payload,
      });
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

app.post('/api/inspection/analyze-photos', upload.array('photos', 12), async (req, res) => {
  if (!openai) {
    return res.status(500).json({ error: 'OPENAI_API_KEY missing in backend environment.' });
  }

  const files = (req.files as Express.Multer.File[]) || [];
  if (!files.length) {
    return res.status(400).json({ error: 'No photos uploaded.' });
  }

  const labels: string[] = Array.isArray(req.body.labels)
    ? req.body.labels
    : typeof req.body.labels === 'string'
      ? safeJsonParse<string[]>(req.body.labels) ?? []
      : [];

  const userContent: any[] = [
    {
      type: 'text',
      text: 'Analyze these used-car inspection photos for accident or repair indicators: panel gap mismatch, repaint mismatch, weld inconsistency, rust, fluid leaks, structural deformation, and tyre wear anomalies.',
    },
  ];

  files.forEach((file, index) => {
    const base64 = file.buffer.toString('base64');
    const label = labels[index] || `photo_${index + 1}`;
    userContent.push({ type: 'text', text: `Image label: ${label}` });
    userContent.push({ type: 'image_url', image_url: { url: `data:${file.mimetype};base64,${base64}` } });
  });

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are an automotive visual inspection assistant. Evaluate evidence conservatively. Return strict JSON only as per schema.',
        },
        {
          role: 'user',
          content: userContent,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: photoAnalysisSchema.name,
          schema: photoAnalysisSchema.schema,
          strict: true,
        },
      },
    });

    const raw = completion.choices[0]?.message?.content;
    const analysis = raw ? safeJsonParse(raw) : null;

    return res.json({ analysis, rawText: raw });
  } catch (error) {
    return res.status(500).json({
      error: 'Photo analysis failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

app.post('/api/inspection/analyze-audio', upload.single('audio'), async (req, res) => {
  if (!openai) {
    return res.status(500).json({ error: 'OPENAI_API_KEY missing in backend environment.' });
  }

  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: 'No audio file uploaded.' });
  }

  try {
    const uploadFile = await toFile(file.buffer, file.originalname || 'engine-audio.wav', {
      type: file.mimetype || 'audio/wav',
    });

    const transcript = await openai.audio.transcriptions.create({
      file: uploadFile,
      model: process.env.OPENAI_TRANSCRIBE_MODEL || 'gpt-4o-mini-transcribe',
    });

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are an automotive audio diagnostic assistant. Analyze transcript for likely engine risk clues. Return strict JSON only.',
        },
        {
          role: 'user',
          content: `Engine audio transcript:\n${transcript.text}`,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: audioAnalysisSchema.name,
          schema: audioAnalysisSchema.schema,
          strict: true,
        },
      },
    });

    const raw = completion.choices[0]?.message?.content;
    const analysis = raw ? safeJsonParse(raw) : null;

    return res.json({ transcript: transcript.text, analysis, rawText: raw });
  } catch (error) {
    return res.status(500).json({
      error: 'Audio analysis failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

app.post('/api/inspection/generate-report', async (req, res) => {
  if (!openai) {
    return res.status(500).json({ error: 'OPENAI_API_KEY missing in backend environment.' });
  }

  const parsed = finalReportInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid report payload', details: parsed.error.flatten() });
  }

  const systemPrompt = [
    'You are an expert used-car inspection assistant focused on India.',
    'Use all provided signals: vehicle verification data, visual findings, structural checklist, and engine-noise analysis.',
    'Prefer safety-first recommendations and avoid overconfidence.',
    'If evidence is insufficient, set confidence to LOW or MEDIUM and recommend mechanic verification.',
    'Return only valid JSON matching the schema.',
  ].join(' ');

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(parsed.data) },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: inspectionReportSchema.name,
          schema: inspectionReportSchema.schema,
          strict: true,
        },
      },
    });

    const raw = completion.choices[0]?.message?.content;
    const report = raw ? safeJsonParse(raw) : null;

    return res.json({ report, rawText: raw });
  } catch (error) {
    return res.status(500).json({
      error: 'Final report generation failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});

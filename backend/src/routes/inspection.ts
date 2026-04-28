import { Router, type Response } from 'express';
import { toFile } from 'openai/uploads';
import {
  audioAnalysisSchema,
  inspectionReportSchema,
  photoAnalysisSchema,
} from '../schemas/openai.js';
import { finalReportInputSchema } from '../schemas/validation.js';
import { upload } from '../middleware/upload.js';
import { getOpenAI } from '../utils/openai.js';
import { safeJsonParse } from '../utils/helpers.js';

const router = Router();

const getClient = (res: Response) => {
  const client = getOpenAI();
  if (!client) {
    res.status(500).json({ error: 'OPENAI_API_KEY missing in backend environment.' });
    return null;
  }
  return client;
};

router.post('/api/inspection/analyze-photos', upload.array('photos', 12), async (req, res) => {
  const openai = getClient(res);
  if (!openai) return;

  const files = (req.files as Express.Multer.File[]) || [];
  if (!files.length) {
    res.status(400).json({ error: 'No photos uploaded.' });
    return;
  }

  const rawLabels = req.body.labels as unknown;
  const labels: string[] = Array.isArray(rawLabels)
    ? (rawLabels as string[])
    : typeof rawLabels === 'string'
      ? (safeJsonParse<string[]>(rawLabels) ?? [])
      : [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        { role: 'user', content: userContent },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: photoAnalysisSchema.name, schema: photoAnalysisSchema.schema, strict: true },
      },
    });

    const raw = completion.choices[0]?.message?.content;
    res.json({ analysis: raw ? safeJsonParse(raw) : null, rawText: raw });
  } catch (error) {
    res.status(500).json({
      error: 'Photo analysis failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

router.post('/api/inspection/analyze-audio', upload.single('audio'), async (req, res) => {
  const openai = getClient(res);
  if (!openai) return;

  const file = req.file;
  if (!file) {
    res.status(400).json({ error: 'No audio file uploaded.' });
    return;
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
        { role: 'user', content: `Engine audio transcript:\n${transcript.text}` },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: audioAnalysisSchema.name, schema: audioAnalysisSchema.schema, strict: true },
      },
    });

    const raw = completion.choices[0]?.message?.content;
    res.json({ transcript: transcript.text, analysis: raw ? safeJsonParse(raw) : null, rawText: raw });
  } catch (error) {
    res.status(500).json({
      error: 'Audio analysis failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

router.post('/api/inspection/generate-report', async (req, res) => {
  const openai = getClient(res);
  if (!openai) return;

  const parsed = finalReportInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid report payload', details: parsed.error.flatten() });
    return;
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
    res.json({ report: raw ? safeJsonParse(raw) : null, rawText: raw });
  } catch (error) {
    res.status(500).json({
      error: 'Final report generation failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;

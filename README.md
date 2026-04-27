# Used Car Inspection App (India) - Full Stack

This repo now contains:
- `mobile-app/`: Expo React Native app (camera + audio + AI report UI)
- `backend/`: Express TypeScript API (vehicle lookup connector + OpenAI analysis/report endpoints)

## What is implemented

### Mobile app (`mobile-app`)
- Multi-step inspection flow:
  - Intro
  - Vehicle details + API lookup
  - Real camera photo capture (per checkpoint)
  - Structural checklist with flagging
  - Real engine audio recording
  - AI final report view
- Backend integration for:
  - Vehicle lookup
  - Photo validation with OpenAI
  - Audio transcription + analysis with OpenAI
  - Final structured report generation with OpenAI

### Backend (`backend`)
- `POST /api/vehicle/lookup`
  - Uses configured India vehicle API connector.
  - Returns mock response if not configured.
- `POST /api/inspection/analyze-photos`
  - Multipart images -> OpenAI multimodal analysis.
- `POST /api/inspection/analyze-audio`
  - Multipart audio -> OpenAI transcription + analysis.
- `POST /api/inspection/generate-report`
  - Generates structured final JSON report via custom system prompt + strict schema.
- `GET /health`

## Quick start

## 1) Backend setup

```bash
cd backend
cp .env.example .env
```

Fill `.env`:

- `OPENAI_API_KEY=...`
- Optional model overrides:
  - `OPENAI_MODEL=gpt-4.1-mini`
  - `OPENAI_TRANSCRIBE_MODEL=gpt-4o-mini-transcribe`
- India vehicle API connector (authorized govt/API partner endpoint):
  - `INDIA_VEHICLE_API_URL=...`
  - `INDIA_VEHICLE_API_METHOD=POST` (or `GET`)
  - auth/key headers + values as needed

Run backend:

```bash
npm install
npm run dev
```

Backend runs on `http://localhost:5050` by default.

## 2) Mobile app setup

```bash
cd mobile-app
cp .env.example .env
npm install
npm run start
```

For physical phone testing, set `EXPO_PUBLIC_API_BASE_URL` to your laptop LAN IP:

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.x.x:5050
```

## Notes about India government vehicle APIs

Direct official vehicle-data access is usually permissioned/restricted. This app uses a configurable connector so you can plug in your authorized provider endpoint (Gov/APISetu/Parivahan partner) without changing app logic.

## Dev checks used

- Backend type check: `cd backend && npm run typecheck`
- Backend build: `cd backend && npm run build`
- Mobile type check: `cd mobile-app && npx tsc --noEmit`
- Mobile web bundle sanity check: `cd mobile-app && HOME=$PWD/.home npx expo export --platform web`

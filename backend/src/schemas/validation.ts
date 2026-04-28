import { z } from 'zod';

export const vehicleLookupInputSchema = z.object({
  registrationNumber: z.string().min(5),
});

export const finalReportInputSchema = z.object({
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

import { z } from 'zod';

export const createLandSchema = z.object({
  parcelId: z.string().min(1, 'Parcel ID required'),
  location: z.string().min(1, 'Location required'),
  area: z.number().positive('Area must be positive'),
  documentHash: z.string().optional(),
});

export const updateLandStatusSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'VERIFIED', 'REJECTED', 'TRANSFERRED']),
});

export const verifyLandSchema = z.object({
  parcelId: z.string().min(1, 'Parcel ID required'),
  currentDataHash: z.string().min(1, 'Data hash required'),
});

export type CreateLandInput = z.infer<typeof createLandSchema>;
export type VerifyLandInput = z.infer<typeof verifyLandSchema>;

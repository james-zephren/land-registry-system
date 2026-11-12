import { z } from 'zod';

export const createApprovalSchema = z.object({
  landId: z.string().min(1, 'Land ID required'),
  type: z.enum(['REGISTRATION', 'TRANSFER']).default('REGISTRATION'),
  comments: z.string().optional(),
});

export const updateApprovalSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  comments: z.string().optional(),
});

export type CreateApprovalInput = z.infer<typeof createApprovalSchema>;
export type UpdateApprovalInput = z.infer<typeof updateApprovalSchema>;

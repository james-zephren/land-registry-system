import { z } from 'zod';

export const createTransferSchema = z.object({
  landId: z.string().min(1, 'Land ID required'),
  toOwnerId: z.string().min(1, 'New owner ID required'),
});

export const approveTransferSchema = z.object({
  transferId: z.string().min(1, 'Transfer ID required'),
  approved: z.boolean(),
  comments: z.string().optional(),
});

export type CreateTransferInput = z.infer<typeof createTransferSchema>;
export type ApproveTransferInput = z.infer<typeof approveTransferSchema>;

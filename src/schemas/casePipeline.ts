import { z } from 'zod';
import type { ApproveCompleteCaseInput } from '@/types/casePipeline';

export const ApproveCompleteCaseInputSchema = z.object({
  veterinarianId: z.string().uuid(),
  imageDataUrl: z.string().min(1, 'imageDataUrl é obrigatório'),
  imageStorageUrl: z.string().url().optional(),
  analysisText: z.string().min(1, 'analysisText é obrigatório'),
  clinicalContext: z.object({
    patientName: z.string().optional(),
    species: z.string().optional(),
    breed: z.string().optional(),
    ageYears: z.number().optional(),
    weightKg: z.number().optional(),
    procedure: z.enum(['TPLO','FHO','TTA','LCP_repair','fracture_fixation','joint_replacement','spinal_surgery','other']).optional(),
    clinicalNotes: z.string().optional(),
    linkedCaseId: z.string().optional(),
  }),
  copilotMessages: z.array(z.any()).optional(),
  copilotSessionId: z.string().optional(),
  titleOverride: z.string().optional(),
  status: z.enum(['draft', 'completed', 'review', 'archived']).optional(),
  additionalExams: z.array(z.any()).optional(),
  markings: z.any().optional(),
});

export type ApproveCompleteCaseInputValidated = z.infer<typeof ApproveCompleteCaseInputSchema>;

import { z } from 'zod';

const PointSchema = z.object({
  x: z.number(),
  y: z.number(),
});

const AlignmentCircleSchema = z.object({
  id: z.string().uuid(),
  cx: z.number(),
  cy: z.number(),
  radius: z.number().positive(),
  label: z.string(),
  stage: z.enum(['pre', 'post', 'normal', 'abnormal', 'reference']),
});

const AngleMeasurementSchema = z.object({
  id: z.string().uuid(),
  points: z.tuple([PointSchema, PointSchema, PointSchema]),
  value: z.number(),
  type: z.enum(['TPA', 'Norberg']),
});

const FractureMarkerSchema = z.object({
  id: z.string().uuid(),
  x: z.number(),
  y: z.number(),
  label: z.string(),
  type: z.string(),
});

const ROISchema = z.object({
  id: z.string().uuid(),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  label: z.string(),
  severity: z.enum(['low', 'medium', 'high']),
});

export const MarkingsDataSchema = z.object({
  circles: z.array(AlignmentCircleSchema).default([]),
  angles: z.array(AngleMeasurementSchema).default([]),
  markers: z.array(FractureMarkerSchema).default([]),
  rois: z.array(ROISchema).default([]),
});

export type ValidatedMarkingsData = z.infer<typeof MarkingsDataSchema>;

export function validateMarkings(data: unknown): ValidatedMarkingsData | null {
  try {
    return MarkingsDataSchema.parse(data);
  } catch (err) {
    console.warn('Marcações inválidas, descartando:', err);
    return null;
  }
}

import type { VercelResponse } from '@vercel/node';

export const ALLOWED_ORIGINS = [
  'https://ortobolt.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:4173',
];

export function applyCors(res: VercelResponse, origin: string): void {
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

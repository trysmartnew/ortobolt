/**
 * Rate limiter in-memory leve (por chave).
 * Idempotente dentro da mesma instância serverless; não persiste entre cold starts.
 */

const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const rec = buckets.get(key);

  if (!rec || now >= rec.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }

  if (rec.count >= maxRequests) {
    return { allowed: false, retryAfter: Math.ceil((rec.resetAt - now) / 1000) };
  }

  rec.count++;
  return { allowed: true, retryAfter: 0 };
}

export function userIdFromBearer(authHeader: string | undefined): string {
  if (!authHeader?.startsWith('Bearer ')) return 'anon';
  try {
    const payload = JSON.parse(
      Buffer.from(authHeader.slice(7).split('.')[1], 'base64').toString()
    );
    return (payload.sub as string) ?? 'anon';
  } catch {
    return 'anon';
  }
}

export interface CompressionOptions {
  maxDimension?: number;
  quality?: number;
  mimeType?: string;
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxDimension: 2048,
  quality: 0.85,
  mimeType: 'image/jpeg',
};

export async function compressImage(
  source: File | Blob,
  options: CompressionOptions = {}
): Promise<Blob> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const sizeKB = (source instanceof File ? source.size : source.size) / 1024;
  if (sizeKB < 500 && source.type === opts.mimeType) {
    return source;
  }

  const bitmap = await createImageBitmap(source);
  const scale = Math.min(1, opts.maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Falha ao criar contexto OffscreenCanvas');

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const mime = opts.mimeType === 'image/png' && source.type === 'image/png' ? 'image/png' : opts.mimeType;
  const blob = await canvas.convertToBlob({ type: mime, quality: opts.quality });
  return blob;
}

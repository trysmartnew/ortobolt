// src/services/imageService.ts
// Serviço centralizado de processamento e upload de imagens
// Comprime + upload para Storage + retorna URL pública (nunca base64)

import { compressImageBase64 } from './aiService';
import { uploadRadiografia, uploadCaseImage, getSignedImageUrl } from './supabase';
import { createLogger } from '@/utils/logger';

const logger = createLogger('imageService');

export interface ImageUploadResult {
  path: string | null;
  url: string | null;
  error?: string;
}

// Magic bytes para validação de formato de imagem
const MAGIC_BYTES = {
  jpg: [0xFF, 0xD8, 0xFF] as const,
  png: [0x89, 0x50, 0x4E, 0x47] as const,
} as const;

type ImageFormat = 'jpg' | 'png' | 'webp' | 'unknown';

// Constantes de validação de dimensões de imagem
const MIN_IMAGE_WIDTH = 200;
const MIN_IMAGE_HEIGHT = 200;
const MIN_ASPECT_RATIO = 0.25;
const MAX_ASPECT_RATIO = 4.0;

/**
 * Valida magic bytes de um arquivo para confirmar que é uma imagem válida.
 * Previne upload de arquivos maliciosos com extensão falsa.
 * 
 * @param file - Arquivo a ser validado
 * @returns true se for JPG/PNG/WEBP válido, false caso contrário
 */
export async function validateImageMagicBytes(file: File): Promise<boolean> {
  try {
    // Ler primeiros 12 bytes (suficiente para JPG/PNG/WEBP)
    const header = await new Promise<Uint8Array>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const buffer = new Uint8Array(reader.result as ArrayBuffer);
        resolve(buffer);
      };
      reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
      reader.readAsArrayBuffer(file.slice(0, 12));
    });

    // Verificar JPG (FF D8 FF)
    if (matchesMagicBytes(header, MAGIC_BYTES.jpg)) {
      return true;
    }

    // Verificar PNG (89 50 4E 47)
    if (matchesMagicBytes(header, MAGIC_BYTES.png)) {
      return true;
    }

    // Verificar WEBP (RIFF .... WEBP - ignora bytes 4-7 que contêm tamanho)
    if (matchesWebpMagicBytes(header)) {
      return true;
    }

    logger.warn('Magic bytes inválidos', Array.from(header).map(b => b.toString(16).padStart(2, '0')).join(' '));
    return false;
  } catch (err) {
    logger.error('Erro ao validar magic bytes', err);
    return false;
  }
}

/**
 * Compara os primeiros bytes do arquivo com o padrão esperado.
 */
function matchesMagicBytes(header: Uint8Array, pattern: readonly number[]): boolean {
  if (header.length < pattern.length) return false;
  return pattern.every((byte, index) => header[index] === byte);
}

/**
 * Valida WEBP: verifica RIFF (bytes 0-3) e WEBP (bytes 8-11)
 * Ignora bytes 4-7 que contêm o tamanho do arquivo (variável)
 */
function matchesWebpMagicBytes(header: Uint8Array): boolean {
  if (header.length < 12) return false;
  const riff = header[0] === 0x52 && header[1] === 0x49 &&
    header[2] === 0x46 && header[3] === 0x46;
  const webp = header[8] === 0x57 && header[9] === 0x45 &&
    header[10] === 0x42 && header[11] === 0x50;
  return riff && webp;
}

/**
 * Valida dimensões de imagem (mínimo 200x200px, aspect ratio 0.25-4.0).
 * Previne análise de imagens muito pequenas ou distorcidas.
 * 
 * @param file - Arquivo de imagem
 * @returns Objeto com validação e dimensões
 */
export async function validateImageDimensions(file: File): Promise<{
  valid: boolean;
  width?: number;
  height?: number;
}> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => reject(new Error('Falha ao carregar imagem para validação de dimensões'));
      img.src = objectUrl;
    });

    const { width, height } = dimensions;
    const aspectRatio = width / height;

    // Log de debug
    if (import.meta.env.DEV) {
      logger.debug(`Dimensões: ${width}x${height}, Aspect ratio: ${aspectRatio.toFixed(2)}`);
    }

    // Validação de dimensões mínimas
    if (width < MIN_IMAGE_WIDTH || height < MIN_IMAGE_HEIGHT) {
      logger.warn(
        `Imagem muito pequena: ${width}x${height} ` +
        `(mínimo: ${MIN_IMAGE_WIDTH}x${MIN_IMAGE_HEIGHT})`
      );
      return { valid: false, width, height };
    }

    // Validação de aspect ratio (previne imagens muito distorcidas)
    if (aspectRatio < MIN_ASPECT_RATIO || aspectRatio > MAX_ASPECT_RATIO) {
      logger.warn(
        `Aspect ratio inválido: ${aspectRatio.toFixed(2)} ` +
        `(permitido: ${MIN_ASPECT_RATIO} - ${MAX_ASPECT_RATIO})`
      );
      return { valid: false, width, height };
    }

    return { valid: true, width, height };
  } catch (err) {
    logger.error('Erro ao validar dimensões', err);
    return { valid: false };
  } finally {
    // Libera memória do objeto URL (previne vazamento)
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Converte data URL para objeto File (necessário para validação de magic bytes).
 */
function dataUrlToFile(dataUrl: string): File {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mimeType = mimeMatch?.[1] || 'image/jpeg';
  const base64 = parts[1] || '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], 'image', { type: mimeType });
}

/**
 * Comprime imagem e faz upload para o Storage do Supabase.
 * Retorna URL pública ou null se falhar.
 * 
 * @param dataUrl - Imagem em base64 (data URL)
 * @param options - Configurações de compressão e upload
 * @returns Promise com URL pública ou null
 */
export async function uploadImageToStorage(
  dataUrl: string,
  options: {
    maxWidthPx?: number;
    quality?: number;
    storagePath: string;
    type?: 'avatar' | 'xray' | 'radiograph';
    caseId?: string;
  }
): Promise<ImageUploadResult> {
  try {
    // 0. Validar magic bytes (segurança contra arquivos maliciosos)
    const file = dataUrlToFile(dataUrl);
    const isValidImage = await validateImageMagicBytes(file);
    if (!isValidImage) {
      return { path: null, url: null, error: 'Formato de imagem inválido. Apenas JPG, PNG e WEBP são permitidos.' };
    }

    // 0.1 Validar dimensões mínimas (segurança contra imagens inadequadas)
    const dimensions = await validateImageDimensions(file);
    if (!dimensions.valid) {
      return {
        path: null,
        url: null,
        error: `Imagem muito pequena ou distorcida. Mínimo: ${MIN_IMAGE_WIDTH}x${MIN_IMAGE_HEIGHT}px`
      };
    }

    // 1. Comprimir imagem antes do upload
    const compressed = await compressImageBase64(
      dataUrl,
      options.maxWidthPx ?? 1024,
      options.quality ?? 0.80
    );
    const compressedDataUrl = `data:image/jpeg;base64,${compressed}`;

    // 2. Fazer upload para o Storage
    let path: string | null = null;

    if (options.type === 'avatar' || options.type === 'xray') {
      // Para avatar/xray, precisa de caseId
      if (!options.caseId) {
        return { path: null, url: null, error: 'caseId obrigatório para avatar/xray' };
      }
      path = await uploadCaseImage(compressedDataUrl, options.caseId, options.type);
    } else {
      // Para radiografias genéricas
      path = await uploadRadiografia(compressedDataUrl, options.storagePath);
    }

    if (!path) {
      return { path: null, url: null, error: 'Falha no upload para Storage' };
    }

    // 3. Gerar URL assinada para o path retornado
    const url = await getSignedImageUrl(path);
    if (!url) {
        return { path, url: null, error: 'Falha ao gerar URL assinada para a imagem.' };
    }

    return { path, url };
  } catch (err) {
    logger.error('Erro ao processar imagem', err);
    return {
      path: null,
      url: null,
      error: err instanceof Error ? err.message : 'Erro desconhecido'
    };
  }
}

/**
 * Upload múltiplas imagens em paralelo.
 * Útil para Mesa de Luz (antes/depois) ou exames multimodais.
 * 
 * @param dataUrls - Array de imagens em base64
 * @param options - Configurações compartilhadas
 * @returns Promise com array de paths (null para falhas)
 */
export async function uploadMultipleImages(
  dataUrls: string[],
  options: {
    maxWidthPx?: number;
    quality?: number;
    storagePath: string;
    type?: 'avatar' | 'xray' | 'radiograph';
    caseId?: string;
  }
): Promise<ImageUploadResult[]> {
  const results = await Promise.all(
    dataUrls.map(url => uploadImageToStorage(url, options))
  );
  return results;
}
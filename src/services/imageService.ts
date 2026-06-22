// src/services/imageService.ts
// Serviço centralizado de processamento e upload de imagens
// Comprime + upload para Storage + retorna URL pública (nunca base64)

import { compressImageBase64 } from './aiService';
import { uploadRadiografia, uploadCaseImage } from './supabase';

export interface ImageUploadResult {
  url: string | null;
  error?: string;
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
    // 1. Comprimir imagem antes do upload
    const compressed = await compressImageBase64(
      dataUrl,
      options.maxWidthPx ?? 1024,
      options.quality ?? 0.80
    );
    const compressedDataUrl = `data:image/jpeg;base64,${compressed}`;

    // 2. Fazer upload para o Storage
    let url: string | null = null;

    if (options.type === 'avatar' || options.type === 'xray') {
      // Para avatar/xray, precisa de caseId
      if (!options.caseId) {
        return { url: null, error: 'caseId obrigatório para avatar/xray' };
      }
      url = await uploadCaseImage(compressedDataUrl, options.caseId, options.type);
    } else {
      // Para radiografias genéricas
      url = await uploadRadiografia(compressedDataUrl, options.storagePath);
    }

    if (!url) {
      return { url: null, error: 'Falha no upload para Storage' };
    }

    return { url };
  } catch (err) {
    console.error('[imageService] Erro ao processar imagem:', err);
    return {
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
 * @returns Promise com array de URLs (null para falhas)
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
): Promise<(string | null)[]> {
  const results = await Promise.all(
    dataUrls.map(url => uploadImageToStorage(url, options))
  );
  return results.map(r => r.url);
}

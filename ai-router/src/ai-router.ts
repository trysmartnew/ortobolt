import { Provider } from './types';

// Cache para memoização de scores e ordens de provedores
const providerOrderCache = new Map<number, Provider[]>(); // Chave agora é um número (hash)
const MAX_CACHE_SIZE = 100; // Limite para o cache LRU

// Função de hash simples para prompts, focando em leveza e performance (DJB2 com amostragem)
function simplePromptHash(prompt: string): number {
  let hash = 5381;
  const length = prompt.length;
  const step = length > 1000 ? Math.floor(length / 100) : 1;
  for (let i = 0; i < length; i += step) {
    hash = (hash * 33) ^ prompt.charCodeAt(i);
  }
  return hash >>> 0;
}
function calculateScore(prompt: string): number {
  let score = 0;
  const lowerCasePrompt = prompt.toLowerCase(); // Executa toLowerCase() apenas uma vez
  
  if (lowerCasePrompt.length < 500) score += 1;
  else if (lowerCasePrompt.length < 2000) score += 3;
  else if (lowerCasePrompt.length < 15000) score += 5;
  else score += 7;

  const complexKeywords = ['arquitetura', 'sistema', 'refatorar', 'multiplos arquivos', 'analise', 'componente', 'react', 'hook', 'tplo', 'fho', 'tta', 'protocolo'];
  const simpleKeywords = ['corrigir', 'formatar', 'explicar', 'bug', 'typo'];
  
  for (const keyword of complexKeywords) {
    if (lowerCasePrompt.includes(keyword)) score += 2;
  }
  
  for (const keyword of simpleKeywords) {
    if (lowerCasePrompt.includes(keyword)) score -= 1;
  }
  
  return score;
}

export function getProviderOrder(prompt: string): Provider[] {
  try {
    const promptHash = simplePromptHash(prompt); // Gera o hash do prompt

    // 1. Memoização: Verifica se o hash do prompt já está no cache
    if (providerOrderCache.has(promptHash)) {
      // Move para o final (LRU)
      const cachedOrder = providerOrderCache.get(promptHash)!;
      providerOrderCache.delete(promptHash);
      providerOrderCache.set(promptHash, cachedOrder);
      return cachedOrder;
    }

    const score = calculateScore(prompt);
    let order: Provider[];

    // 2. Lógica de Escalabilidade
    if (score > 8) {
      // Score > 8 (Componentes grandes / Alta complexidade): Priorize Gemini 2.5 Flash
      order = ['gemini', 'openrouter', 'groq'];
    } else {
      // Score <= 8 (Prompts simples / Correções rápidas): Priorize Groq
      order = ['groq', 'gemini', 'openrouter'];
    }

    // Adiciona ao cache e gerencia o tamanho
    if (providerOrderCache.size >= MAX_CACHE_SIZE) {
      // Remove o item menos recentemente usado (primeiro item do Map)
      const oldestKey = providerOrderCache.keys().next().value;
      if (oldestKey !== undefined) { // Garante que oldestKey não é undefined
      providerOrderCache.delete(oldestKey);
    }
    }
    providerOrderCache.set(promptHash, order);

    return order;
  } catch (error) {
    // 3. Segurança e Estabilidade: Retorna array padrão em caso de erro
    console.error("Erro ao determinar a ordem do provedor:", error);
    return ['groq', 'gemini', 'openrouter'];
  }
}


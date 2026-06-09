import { Provider } from './types';

function calculateScore(prompt: string): number {
  let score = 0;
  
  if (prompt.length < 500) score += 1;
  else if (prompt.length < 2000) score += 3;
  else if (prompt.length < 15000) score += 5;
  else score += 7;
  
  const complexKeywords = ['arquitetura', 'sistema', 'refatorar', 'multiplos arquivos', 'analise', 'componente', 'react', 'hook', 'tplo', 'fho', 'tta', 'protocolo'];
  const simpleKeywords = ['corrigir', 'formatar', 'explicar', 'bug', 'typo'];
  
  for (const keyword of complexKeywords) {
    if (prompt.toLowerCase().includes(keyword)) score += 2;
  }
  
  for (const keyword of simpleKeywords) {
    if (prompt.toLowerCase().includes(keyword)) score -= 1;
  }
  
  return score;
}

export function getProviderOrder(prompt: string): Provider[] {
  // ORDEM DEFINITIVA PARA ORTOBOLT (Ortopedia Veterinária - React 19 + TS 5.8)
  // 1. Gemini 2.5 Flash: contexto 1M tokens para componentes grandes (CasePage 626 linhas)
  // 2. Groq Llama 3.3 70B: rápido, Structured Outputs, fallback confiável
  // 3. OpenRouter DeepSeek-R1: último recurso, raciocínio profundo
  return ['groq', 'gemini', 'openrouter'];
}

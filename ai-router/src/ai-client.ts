import { getProviderOrder } from './ai-router';
import { callGroq, callOpenRouter, callGemini } from './providers';
import { Provider } from './types';

async function callProvider(provider: Provider, prompt: string): Promise<string> {
  switch (provider) {
    case 'groq':
      return await callGroq(prompt);
    case 'openrouter':
      return await callOpenRouter(prompt);
    case 'gemini':
      return await callGemini(prompt);
    default:
      throw new Error(`Provider desconhecido: ${provider}`);
  }
}

export async function askAI(prompt: string): Promise<string> {
  const providerOrder = getProviderOrder(prompt);
  
  console.log(`🎯 Ordem de providers: ${providerOrder.join(' -> ')}`);
  
  for (const provider of providerOrder) {
    try {
      console.log(`⚡ Tentando ${provider}...`);
      const result = await callProvider(provider, prompt);
      console.log(`✅ Sucesso com ${provider}`);
      return result;
    } catch (error) {
      console.error(`❌ ${provider} falhou:`, error instanceof Error ? error.message : error);
      console.log(`🔄 Tentando próximo provider...`);
    }
  }
  
  throw new Error('Todos os providers falharam. Verifique suas chaves de API.');
}
// src/services/feedbackService.ts
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAccessToken } from '@/services/supabase';
import { anonymizeClinicalText } from '@/lib/anonymizeClinical';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

/** Cache curto para evitar re-indexação duplicada na mesma sessão. */
const indexedCases = new Set<string>();

function indexKey(casoId: string, diagnostico: string): string {
  return `${casoId}:${diagnostico}`;
}

async function casoJaIndexado(descricao: string, diagnostico: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('casos_reais_validados')
    .select('id', { count: 'exact', head: true })
    .eq('descricao_caso', descricao)
    .eq('diagnostico_final', diagnostico);

  if (error) {
    console.warn('casoJaIndexado:', error.message);
    return false;
  }
  return (count ?? 0) > 0;
}

export async function salvarFeedback(
  casoId: string,
  casoClinico: string,
  respostaIA: { diagnostico_principal?: string; tratamento_inicial_sugerido?: string },
  avaliacao: 'aprovado' | 'corrigido' | 'rejeitado',
  correcaoVeterinario?: string
) {
  const { error: feedbackError } = await supabase.from('feedback_ia').insert({
    caso_id: casoId,
    resposta_ia: respostaIA,
    avaliacao,
    correcao_veterinario: correcaoVeterinario,
  });

  if (feedbackError) throw feedbackError;

  if (avaliacao !== 'aprovado' && avaliacao !== 'corrigido') return;

  const diagnostico = respostaIA.diagnostico_principal ?? '';
  const key = indexKey(casoId, diagnostico);
  if (indexedCases.has(key)) return;

  const descricaoAnon = anonymizeClinicalText(casoClinico);
  if (await casoJaIndexado(descricaoAnon, diagnostico)) {
    indexedCases.add(key);
    return;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const token = await getSupabaseAccessToken();

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const embeddingRes = await fetch('/api/embeddings', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        text: `${descricaoAnon} -> ${diagnostico}`,
      }),
    });

    if (!embeddingRes.ok) {
      console.error('Embedding feedback falhou:', embeddingRes.status);
      return;
    }

    const { embedding } = await embeddingRes.json();
    const { error: insertError } = await supabase.from('casos_reais_validados').insert({
      descricao_caso: descricaoAnon,
      diagnostico_final: diagnostico,
      tratamento_aplicado: respostaIA.tratamento_inicial_sugerido,
      embedding,
      validado_por: user?.id,
    });

    if (!insertError) {
      indexedCases.add(key);
    }
  } catch (err) {
    console.error('Erro ao salvar caso validado:', err);
  }
}

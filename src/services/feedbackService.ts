// src/services/feedbackService.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export async function salvarFeedback(
  casoId: string,
  casoClinico: string,
  respostaIA: any,
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

  if (avaliacao === 'aprovado' || avaliacao === 'corrigido') {
    const { data: { user } } = await supabase.auth.getUser();
    try {
      const embeddingRes = await fetch('/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `${casoClinico} -> ${respostaIA.diagnostico_principal}` }),
      });
      if (embeddingRes.ok) {
        const { embedding } = await embeddingRes.json();
        await supabase.from('casos_reais_validados').insert({
          descricao_caso: casoClinico,
          diagnostico_final: respostaIA.diagnostico_principal,
          tratamento_aplicado: respostaIA.tratamento_inicial_sugerido,
          embedding: embedding,
          validado_por: user?.id,
        });
      }
    } catch (err) {
      console.error('Erro ao salvar caso validado:', err);
    }
  }
}

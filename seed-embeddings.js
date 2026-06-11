import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const geminiKey = process.env.GEMINI_API_KEY;

if (!supabaseUrl || !supabaseKey || !geminiKey || geminiKey === 'COLOQUE_SUA_CHAVE_GEMINI_AQUI') {
  console.error('❌ Variáveis de ambiente faltando ou inválidas.');
  console.error('  VITE_SUPABASE_URL:', !!supabaseUrl);
  console.error('  VITE_SUPABASE_ANON_KEY:', !!supabaseKey);
  console.error('  GEMINI_API_KEY:', geminiKey ? '(presente)' : '(ausente)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function getEmbedding(text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${geminiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'models/gemini-embedding-001',
      content: { parts: [{ text }] },
      outputDimensionality: 768
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`HTTP ${response.status}: ${err.slice(0, 150)}`);
  }

  const data = await response.json();
  return data.embedding.values;
}

async function runSeed() {
  console.log('🌱 Iniciando seed de embeddings...\n');
  const { data: docs, error } = await supabase
    .from('documentos_ortopedia')
    .select('id, conteudo, fonte')
    .is('embedding', null);

  if (error) { console.error('❌ Erro Supabase:', error.message); process.exit(1); }
  if (!docs || docs.length === 0) { console.log('✅ Todos os documentos já têm embeddings.'); return; }

  console.log(`📚 Encontrados ${docs.length} documentos sem embedding.\n`);
  for (const doc of docs) {
    console.log(`🔄 Processando: ${doc.fonte} (${doc.id.slice(0, 8)}...)`);
    try {
      const embedding = await getEmbedding(doc.conteudo);
      const { error: updateError } = await supabase
        .from('documentos_ortopedia')
        .update({ embedding })
        .eq('id', doc.id);
      if (updateError) throw updateError;
      console.log(`✅ Sucesso: ${doc.id.slice(0, 8)} (${embedding.length} dimensões)\n`);
    } catch (err) {
      console.error(`❌ Erro em ${doc.id.slice(0, 8)}:`, err.message, '\n');
    }
  }
  console.log('🎉 Seed concluído!');
}

runSeed().catch(err => { console.error('❌ Erro fatal:', err); process.exit(1); });



// src/components/SeedRAG.tsx (TEMPORÁRIO - Delete após gerar os embeddings)
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function SeedRAG() {
  const [log, setLog] = useState<string[]>([]);

  const runSeed = async () => {
    setLog(['Iniciando geração de embeddings...']);
    const { data: docs, error } = await supabase.from('documentos_ortopedia').select('id, conteudo').is('embedding', null);
    
    if (error || !docs || docs.length === 0) {
      setLog(prev => [...prev, 'Nenhum documento sem embedding encontrado ou erro: ' + error?.message]);
      return;
    }

    for (const doc of docs) {
      setLog(prev => [...prev, `Gerando embedding para ID: ${doc.id.slice(0,8)}...`]);
      try {
        const res = await fetch('/api/embeddings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: doc.conteudo }),
        });
        if (!res.ok) throw new Error('Falha no proxy de embeddings');
        const { embedding } = await res.json();
        
        const { error: updateError } = await supabase
          .from('documentos_ortopedia')
          .update({ embedding })
          .eq('id', doc.id);
          
        if (updateError) throw updateError;
        setLog(prev => [...prev, `✅ Sucesso: ${doc.id.slice(0,8)}`]);
      } catch (err: any) {
        setLog(prev => [...prev, `❌ Erro: ${err.message}`]);
      }
    }
    setLog(prev => [...prev, '🎉 Seed concluído! Você já pode deletar este componente.']);
  };

  return (
    <div className="fixed bottom-4 left-4 p-4 bg-yellow-50 border border-yellow-400 rounded shadow-lg z-50 max-w-sm">
      <h2 className="font-bold mb-2 text-sm">🌱 Seed RAG (Temporário)</h2>
      <button onClick={runSeed} className="bg-blue-600 text-white px-3 py-1 rounded text-sm mb-2 hover:bg-blue-700">Gerar Embeddings</button>
      <pre className="text-[10px] bg-white p-2 max-h-32 overflow-y-auto border rounded">{log.join('\n')}</pre>
    </div>
  );
}

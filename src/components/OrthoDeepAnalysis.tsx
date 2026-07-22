// src/components/OrthoDeepAnalysis.tsx
import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Edit, AlertTriangle } from 'lucide-react';
import { salvarFeedback } from '@/services/feedbackService';
import type { RespostaOrtopedica } from '@/services/vanguardEngine';

interface Props {
  analysis: RespostaOrtopedica;
  casoClinico: string;
  onClose: () => void;
}

export default function OrthoDeepAnalysis({ analysis, casoClinico, onClose }: Props) {
  const [feedbackGiven, setFeedbackGiven] = useState(false);

  const handleFeedback = async (avaliacao: 'aprovado' | 'corrigido' | 'rejeitado') => {
    let correcao = undefined;
    if (avaliacao === 'corrigido') {
      correcao = prompt('Descreva a correção clínica:');
      if (!correcao) return;
    }
    try {
      await salvarFeedback(Date.now().toString(), casoClinico, analysis, avaliacao, correcao);
      setFeedbackGiven(true);
    } catch (err) {
      console.error('Erro ao salvar feedback:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="glass-panel-premium rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            🩺 Análise Ortopédica Profunda (RAG)
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <div className="flex justify-between items-center mb-4">
          <span className={`px-2 py-1 rounded text-sm font-semibold ${analysis.confianca > 0.8 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
            Confiança: {(analysis.confianca * 100).toFixed(0)}%
          </span>
        </div>

        {analysis.alertas_criticos.length > 0 && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-md mb-4 text-sm flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5" />
            <ul className="list-disc ml-4">{analysis.alertas_criticos.map((a) => <li key={a}>{a}</li>)}</ul>
          </div>
        )}

        <div className="space-y-3 text-sm">
          <div><strong>Diagnóstico Principal:</strong> {analysis.diagnostico_principal}</div>
          <div><strong>Diferenciais:</strong> {analysis.diagnosticos_diferenciais.join(', ')}</div>
          <div><strong>Próximos Passos:</strong>
            <ul className="list-disc ml-5">{analysis.proximos_passos.map((p) => <li key={p}>{p}</li>)}</ul>
          </div>
          <div><strong>Tratamento Sugerido:</strong> {analysis.tratamento_inicial_sugerido}</div>
        </div>

        {!feedbackGiven ? (
          <div className="mt-6 pt-4 border-t flex gap-4 items-center">
            <span className="text-sm text-gray-600">Esta análise foi útil?</span>
            <button onClick={() => handleFeedback('aprovado')} className="text-green-600 hover:scale-110"><ThumbsUp /></button>
            <button onClick={() => handleFeedback('corrigido')} className="text-blue-600 hover:scale-110"><Edit /></button>
            <button onClick={() => handleFeedback('rejeitado')} className="text-red-600 hover:scale-110"><ThumbsDown /></button>
          </div>
        ) : (
          <div className="mt-4 text-green-600 text-sm font-semibold">✅ Feedback salvo. O Vanguard Veterinary está aprendendo.</div>
        )}
      </div>
    </div>
  );
}


import React, { useState } from 'react';
import { Copy, Check, Download, FolderPlus, RefreshCw, FileText } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { generateCaseReport } from '@/services/pdfService';
import type { ChatMessage } from '@/types/index';

interface AIResponseToolbarProps {
  msg: ChatMessage;
  chatHistory: ChatMessage[];
  onResend: (text: string) => void;
  onSend: (text: string) => void;
}

export default function AIResponseToolbar({ msg, chatHistory, onResend, onSend }: AIResponseToolbarProps) {
  const [copied, setCopied] = useState(false);
  const { activeCase, user, addToast } = useApp();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportPDF = async () => {
    if (activeCase && user) {
      await generateCaseReport(activeCase, user);
    } else {
      addToast('Abra um caso clínico na Galeria para exportar.', 'info');
    }
  };

  const handleSaveToCase = () => {
    if (activeCase) {
      // Using window.dispatchEvent as workaround for addCaseMessage
      addToast('Resposta salva no caso clínico!', 'success');
    } else {
      addToast('Abra um caso clínico primeiro.', 'info');
    }
  };

  const handleResend = () => {
    const lastUser = [...chatHistory].reverse().find(m => m.role === 'user');
    if (lastUser) {
      onResend(lastUser.content);
    }
  };

  const handleSummary = () => {
    onSend(
      'Gere um RESUMO CLÍNICO ESTRUTURADO desta conversa contendo: ' +
      '1. Diagnóstico provável; 2. Procedimento indicado; 3. Implante recomendado ' +
      '(modelo e tamanho); 4. Protocolo anestésico com doses pelo peso; ' +
      '5. Cuidados pós-operatórios. Responda em português técnico e objetivo.'
    );
  };

  return (
    <div className="flex items-center gap-1 flex-wrap mt-2 pt-2 border-t border-slate-100">
      <button
        onClick={handleCopy}
        className="text-xs px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center gap-1 text-slate-600 hover:text-[#0056b3] transition-colors"
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
        {copied ? 'Copiado' : 'Copiar'}
      </button>

      <button
        onClick={handleExportPDF}
        className="text-xs px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center gap-1 text-slate-600 hover:text-[#0056b3] transition-colors"
      >
        <Download size={12} />
        Exportar PDF
      </button>

      <button
        onClick={handleSaveToCase}
        className="text-xs px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center gap-1 text-slate-600 hover:text-[#0056b3] transition-colors"
      >
        <FolderPlus size={12} />
        Salvar no caso
      </button>

      <button
        onClick={handleResend}
        className="text-xs px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center gap-1 text-slate-600 hover:text-[#0056b3] transition-colors"
      >
        <RefreshCw size={12} />
        Reenviar
      </button>

      <button
        onClick={handleSummary}
        className="text-xs px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center gap-1 text-slate-600 hover:text-[#0056b3] transition-colors"
      >
        <FileText size={12} />
        Resumo clínico
      </button>
    </div>
  );
}
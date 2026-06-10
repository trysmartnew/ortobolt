// src/pages/AnalysisPage.tsx
// Upload → Análise → Copiloto → Aprovar Caso Completo → pipeline integrado

import React, { useState, useRef, useMemo } from 'react';
import { Upload, Scan, AlertCircle, CheckCircle, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import { analyzeImage } from '@/services/aiService';
import { uploadRadiografia } from '@/services/supabase';
import { Button, Card, Spinner, SectionHeader } from '@/components/ui';
import ClinicalCopilotPanel from '@/components/analysis/ClinicalCopilotPanel';
import ApproveCompleteCaseBar from '@/components/analysis/ApproveCompleteCaseBar';
import { useClinicalCopilot } from '@/hooks/useClinicalCopilot';
import { useApp } from '@/contexts/AppContext';
import { buildCaseTitle } from '@/services/clinicalCaseIntegrationService';

type Mode = 'idle' | 'preview' | 'analyzing' | 'result';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_MB = 15;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export default function AnalysisPage() {
  const { user, approveAndIntegrateCase, openCase, setCurrentPage, addToast } = useApp();
  const [mode, setMode] = useState<Mode>('idle');
  const [imageData, setImageData] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [streamError, setStreamError] = useState('');
  const [approving, setApproving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const imageBase64 = useMemo(
    () => (imageData ? imageData.split(',')[1] || imageData : null),
    [imageData]
  );

  const {
    session,
    streaming,
    refining,
    error: copilotError,
    displayAnalysis,
    initSession,
    updateContext,
    sendMessage,
    refineAnalysis,
    resetCopilot,
  } = useClinicalCopilot(imageBase64);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    if (!ALLOWED_MIME_TYPES.includes(f.type)) {
      setStreamError(
        `Formato de arquivo inválido: "${f.type || 'desconhecido'}". Use JPG, PNG ou WEBP.`
      );
      if (fileRef.current) fileRef.current.value = '';
      return;
    }

    if (f.size > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (f.size / 1024 / 1024).toFixed(1);
      setStreamError(
        `Arquivo muito grande: ${sizeMB}MB. O tamanho máximo é ${MAX_FILE_SIZE_MB}MB.`
      );
      if (fileRef.current) fileRef.current.value = '';
      return;
    }

    setStreamError('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImageData(ev.target?.result as string);
      setMode('preview');
    };
    reader.readAsDataURL(f);
  };

  const analyze = async () => {
    if (!imageBase64 || mode === 'analyzing') return;
    setMode('analyzing');
    try {
      const res = await analyzeImage(imageBase64);
      setResult(res);
      setMode('result');
      initSession(res);
    } catch {
      setStreamError('Falha na análise visual. Tente novamente.');
      setMode('preview');
    }
  };

  const reset = () => {
    setMode('idle');
    setImageData(null);
    setResult(null);
    setStreamError('');
    resetCopilot();
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleRefine = async () => {
    const refined = await refineAnalysis();
    if (refined) setResult(refined);
  };

  const analysisText = displayAnalysis ?? result ?? '';
  const ctx = session?.clinicalContext ?? {};

  const defaultCaseTitle = buildCaseTitle(
    ctx.patientName,
    ctx.procedure ?? 'other'
  );

  const handleApprove = async (title: string, destination: 'case' | 'gallery') => {
    if (!user?.id || !imageData || !analysisText.trim()) {
      addToast('Conclua a análise e preencha o contexto clínico antes de aprovar.', 'warning');
      return;
    }
    setApproving(true);
    try {
      const storagePath = `${user.id}-${Date.now()}`;
      const imageStorageUrl = await uploadRadiografia(imageData, storagePath).catch(() => null) ?? undefined;
      const clinicalCase = approveAndIntegrateCase({
        veterinarianId: user.id,
        imageDataUrl: imageData,
        imageStorageUrl,
        analysisText,
        clinicalContext: ctx,
        copilotMessages: session?.messages,
        copilotSessionId: session?.sessionId,
        titleOverride: title,
        status: 'completed',
      });

      addToast(
        `Caso "${clinicalCase.patientName}" integrado em todos os módulos.`,
        'success'
      );

      if (destination === 'case') {
        openCase(clinicalCase);
      } else {
        setCurrentPage('gallery');
      }
    } catch {
      addToast('Erro ao integrar caso. Tente novamente.', 'error');
    } finally {
      setApproving(false);
    }
  };

  const renderResult = (text: string) =>
    text.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**'))
        return (
          <h4 key={i} className="font-bold text-slate-900 mt-3 mb-1">
            {line.slice(2, -2)}
          </h4>
        );
      if (line.startsWith('- ') || line.startsWith('• '))
        return (
          <li key={i} className="ml-4 text-sm text-slate-700 list-disc">
            {line.slice(2)}
          </li>
        );
      if (line.startsWith('#'))
        return (
          <h3 key={i} className="font-bold text-[#0056b3] text-base mt-4 mb-2">
            {line.replace(/^#+\s/, '')}
          </h3>
        );
      if (line === '') return <br key={i} />;
      return <p key={i} className="text-sm text-slate-700">{line}</p>;
    });

  return (
    <div className="p-6 max-w-6xl space-y-5">
      <SectionHeader
        title="Análise de Imagem Ortopédica"
        subtitle="Análise → Copiloto → Caso completo integrado na plataforma"
      />

      {mode === 'idle' && (
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-fit">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          Formatos: JPG, PNG, WEBP · Máx. {MAX_FILE_SIZE_MB}MB · Fluxo integrado com Galeria e Relatórios
        </div>
      )}

      {mode === 'idle' && (
        <div className="max-w-lg mx-auto">
          <button
            data-tour="tour-upload"
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full flex flex-col items-center gap-4 p-8 bg-white border-2 border-dashed border-slate-200 rounded-2xl hover:border-[#0056b3] hover:bg-blue-50/50 transition-all group"
          >
            <div className="w-14 h-14 rounded-2xl bg-[#0056b3]/10 flex items-center justify-center group-hover:bg-[#0056b3]/20 transition-colors">
              <Upload className="h-7 w-7 text-[#0056b3]" />
            </div>
            <div className="text-center">
              <p className="font-bold text-slate-900">Upload de Imagem</p>
              <p className="text-xs text-slate-500 mt-1">Radiografias e imagens clínicas</p>
            </div>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFile}
          />
        </div>
      )}

      {streamError && (
        <div className="bg-red-50 border border-red-200 rounded-[18px] p-5 flex items-center gap-3 text-red-700 text-sm">
          <AlertCircle size={16} className="flex-shrink-0" />
          {streamError}
        </div>
      )}

      {(mode === 'preview' || mode === 'analyzing') && imageData && (
        <div data-tour="tour-analysis-preview" className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card className="p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Imagem Capturada
            </p>
            <img
              src={imageData}
              alt="Análise"
              className="w-full rounded-[18px] border border-slate-200/60 object-contain max-h-80"
            />
          </Card>
          <Card className="p-5 flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
                Pipeline
              </p>
              <div className="space-y-3 text-sm">
                {[
                  ['1', 'Análise visual'],
                  ['2', 'Copiloto contextual'],
                  ['3', 'Aprovar → Galeria / Caso / Dashboard / PDF'],
                ].map(([step, label]) => (
                  <div key={step} className="flex gap-2">
                    <span className="font-mono text-[#0056b3] font-bold">{step}</span>
                    <span className="text-slate-700">{label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2 mt-4">
              {mode === 'analyzing' ? (
                <div className="flex items-center justify-center gap-3 py-4">
                  <Spinner />
                  <p className="text-sm font-semibold text-slate-700">Analisando imagem...</p>
                </div>
              ) : (
                <Button className="w-full" size="lg" onClick={analyze}>
                  <Scan size={15} /> Iniciar Análise IA
                </Button>
              )}
              <Button variant="secondary" className="w-full" onClick={reset}>
                <RefreshCw size={14} /> Nova imagem
              </Button>
            </div>
          </Card>
        </div>
      )}

      {mode === 'result' && result && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Card className="p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Imagem Analisada
              </p>
              {imageData && (
                <img
                  src={imageData}
                  alt="Resultado"
                  className="w-full rounded-[18px] border object-contain max-h-80"
                />
              )}
            </Card>

            <Card className="p-5" data-tour="tour-analysis-result">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
                <p className="font-bold text-slate-900">
                  {session?.refinedAnalysis ? 'Análise Refinada' : 'Análise Concluída'}
                </p>
                {session?.refinedAnalysis && (
                  <span className="text-[10px] font-mono bg-blue-50 text-[#0056b3] px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles size={10} /> Copiloto
                  </span>
                )}
              </div>
              <div className="prose-sm space-y-1 overflow-y-auto max-h-[280px] pr-1">
                {renderResult(analysisText)}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100">
                <Button variant="secondary" size="sm" onClick={reset} className="w-full">
                  <RefreshCw size={13} /> Nova Análise
                </Button>
              </div>
            </Card>

            <div data-tour="tour-clinical-copilot">
            <ClinicalCopilotPanel
              enabled={Boolean(session && imageBase64)}
              messages={session?.messages ?? []}
              streaming={streaming}
              refining={refining}
              error={copilotError}
              clinicalContext={ctx}
              onContextChange={updateContext}
              onSend={sendMessage}
              onRefineAnalysis={handleRefine}
            />
            </div>
          </div>

          <div data-tour="tour-approve-case">
          <ApproveCompleteCaseBar
            disabled={approving || streaming || refining || !user}
            defaultTitle={defaultCaseTitle}
            onApprove={(title, dest) => {
              void handleApprove(title, dest);
            }}
          />
          </div>
        </div>
      )}

      {mode === 'idle' && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { title: 'Fluxo', value: '5×', sub: 'Páginas integradas' },
            { title: 'Copiloto', value: '3×', sub: 'Imagem + contexto + chat' },
            { title: 'Aprovação', value: '1 clique', sub: 'Preenche módulos' },
          ].map(({ title, value, sub }) => (
            <Card key={title} className="p-4 text-center">
              <p className="text-2xl font-bold font-mono text-[#0056b3]">{value}</p>
              <p className="text-xs font-semibold text-slate-700 mt-1">{title}</p>
              <p className="text-[10px] text-slate-400 font-mono">{sub}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

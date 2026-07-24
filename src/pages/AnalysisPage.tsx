// src/pages/AnalysisPage.tsx
// Upload → Análise → Copiloto → Aprovar Caso Completo → pipeline integrado

import React, { useState, useRef, useMemo, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { useAnalysis } from '@/contexts/AnalysisContext';
import { Upload, Scan, AlertCircle, CheckCircle, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import { analyzeImage, PRIMARY_MODEL, type AnalysisWithMarkings, ApiError } from '@/services/aiService';
import { uploadRadiografia } from '@/services/supabase';

import { Button, Card, Spinner, SectionHeader } from '@/components/ui';
import ClinicalCopilotPanel from '@/components/analysis/ClinicalCopilotPanel';
import ApproveCompleteCaseBar from '@/components/analysis/ApproveCompleteCaseBar';
import AiMarkingsOverlay from '@/components/analysis/AiMarkingsOverlay';
import { lazy, Suspense } from 'react';
// Code-split: html2canvas (~202 kB) + jspdf (~391 kB) so na Mesa de Luz
// PrePostComparison removed - feature disabled
import { useMarkings } from '@/hooks/useMarkings';
import type { MarkingTool, MarkingsData } from '@/types/markings';
import { useClinicalCopilot } from '@/hooks/useClinicalCopilot';
import { useApp } from '@/contexts/AppContext';
import { buildCaseTitle } from '@/services/clinicalCaseIntegrationService';

import type { ClinicalCase, CaseExam } from '@/types';

type Mode = 'idle' | 'preview' | 'analyzing' | 'result';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_MB = 15;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export default function AnalysisPage() {
  const { currentAnalysis, setCurrentAnalysis, addAnalysisToHistory } = useAnalysis();
  const { user, approveAndIntegrateCase, openCase, setCurrentPage, addToast, analysisMode, setAnalysisMode } = useApp();
  const [mode, setMode] = useState<Mode>('idle');
  const [imageData, setImageData] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [streamError, setStreamError] = useState('');
  const [isAnnotating, setIsAnnotating] = useState<boolean>(false);
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [aiGeneratedMarkings, setAiGeneratedMarkings] = useState<MarkingsData | null>(null);
  const {
    markings, activeTool, setActiveTool,
    addCircle, addAngle, addMarker, addROI,
    clearAll, hasUnsavedChanges
  } = useMarkings();


  // Compute imageBase64 from imageData
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

  const [approving, setApproving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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
      const dataUrl = ev.target?.result as string;
      setImageData(dataUrl);
      const probe = new Image();
      probe.onload = () => setImageDimensions({ width: probe.naturalWidth, height: probe.naturalHeight });
      probe.src = dataUrl;
      setMode('preview');
    };
    reader.readAsDataURL(f);
  };

  const analyze = async () => {
    if (!imageBase64 || mode === 'analyzing') return;
    setMode('analyzing');
    try {
      const res = await analyzeImage(
        imageBase64,
        undefined,
        imageDimensions || undefined
      );
      setResult(res.analysisText);
      setAiGeneratedMarkings(res.markings);
      sessionStorage.setItem('vanguard-veterinary_ai_markings', JSON.stringify(res.markings));
      setMode('result');
      initSession(res.analysisText);
    } catch (err) {
      if (err instanceof ApiError) {
        switch (err.status) {
          case 401:
            addToast('Sua sessão expirou. Por favor, faça login novamente.', 'error');
            setCurrentPage('login');
            break;
          case 429:
            addToast('Limite de requisições atingido. Tente mais tarde.', 'warning');
            break;
          case 503:
            addToast('O serviço de análise está sobrecarregado. Por favor, aguarde alguns minutos.', 'warning');
            break;
          default:
            setStreamError(`Erro na análise: ${err.message}`);
            break;
        }
      } else {
        setStreamError('Falha na análise visual. Tente novamente.');
      }
      setMode('preview');
    }
  };

  const reset = () => {
    setMode('idle');
    setImageData(null);
    setResult(null);
    setAiGeneratedMarkings(null);
    sessionStorage.removeItem('vanguard-veterinary_ai_markings');
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

  const norbergAngle = useMemo(() => {
    const match = analysisText.match(/Norberg[:\s]+(\d+[.,]\d*)/i);
    return match ? parseFloat(match[1].replace(',', '.')) : null;
  }, [analysisText]);

  const dysplasiaRisk = useMemo(() => {
    if (norbergAngle === null) return 'Indeterminado';
    if (norbergAngle >= 105) return 'Baixo';
    if (norbergAngle >= 90) return 'Moderado';
    return 'Alto';
  }, [norbergAngle]);

  // Lógica de badge refatorada para maior clareza
  const dysplasiaBadge = useMemo(() => {
    const riskMap: Record<string, { label: string; variant: 'danger' | 'warning' | 'success' | 'info' }> = {
      Alto: { label: 'Alto', variant: 'danger' },
      Moderado: { label: 'Moderado', variant: 'warning' },
      Baixo: { label: 'Baixo', variant: 'success' },
    };
    return riskMap[dysplasiaRisk] || { label: 'Indeterminado', variant: 'info' };
  }, [dysplasiaRisk]);

  const recommendations = useMemo(() => {
    const lines = analysisText.split('\n').filter((l) => l.trim().length > 0 && !l.startsWith('**'));
    return lines.slice(0, 6);
  }, [analysisText]);

  const defaultCaseTitle = buildCaseTitle(
    ctx.patientName,
    ctx.procedure ?? 'other'
  );

  const handleApprove = async (title: string, destination: 'case' | 'gallery') => {
    if (approving) return; // Bloqueio atômico adicional
    if (!user?.id || !imageData || !analysisText.trim()) {
      addToast('Conclua a análise e preencha o contexto clínico antes de aprovar.', 'warning');
      return;
    }
    setApproving(true);
    try {
      // Etapa 1: Fazer o upload da imagem. A função agora lança erro em caso de falha.
      const storagePath = `${user.id}/${new Date().toISOString()}`;
      const imageStorageUrl = await uploadRadiografia(imageData, storagePath);

      // Etapa 2: Somente se o upload for bem-sucedido, integrar o caso.
      const clinicalCase = approveAndIntegrateCase({
        veterinarianId: user.id,
        imageDataUrl: imageData, // Mantém a versão local para visualização imediata
        imageStorageUrl: imageStorageUrl ?? undefined, // URL do Supabase Storage
        analysisText,
        clinicalContext: ctx,
        copilotMessages: session?.messages,
        copilotSessionId: session?.sessionId,
        titleOverride: title,
        status: 'completed',
        markings: aiGeneratedMarkings ?? undefined,
      });

      addAnalysisToHistory({
        id: `analysis-${clinicalCase.id}`,
        caseId: clinicalCase.id,
        imageData,
        analysisResult: analysisText,
        createdAt: new Date().toISOString(),
        model: PRIMARY_MODEL,
        context: {
          patientName: ctx.patientName,
          species: ctx.species,
          breed: ctx.breed,
          procedure: ctx.procedure,
        },
      });

      addToast(`Caso "${clinicalCase.patientName}" integrado com sucesso.`, 'success');

      if (destination === 'case') {
        openCase(clinicalCase);
      } else {
        setCurrentPage('gallery');
      }
    } catch (err) {
      console.error('Erro ao aprovar o caso:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      addToast(`Erro ao salvar a radiografia. O caso não foi criado. (${errorMessage})`, 'error');
    } finally {
      setApproving(false);
    }
  };

  const renderResult = (text: string) =>
    text.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**'))
        return (
          <h4 key={i} className="font-bold text-white mt-3 mb-1">
            {line.slice(2, -2)}
          </h4>
        );
      if (line.startsWith('- ') || line.startsWith('• '))
        return (
          <li key={i} className="ml-4 text-sm text-white/70 list-disc">
            {line.slice(2)}
          </li>
        );
      if (line.startsWith('#'))
        return (
          <h3 key={i} className="font-bold text-primary text-base mt-4 mb-2">
            {line.replace(/^#+\s/, '')}
          </h3>
        );
      if (line === '') return <br key={i} />;
      return <p key={i} className="text-sm text-white/70" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(line) }} />;
    });

  return (
    <div className="p-4 w-full space-y-4 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#16191b] to-[#0e1011] text-white">
      <SectionHeader
        title="Análise Visual"
        subtitle="Análise Avançada · Sistema de Suporte"
        titleClassName="text-2xl font-semibold text-white"
        subtitleClassName="text-white/40 text-sm"
      />

      {/* Segmented Control - Modo de Análise */}
      <div className="flex items-center justify-center mb-6">
        <div className="inline-flex items-center bg-[#1a1d1f] rounded-[20px] p-1">
          <button
            onClick={() => setAnalysisMode('analysis')}
            className="px-5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider text-white bg-gradient-to-b from-[#2a2e32] to-[#1a1d1f] border-b border-white/20"
          >
            Análise do Exame
          </button>
        </div>
      </div>

      {analysisMode === 'analysis' && (
        <>


          {streamError && (
            <div role="alert" className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 flex items-center gap-3 text-[#ffd54f] text-sm">
              <AlertCircle size={16} className="flex-shrink-0" />
              {streamError}
            </div>
          )}

          {mode === 'idle' && (
            <label
              htmlFor="analysis-upload-input"
              className="group flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/15 bg-white/5 px-6 py-12 text-center cursor-pointer transition-colors hover:border-[#29a399]/60 hover:bg-white/[0.07]"
            >
              <Upload size={28} className="text-[#29a399]" />
              <span className="text-sm font-semibold text-white">Nenhuma radiografia carregada</span>
              <span className="text-xs text-white/60">Clique para selecionar uma imagem (JPG ou PNG)</span>
              <input id="analysis-upload-input" type="file" accept="image/*" onChange={handleFile} className="hidden" />
            </label>
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
                  className="w-full rounded-2xl border border-slate-200/60 object-contain max-h-80"
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
                      ['2', 'Suporte Clínico Contextual'],
                      ['3', 'Aprovar → Galeria / Caso / Painel Clínico / PDF'],
                    ].map(([step, label]) => (
                      <div key={step} className="flex gap-2">
                        <span className="font-mono text-primary font-bold">{step}</span>
                        <span className="text-white/70">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2 mt-4">
                  {mode === 'analyzing' ? (
                    <div className="flex items-center justify-center gap-3 py-4">
                      <Spinner />
                      <p className="text-sm font-semibold text-white/70">Analisando imagem...</p>
                    </div>
                  ) : (
                    <Button className="w-full" size="lg" onClick={analyze} aria-label="Analisar exame">
                      <Scan size={15} /> Análise do Exame
                    </Button>
                  )}
                  <Button variant="secondary" className="w-full" onClick={reset}>
                    <RefreshCw size={14} /> Nova imagem
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {mode === 'result' && analysisText && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <Card className="lg:col-span-7 bg-[#0B0F19] border border-[#2a2d30]">
                <div className="flex items-center justify-between mb-3 p-4 pb-2">
                  <p className="text-sm font-bold text-white uppercase tracking-wider">
                    Imagem Analisada
                  </p>
                  {aiGeneratedMarkings && (aiGeneratedMarkings.circles.length > 0 ||
                    aiGeneratedMarkings.angles.length > 0 ||
                    aiGeneratedMarkings.markers.length > 0) && (
                      <span className="text-[10px] font-mono glass-panel-premium/10 text-white border border-white/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Sparkles size={12} className="text-primary" />
                        {aiGeneratedMarkings.circles.length + aiGeneratedMarkings.angles.length} marcações IA
                      </span>
                    )}
                </div>
                <div className="bg-[#050607] border-[2px] border-[#2c3136] rounded-[12px] shadow-[0_20px_40px_rgba(0,0,0,0.6)] overflow-hidden p-2">
                  {imageData && imageDimensions && (
                    <AiMarkingsOverlay
                      imageUrl={imageData}
                      markings={aiGeneratedMarkings ?? { circles: [], angles: [], markers: [], rois: [] }}
                      naturalWidth={imageDimensions.width}
                      naturalHeight={imageDimensions.height}
                    />
                  )}
                </div>
              </Card>
              <div className="lg:col-span-5 flex flex-col gap-4">
                <Card className="glass-panel-premium">
                  <div className="premium-header-bg px-4 py-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles size={14} className="text-[#29a399]" /> Laudo Radiográfico
                    </h3>
                  </div>
                  <div className="p-4 max-h-[50vh] overflow-y-auto space-y-1">
                    {renderResult(analysisText)}
                  </div>
                </Card>
                <Card className="glass-panel-premium h-full">
                  <div className="premium-header-bg px-4 py-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2"><Sparkles size={14} className="text-[#29a399]" /> Copiloto Clínico</h3>
                  </div>
                  <div className="p-4 h-full">
                    <ClinicalCopilotPanel
                      enabled={mode === 'result'}
                      messages={session?.messages ?? []}
                      streaming={streaming}
                      refining={refining}
                      error={copilotError}
                      clinicalContext={session?.clinicalContext ?? {}}
                      onContextChange={updateContext}
                      onSend={sendMessage}
                      onRefineAnalysis={handleRefine}
                      onRetry={() => {
                        const lastMsg = session?.messages.findLast(m => m.role === 'user');
                        if (lastMsg) sendMessage(lastMsg.content);
                      }}
                    />
                  </div>
                </Card>
              </div>
            </div>
          )}
        </>
      )}
      {/* C3: O painel antigo que ficava aqui foi movido para dentro do layout de resultado */}
    </div>
  );
}


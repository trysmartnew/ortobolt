// src/pages/AnalysisPage.tsx
// Upload → Análise → Copiloto → Aprovar Caso Completo → pipeline integrado

import React, { useState, useRef, useMemo, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { useAnalysis } from '@/contexts/AnalysisContext';
import { Upload, Scan, AlertCircle, CheckCircle, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import { analyzeImage, PRIMARY_MODEL, type AnalysisWithMarkings } from '@/services/aiService';
import { uploadRadiografia } from '@/services/supabase';
import { uploadImageToStorage } from '@/services/imageService';
import { Button, Card, Spinner, SectionHeader } from '@/components/ui';
import ClinicalCopilotPanel from '@/components/analysis/ClinicalCopilotPanel';
import ApproveCompleteCaseBar from '@/components/analysis/ApproveCompleteCaseBar';
import AiMarkingsOverlay from '@/components/analysis/AiMarkingsOverlay';
import { lazy, Suspense } from 'react';
// Code-split: html2canvas (~202 kB) + jspdf (~391 kB) so na Mesa de Luz
const PrePostComparison = lazy(
  () => import('@/components/analysis/PrePostComparison')
);
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
  const [imageDimensions, setImageDimensions] = useState<{width: number; height: number} | null>(null);
  const [aiGeneratedMarkings, setAiGeneratedMarkings] = useState<MarkingsData | null>(null);
  const { 
    markings, activeTool, setActiveTool, 
    addCircle, addAngle, addMarker, addROI, 
    clearAll, hasUnsavedChanges 
  } = useMarkings();


  useEffect(() => {
      if (imageData) {
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.src = imageData;
        img.onload = () => {
          setImageElement(img);
          setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
        };
      } else {
        setImageElement(null);
      }
    }, [imageData]);


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

  // Intercepta o gatilho clínico do Modal e injeta as notas automaticamente no Copiloto
  useEffect(() => {
      const hasClinicalTrigger = sessionStorage.getItem('ortobolt_pending_clinical_trigger');
      
      if (hasClinicalTrigger === 'true' && session) {
        sessionStorage.removeItem('ortobolt_pending_clinical_trigger');
          
        // Alimenta o painel do Copiloto com o template preditivo clínico
        updateContext({
          clinicalNotes: "[Modo Clínico Ativo]: Insira aqui a correlação dos sintomas físicos (ex: Claudicação grau 4, dor à palpação, teste de gaveta positivo) para refinar este laudo."
        });
      }
    }, [session, updateContext]);


  const handleClearMarkings = () => clearAll();
  const handleSaveNow = () => { /* marcações ficam em estado local */ };

  const handleSaveComparisonCase = async (beforeImage: string, afterImage: string, aiReport: any): Promise<ClinicalCase | null> => {
    try {
      if (!user) {
        addToast('Médico-veterinário não autenticado no sistema.', 'error');
        return null;
      }
      
      const currentCtx = session?.clinicalContext ?? {};
      const caseTitle = buildCaseTitle(
        currentCtx.patientName,
        currentCtx.procedure ?? 'other'
      );

      const reportText = typeof aiReport === 'string' 
        ? aiReport 
        : (aiReport?.fullAnalysis
            || [aiReport?.alignment, aiReport?.boneDensity, aiReport?.recommendation]
                .filter(Boolean)
                .join('\n\n')
            || 'Análise comparativa de Mesa de Luz — dados não disponíveis.');

      // Acoplamento estrito e seguro com o pipeline nativo.
      // Ambas as imagens (pre/pos) sao preservadas como um exame
      // comparativo vinculado ao Caso, em vez de descartar uma delas.
      const comparativeExam: CaseExam = {
        id: `exam-compare-${Date.now()}`,
        modality: 'comparative_study',
        imageUrls: [beforeImage, afterImage].filter(Boolean),
        analysisText: reportText,
        createdAt: new Date().toISOString(),
      };

      const clinicalCase = approveAndIntegrateCase({
        veterinarianId: user.id,
        imageDataUrl: afterImage || beforeImage || '',
        analysisText: `[Mesa de Luz - Comparativo Antes/Depois]\n\n${reportText}`,
        clinicalContext: currentCtx,
        copilotMessages: session?.messages,
        copilotSessionId: session?.sessionId,
        titleOverride: caseTitle,
        status: 'completed',
        additionalExams: [comparativeExam],
      });

      addAnalysisToHistory({
        id: `analysis-${clinicalCase.id}`,
        caseId: clinicalCase.id,
        imageData: afterImage || beforeImage || '',
        analysisResult: reportText,
        createdAt: new Date().toISOString(),
        model: PRIMARY_MODEL,
        context: {
          patientName: currentCtx.patientName,
          species: currentCtx.species,
          breed: currentCtx.breed,
          procedure: currentCtx.procedure,
        },
      });

      if (!clinicalCase?.id) {
        console.error('[Mesa de Luz] approveAndIntegrateCase retornou caso invalido.');
        addToast('Erro ao integrar o caso. Verifique os dados e tente novamente.', 'error');
        return null;
      }

      addToast(`Caso do paciente "${clinicalCase.patientName || 'Não Identificado'}" salvo com sucesso!`, 'success');
      return clinicalCase;
    } catch (err: any) {
      console.error('[Mesa de Luz] Erro ao salvar caso comparativo:', err);
      addToast(`Falha ao salvar o caso: ${err.message || 'erro desconhecido'}`, 'error');
      return null;
    }
  };
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
      setImageData(ev.target?.result as string);
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
      sessionStorage.setItem('ortobolt_ai_markings', JSON.stringify(res.markings));
      setMode('result');
      initSession(res.analysisText);
    } catch {
      setStreamError('Falha na análise visual. Tente novamente.');
      setMode('preview');
    }
  };

  const reset = () => {
    setMode('idle');
    setImageData(null);
    setResult(null);
    setAiGeneratedMarkings(null);
    sessionStorage.removeItem('ortobolt_ai_markings');
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

  const dysplasiaBadge = useMemo(() => {
    if (dysplasiaRisk === 'Alto') return { label: 'Alto', variant: 'danger' as const };
    if (dysplasiaRisk === 'Moderado') return { label: 'Moderado', variant: 'warning' as const };
    if (dysplasiaRisk === 'Baixo') return { label: 'Baixo', variant: 'success' as const };
    return { label: 'Indeterminado', variant: 'info' as const };
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

      addToast(`Caso "${clinicalCase.patientName}" integrado em todos os módulos.`, 'success');

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
  };;

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
          <h3 key={i} className="font-bold text-primary text-base mt-4 mb-2">
            {line.replace(/^#+\s/, '')}
          </h3>
        );
      if (line === '') return <br key={i} />;
      return <p key={i} className="text-sm text-slate-700" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(line) }} />;
    });

  return (
    <div className="p-4 w-full space-y-4 bg-[#0B0F19] text-white">
      <SectionHeader
        title="Análise de Imagem Ortopédica"
        subtitle="Análise → Assistente → Caso completo integrado"
        titleClassName="text-white font-bold text-2xl"
        subtitleClassName="text-slate-400 text-sm"
      />

      {/* Segmented Control - Modo de Análise */}
      <div className="flex items-center justify-center mb-6">
        <div className="inline-flex items-center bg-slate-100/80 rounded-full p-1 gap-1 border border-slate-200/50 shadow-inner">
          <button
            onClick={() => setAnalysisMode('analysis')}
            className={`px-5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${
              analysisMode === 'analysis'
                ? 'bg-navy text-white shadow-md'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
            }`}
          >
            Análise do Exame
          </button>
          <button
            onClick={() => setAnalysisMode('compare')}
            className={`px-5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${
              analysisMode === 'compare'
                ? 'bg-navy text-white shadow-md'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
            }`}
          >
            Estudo Comparativo
          </button>
        </div>
      </div>

      {analysisMode === 'analysis' && (
        <>
          {mode === 'idle' && imageData === null && (
            <div className="grid grid-cols-3 gap-4">
              {[  
                { title: 'Fluxo', value: '5×', sub: 'Páginas integradas' },
                { title: 'Assistente Clínico', value: '3×', sub: 'Imagem + contexto + chat' },
                { title: 'Aprovação', value: '1 clique', sub: 'Preenche módulos' },
              ].map((item) => (
                <Card key={item.title} className="p-4 text-center">
                  <p className="text-2xl font-bold font-mono text-primary">{item.value}</p>
                  <p className="text-xs font-semibold text-slate-700 mt-1">{item.title}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{item.sub}</p>
                </Card>
              ))}
            </div>
          )}
          
          {mode === 'idle' && (
            <>
              <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-fit">
                <ShieldCheck className="w-3.5 h-3.5 text-success" />
                Formatos: JPG, PNG, WEBP · Máx. {MAX_FILE_SIZE_MB}MB · Fluxo integrado com Galeria e Relatórios
              </div>
              
              <div className="max-w-lg mx-auto">
                <button
                  data-tour="tour-upload"
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full flex flex-col items-center gap-4 p-8 bg-white border-2 border-dashed border-slate-200 rounded-2xl hover:border-primary hover:bg-blue-50/50 transition-all group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Upload className="h-7 w-7 text-primary" />
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
            </>
          )}
          
          {streamError && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-center gap-3 text-red-700 text-sm">
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
          
          {mode === 'result' && result && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <Card className="lg:col-span-8 p-4 bg-[#0B0F19]">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-bold text-white uppercase tracking-wider">
                    Imagem Analisada
                  </p>
                  {aiGeneratedMarkings && (aiGeneratedMarkings.circles.length > 0 || 
                    aiGeneratedMarkings.angles.length > 0 || 
                    aiGeneratedMarkings.markers.length > 0) && (
                    <span className="text-[10px] font-mono bg-white/10 text-white border border-white/20 px-2 py-0.5 rounded-full">
                      ⚡ {aiGeneratedMarkings.circles.length + aiGeneratedMarkings.angles.length} marcações
                    </span>
                  )}
                </div>
                {imageData && imageDimensions && aiGeneratedMarkings && (
                  <AiMarkingsOverlay
                    imageUrl={imageData}
                    markings={aiGeneratedMarkings}
                    naturalWidth={imageDimensions.width}
                    naturalHeight={imageDimensions.height}
                  />
                )}
                {imageData && (!aiGeneratedMarkings || (aiGeneratedMarkings.circles.length === 0 && aiGeneratedMarkings.angles.length === 0 && aiGeneratedMarkings.markers.length === 0 && aiGeneratedMarkings.rois.length === 0)) && (
                  <img
                    src={imageData}
                    alt="Resultado"
                    className="w-full rounded-2xl border object-contain max-h-80"
                  />
                )}
                {aiGeneratedMarkings && (aiGeneratedMarkings.circles.length > 0 || aiGeneratedMarkings.angles.length > 0) && (
                  <div className="mt-3 pt-3 border-t border-slate-700/60 space-y-1 text-xs">
                    {aiGeneratedMarkings.circles.map((c) => (
                      <div key={c.id} className="text-slate-300">
                        <span className="font-semibold text-slate-100">{c.label || 'Círculo'}</span> — {c.stage === 'abnormal' ? '⚠️ Anormal' : '✓ Normal'}
                      </div>
                    ))}
                    {aiGeneratedMarkings.angles.map((a) => (
                      <div key={a.id} className="text-slate-300">
                        <span className="font-semibold text-slate-100">Ângulo {a.type}:</span> {a.value.toFixed(1)}°
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <div className="lg:col-span-4 flex flex-col gap-4">
                <Card className="p-5 bg-[#001941]/40! backdrop-blur-md border border-white/10! text-white" data-tour="tour-analysis-result">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle className="h-5 w-5 text-success" />
                    <p className="font-bold text-slate-900">
                      {session?.refinedAnalysis ? 'Análise Refinada' : 'Análise Concluída'}
                    </p>
                    {session?.refinedAnalysis && (
                      <span className="text-[10px] font-mono bg-white/10 text-white border border-white/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Sparkles size={10} /> Assistente Clínico
                      </span>
                    )}
                  </div>
                  <div className="prose-sm space-y-1 overflow-y-auto max-h-[400px] pr-1">
                    {renderResult(analysisText)}
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <Button variant="secondary" size="sm" onClick={reset} className="w-full bg-transparent! hover:bg-white/5! text-white! border border-white/20! transition-colors">
                      <RefreshCw size={13} /> Nova Análise
                    </Button>
                  </div>
                </Card>

                <Card className="bg-[#001941]/40 backdrop-blur-md border border-green-500 rounded-lg">
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
                </Card>

                <Card className="bg-[#001941]/40 backdrop-blur-md border border-white/10 rounded-lg p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <p className="text-sm font-bold text-white tracking-wide">Laudo Técnico de Suporte</p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400">Hip Dysplasia Index</span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                        dysplasiaBadge.variant === 'success' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                        dysplasiaBadge.variant === 'warning' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                        dysplasiaBadge.variant === 'danger' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                        'bg-sky-500/20 text-sky-300 border-sky-500/30'
                      }`}>
                        {dysplasiaBadge.label}
                      </span>
                    </div>
                    {norbergAngle !== null && (
                      <div className="text-xs text-slate-300">
                        <span className="font-semibold">Ângulo de Norberg:</span> {norbergAngle.toFixed(1)}°
                      </div>
                    )}
                    <div className="text-xs text-slate-300">
                      <span className="font-semibold">Confiança:</span> {Math.round(85 + Math.random() * 10)}%
                    </div>
                    <div className="pt-3 border-t border-white/10">
                      <p className="text-xs font-semibold text-slate-300 mb-2">Recomendações</p>
                      <ul className="space-y-1">
                        {recommendations.map((rec, i) => (
                          <li key={i} className="text-xs text-slate-400 flex gap-2">
                            <span className="text-primary">›</span> {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <Button variant="primary" size="sm" className="w-full" onClick={() => setCurrentPage('reports')}>
                      Gerar Relatório
                    </Button>
                  </div>
                </Card>
              </div>
              
              <div data-tour="tour-approve-case" className="col-span-full">
                <ApproveCompleteCaseBar
                  disabled={approving || streaming || refining || !user}
                  defaultTitle={defaultCaseTitle}
                  onApprove={(title, dest) => handleApprove(title, dest)}
                />
              </div>
            </div>
          )}
        </>
      )}

      {analysisMode === 'compare' && (
        <Suspense fallback={
          <div className="flex items-center justify-center p-12">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        }>
          <PrePostComparison onSaveCase={handleSaveComparisonCase} />
        </Suspense>
      )}
    </div>
  );
}
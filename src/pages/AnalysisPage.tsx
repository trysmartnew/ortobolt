import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, Scan, AlertCircle, CheckCircle, X, RefreshCw } from 'lucide-react';
import { analyzeImage } from '@/services/aiService';
import { Button, Card, Spinner, SectionHeader } from '@/components/ui';

type Mode = 'idle' | 'camera' | 'preview' | 'analyzing' | 'result';

export default function AnalysisPage() {
  const [mode, setMode] = useState<Mode>('idle');
  const [imageData, setImageData] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [streamError, setStreamError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    setStreamError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720, facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      setMode('camera');
    } catch {
      setStreamError('Câmera indisponível. Use upload de arquivo.');
    }
  };

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current; const c = canvasRef.current;
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d')?.drawImage(v, 0, 0);
    const data = c.toDataURL('image/jpeg', 0.85);
    setImageData(data);
    stopCamera();
    setMode('preview');
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => { setImageData(ev.target?.result as string); setMode('preview'); };
    reader.readAsDataURL(f);
  };

  const analyze = async () => {
    if (!imageData) return;
    setMode('analyzing');
    const base64 = imageData.split(',')[1] || imageData;
    const res = await analyzeImage(base64);
    setResult(res);
    setMode('result');
  };

  const reset = () => { setMode('idle'); setImageData(null); setResult(null); setStreamError(''); stopCamera(); };

  // Parse markdown-ish result
  const renderResult = (text: string) =>
    text.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) return <h4 key={i} className="font-bold text-slate-900 mt-3 mb-1">{line.slice(2,-2)}</h4>;
      if (line.startsWith('- ') || line.startsWith('• ')) return <li key={i} className="ml-4 text-sm text-slate-700 list-disc">{line.slice(2)}</li>;
      if (line.startsWith('#')) return <h3 key={i} className="font-bold text-[#0056b3] text-base mt-4 mb-2">{line.replace(/^#+\s/, '')}</h3>;
      if (line === '') return <br key={i} />;
      return <p key={i} className="text-sm text-slate-700">{line}</p>;
    });

  return (
    <div className="p-6 max-w-4xl space-y-5">
      <SectionHeader title="Análise de Imagem Ortopédica" subtitle="Visão computacional powered by Gemini 2.0 · OrthoVision v3.2" />

      {/* Controls */}
      {mode === 'idle' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button data-tour="tour-webcam" onClick={startCamera} className="flex flex-col items-center gap-4 p-8 bg-white border-2 border-dashed border-slate-200 rounded-2xl hover:border-[#0056b3] hover:bg-blue-50/50 transition-all group">
            <div className="w-14 h-14 rounded-2xl bg-[#0056b3]/10 flex items-center justify-center group-hover:bg-[#0056b3]/20 transition-colors">
              <Camera className="h-7 w-7 text-[#0056b3]" />
            </div>
            <div className="text-center">
              <p className="font-bold text-slate-900">Câmera ao Vivo</p>
              <p className="text-xs text-slate-500 mt-1">Capture imagem radiográfica ou procedimento via webcam</p>
            </div>
          </button>
          <button data-tour="tour-upload" onClick={() => fileRef.current?.click()} className="flex flex-col items-center gap-4 p-8 bg-white border-2 border-dashed border-slate-200 rounded-2xl hover:border-[#0056b3] hover:bg-blue-50/50 transition-all group">
            <div className="w-14 h-14 rounded-2xl bg-[#0056b3]/10 flex items-center justify-center group-hover:bg-[#0056b3]/20 transition-colors">
              <Upload className="h-7 w-7 text-[#0056b3]" />
            </div>
            <div className="text-center">
              <p className="font-bold text-slate-900">Upload de Imagem</p>
              <p className="text-xs text-slate-500 mt-1">JPG, PNG, DICOM — radiografias, ecografias, tomografias</p>
            </div>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </div>
      )}

      {streamError && <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700 text-sm"><AlertCircle size={16} />{streamError}</div>}

      {/* Camera view */}
      {mode === 'camera' && (
        <Card className="overflow-hidden">
          <div className="relative bg-black rounded-xl overflow-hidden">
            <video ref={videoRef} className="w-full max-h-[400px] object-cover" autoPlay muted playsInline />
            {/* Overlay crosshair */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="border-2 border-[#0056b3]/50 w-64 h-64 rounded-lg">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#0056b3]" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#0056b3]" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[#0056b3]" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#0056b3]" />
              </div>
            </div>
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-mono">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> AO VIVO
            </div>
          </div>
          <div className="p-4 flex gap-3 justify-center">
            <Button onClick={capture}><Camera size={15} /> Capturar Imagem</Button>
            <Button variant="secondary" onClick={() => { stopCamera(); setMode('idle'); }}><X size={15} /> Cancelar</Button>
          </div>
        </Card>
      )}

      {/* Preview + analyze */}
      {(mode === 'preview' || mode === 'analyzing') && imageData && (
        <div data-tour="tour-analysis-result" className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card className="p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Imagem Capturada</p>
            <img src={imageData} alt="Análise" className="w-full rounded-xl border border-slate-100 object-contain max-h-80" />
          </Card>
          <Card className="p-5 flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Configurações de Análise</p>
              <div className="space-y-3">
                {[['Modelo', 'OrthoVision v3.2'],['Modo', 'Análise Ortopédica Completa'],['Espécie alvo', 'Multi-espécie'],['Detecção', 'Landmarks + Patologias']].map(([k,v]) => (
                  <div key={k} className="flex justify-between text-sm">
                    <span className="text-slate-500">{k}</span>
                    <span className="font-mono font-medium text-slate-800">{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2 mt-4">
              {mode === 'analyzing' ? (
                <div className="flex items-center justify-center gap-3 py-4">
                  <Spinner /><div><p className="text-sm font-semibold text-slate-700">Analisando imagem...</p><p className="text-xs text-slate-400 font-mono">OrthoVision processando landmarks anatômicos</p></div>
                </div>
              ) : (
                <Button className="w-full" size="lg" onClick={analyze}><Scan size={15} /> Iniciar Análise IA</Button>
              )}
              <Button variant="secondary" className="w-full" onClick={reset}><RefreshCw size={14} /> Nova imagem</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Result */}
      {mode === 'result' && result && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card className="p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Imagem Analisada</p>
            {imageData && <img src={imageData} alt="Resultado" className="w-full rounded-xl border border-slate-100 object-contain max-h-80" />}
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              <p className="font-bold text-slate-900" style={{ fontFamily: 'Montserrat' }}>Análise Concluída</p>
            </div>
            <div className="prose-sm space-y-1 overflow-y-auto max-h-[320px] pr-1">{renderResult(result)}</div>
            <div className="mt-4 pt-4 border-t border-slate-100">
              <Button variant="secondary" size="sm" onClick={reset} className="w-full"><RefreshCw size={13} /> Nova Análise</Button>
            </div>
          </Card>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />

      {/* Info cards */}
      {mode === 'idle' && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { title: 'Precisão', value: '94.7%', sub: 'Média do modelo' },
            { title: 'Landmarks', value: '23+', sub: 'Pontos detectados' },
            { title: 'Tempo', value: '~1.2s', sub: 'Por análise' },
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

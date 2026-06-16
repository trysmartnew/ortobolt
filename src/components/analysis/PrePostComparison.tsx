import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, Image as ImageIcon, Columns, Layers } from 'lucide-react';
import { Button } from '@/components/ui';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_MB = 15;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export default function PrePostComparison() {
  const [imageBefore, setImageBefore] = useState<string | null>(null);
  const [imageAfter, setImageAfter] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'side' | 'slider'>('side');
  const [sliderValue, setSliderValue] = useState(50);
  
  const refBefore = useRef<HTMLInputElement>(null);
  const refAfter = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth);
      const observer = new ResizeObserver(() => {
        setContainerWidth(containerRef.current?.offsetWidth || 0);
      });
      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }
  }, [imageBefore, imageAfter]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string | null>>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    if (!ALLOWED_MIME_TYPES.includes(f.type)) {
      setError(`Formato inválido: "${f.type || 'desconhecido'}". Use JPG, PNG ou WEBP.`);
      if (e.target) e.target.value = '';
      return;
    }

    if (f.size > MAX_FILE_SIZE_BYTES) {
      setError(`Arquivo muito grande: ${(f.size / 1024 / 1024).toFixed(1)}MB. Máx: ${MAX_FILE_SIZE_MB}MB.`);
      if (e.target) e.target.value = '';
      return;
    }

    setError('');
    const reader = new FileReader();
    reader.onload = (ev) => setter(ev.target?.result as string);
    reader.readAsDataURL(f);
  };

  const clearImage = (type: 'before' | 'after') => {
    if (type === 'before') {
      setImageBefore(null);
      if (refBefore.current) refBefore.current.value = '';
    } else {
      setImageAfter(null);
      if (refAfter.current) refAfter.current.value = '';
    }
    setSliderValue(50);
  };

  const UploadBox = ({ label, image, ref, setter }: any) => (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">{label}</p>
      {image ? (
        <div className="relative group">
          <img src={image} alt={label} className="w-full h-64 object-contain rounded-xl border border-slate-200 bg-slate-50" />
          <button
            onClick={() => clearImage(label === 'Pré-Operatório' ? 'before' : 'after')}
            className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-blue-50/50 hover:border-[#0056b3] cursor-pointer transition-all">
          <input type="file" ref={ref} className="hidden" accept="image/*" onChange={(e) => handleFile(e, setter)} />
          <Upload className="w-8 h-8 text-slate-400 mb-2" />
          <span className="text-xs text-slate-500 font-medium">Clique para enviar</span>
        </label>
      )}
    </div>
  );

  const hasBothImages = imageBefore && imageAfter;

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <X size={16} className="flex-shrink-0" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <UploadBox label="Pré-Operatório" image={imageBefore} ref={refBefore} setter={setImageBefore} />
        <UploadBox label="Pós-Operatório" image={imageAfter} ref={refAfter} setter={setImageAfter} />
      </div>

      {hasBothImages && (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2 bg-slate-100 p-1 rounded-full w-fit mx-auto">
            <button
              onClick={() => setViewMode('side')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                viewMode === 'side' ? 'bg-white text-[#0056b3] shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Columns size={16} /> Lado a Lado
            </button>
            <button
              onClick={() => setViewMode('slider')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                viewMode === 'slider' ? 'bg-white text-[#0056b3] shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers size={16} /> Slider (Sobreposição)
            </button>
          </div>

          {viewMode === 'side' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 aspect-[4/3]">
                <img src={imageBefore} alt="Pré" className="w-full h-full object-contain" />
                <span className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded font-medium">Pré-Operatório</span>
              </div>
              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 aspect-[4/3]">
                <img src={imageAfter} alt="Pós" className="w-full h-full object-contain" />
                <span className="absolute top-2 left-2 bg-[#0056b3]/80 text-white text-xs px-2 py-1 rounded font-medium">Pós-Operatório</span>
              </div>
            </div>
          ) : (
            <div 
              ref={containerRef}
              className="relative w-full max-w-3xl mx-auto aspect-[4/3] bg-slate-900 rounded-xl overflow-hidden border border-slate-200 select-none shadow-lg"
            >
              {/* Imagem de Fundo (Pré) */}
              <img src={imageBefore} alt="Pré" className="absolute inset-0 w-full h-full object-contain" />
              
              {/* Imagem Sobreposta (Pós) */}
              <div 
                className="absolute inset-y-0 left-0 overflow-hidden border-r-2 border-white shadow-[0_0_15px_rgba(0,0,0,0.5)]"
                style={{ width: `${sliderValue}%` }}
              >
                <img 
                  src={imageAfter} 
                  alt="Pós" 
                  className="absolute inset-0 h-full object-contain" 
                  style={{ width: containerWidth ? `${containerWidth}px` : '100%' }} 
                />
              </div>

              {/* Handle do Slider */}
              <div 
                className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-10"
                style={{ left: `${sliderValue}%` }}
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center text-slate-700">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/><path d="m15 18-6-6 6-6"/></svg>
                </div>
              </div>
              
              {/* Input Range Invisível para Controle */}
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={sliderValue} 
                onChange={(e) => setSliderValue(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
              />
              
              <span className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded font-medium z-0">Pré-Operatório</span>
              <span className="absolute top-2 right-2 bg-[#0056b3]/80 text-white text-xs px-2 py-1 rounded font-medium z-0">Pós-Operatório</span>
            </div>
          )}

          <div className="flex justify-center pt-2">
            <Button variant="primary" size="lg" className="w-full md:w-auto">
              <ImageIcon size={16} className="mr-2" />
              Salvar Comparação no Prontuário
            </Button>
          </div>
        </div>
      )}

      {!imageBefore && !imageAfter && (
        <p className="text-center text-xs text-slate-400 mt-4">
          Envie as radiografias para visualizar a comparação.
        </p>
      )}
    </div>
  );
}

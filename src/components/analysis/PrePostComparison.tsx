import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button, Card } from '@/components/ui';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_MB = 15;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export default function PrePostComparison() {
  const [imageBefore, setImageBefore] = useState<string | null>(null);
  const [imageAfter, setImageAfter] = useState<string | null>(null);
  const [error, setError] = useState('');
  
  const refBefore = useRef<HTMLInputElement>(null);
  const refAfter = useRef<HTMLInputElement>(null);

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

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <X size={16} className="flex-shrink-0" /> {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <UploadBox label="Pré-Operatório" image={imageBefore} ref={refBefore} setter={setImageBefore} />
        <UploadBox label="Pós-Operatório" image={imageAfter} ref={refAfter} setter={setImageAfter} />
      </div>

      {imageBefore && imageAfter && (
        <div className="flex justify-center pt-4">
          <Button variant="primary" size="lg" className="w-full md:w-auto">
            <ImageIcon size={16} className="mr-2" />
            Salvar Comparação no Prontuário
          </Button>
        </div>
      )}
      
      {!imageBefore && !imageAfter && (
        <p className="text-center text-xs text-slate-400 mt-4">
          Envie as radiografias para visualizar a comparação lado a lado.
        </p>
      )}
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { Plus, Loader2, Calendar } from 'lucide-react';
import { supabase } from '@/services/supabase';
import { useApp } from '@/contexts/AppContext';
import { compressImageBase64 } from '@/services/aiService';
import { Modal, Button } from '@/components/ui';

interface ExamTimelineProps {
  caseId: string;
  currentImageUrl?: string;
}

interface ExamImage {
  id: string;
  case_id: string;
  image_url: string;
  exam_date: string;
  exam_type: string;
  notes?: string;
}

export default function ExamTimeline({ caseId, currentImageUrl }: ExamTimelineProps) {
  const [exams, setExams] = useState<ExamImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedA, setSelectedA] = useState<ExamImage | null>(null);
  const [selectedB, setSelectedB] = useState<ExamImage | null>(null);
  const [sliderValue, setSliderValue] = useState(50);
  const [viewMode, setViewMode] = useState<'side-by-side' | 'overlay'>('side-by-side');
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [newExamType, setNewExamType] = useState('radiografia');
  const [newNotes, setNewNotes] = useState('');
  const uploadRef = useRef<HTMLInputElement>(null);
  const { user, addToast } = useApp();

  useEffect(() => {
    loadExams();
  }, [caseId]);

  const loadExams = async () => {
    try {
      const { data, error } = await supabase
        .from('case_images')
        .select('*')
        .eq('case_id', caseId)
        .order('exam_date', { ascending: true });

      if (error) throw error;
      if (data) setExams(data as ExamImage[]);
    } catch (err) {
      console.error('Erro ao carregar exames:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file: File) => {
    if (!user) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      addToast('Formato inválido. Use JPG, PNG ou WEBP.', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      addToast('Arquivo muito grande. Máx 10MB.', 'error');
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      const base64: string = await new Promise(res => {
        reader.onload = ev => res(ev.target?.result as string);
        reader.readAsDataURL(file);
      });

      const compressed = await compressImageBase64(base64);
      const filename = `${user.id}/${caseId}/${Date.now()}.jpg`;

      const { error: upErr } = await supabase.storage
        .from('case-images')
        .upload(filename, Buffer.from(compressed, 'base64'), {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabase.storage
        .from('case-images')
        .getPublicUrl(filename);

      await supabase.from('case_images').insert({
        case_id: caseId,
        image_url: publicUrl,
        exam_type: newExamType,
        notes: newNotes,
        exam_date: new Date().toISOString(),
      });

      await loadExams();
      addToast('Exame adicionado!', 'success');
      setShowUpload(false);
      setNewExamType('radiografia');
      setNewNotes('');
    } catch (err) {
      console.error(err);
      addToast('Erro ao enviar exame. Tente novamente.', 'error');
    } finally {
      setUploading(false);
      if (uploadRef.current) uploadRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <Loader2 className="animate-spin text-[#0056b3]" size={16} />
        Carregando evolução...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-slate-800">Evolução Radiográfica</h3>
          <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-semibold">
            {exams.length} exame{exams.length !== 1 ? 's' : ''}
          </span>
        </div>
        <Button size="sm" onClick={() => setShowUpload(true)}>
          <Plus size={14} /> Adicionar Exame
        </Button>
      </div>

      {/* Timeline */}
      {exams.length > 0 && (
        <div className="overflow-x-auto">
          <div className="flex gap-3 pb-2">
            {exams.map((exam) => (
              <button
                key={exam.id}
                onClick={() => {
                  if (!selectedA) setSelectedA(exam);
                  else if (!selectedB) setSelectedB(exam);
                  else { setSelectedA(exam); setSelectedB(null); }
                }}
                className={`flex-shrink-0 border rounded-lg p-2 transition-all ${
                  selectedA?.id === exam.id || selectedB?.id === exam.id
                    ? 'border-[#0056b3] bg-blue-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <img
                  src={exam.image_url}
                  alt={exam.exam_type}
                  className="w-16 h-16 object-cover rounded mb-1"
                />
                <p className="text-[10px] text-slate-500">
                  {new Date(exam.exam_date).toLocaleDateString('pt-BR')}
                </p>
                <p className="text-[10px] font-semibold text-slate-700">{exam.exam_type}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Comparison Area */}
      {selectedA && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('side-by-side')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                viewMode === 'side-by-side'
                  ? 'bg-[#0056b3] text-white'
                  : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Lado a Lado
            </button>
            <button
              onClick={() => setViewMode('overlay')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                viewMode === 'overlay'
                  ? 'bg-[#0056b3] text-white'
                  : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Sobreposição
            </button>
          </div>

          {viewMode === 'side-by-side' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <img src={selectedA.image_url} alt="Exame A" className="w-full rounded-lg border" />
                <p className="text-xs text-slate-500 mt-1">
                  {selectedA.exam_type} · {new Date(selectedA.exam_date).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div>
                {selectedB ? (
                  <>
                    <img src={selectedB.image_url} alt="Exame B" className="w-full rounded-lg border" />
                    <p className="text-xs text-slate-500 mt-1">
                      {selectedB.exam_type} · {new Date(selectedB.exam_date).toLocaleDateString('pt-BR')}
                    </p>
                  </>
                ) : (
                  <div className="w-full h-48 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center text-slate-400 text-xs">
                    Selecione o 2º exame
                  </div>
                )}
              </div>
            </div>
          )}

          {viewMode === 'overlay' && selectedA && selectedB && (
            <div className="relative w-full aspect-video">
              <img src={selectedA.image_url} alt="Base" className="w-full h-full object-contain" />
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: `inset(0 ${100 - sliderValue}% 0 0)` }}
              >
                <img src={selectedB.image_url} alt="Overlay" className="w-full h-full object-contain" />
              </div>
              <div
                className="absolute top-0 bottom-0 bg-[#0056b3] w-0.5"
                style={{ left: sliderValue + '%' }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 bg-[#0056b3] rounded-full border-2 border-white shadow cursor-ew-resize"
                style={{ left: sliderValue + '%' }}
              />
              <input
                type="range"
                min="0"
                max="100"
                value={sliderValue}
                onChange={(e) => setSliderValue(Number(e.target.value))}
                className="absolute bottom-2 left-1/2 -translate-x-1/2 w-3/4 accent-[#0056b3]"
              />
              <p className="text-center text-xs text-slate-500 mt-2">
                ← {selectedA.exam_type} | {selectedB.exam_type} →
              </p>
            </div>
          )}
        </div>
      )}

      {/* Upload Modal */}
      <Modal open={showUpload} onClose={() => setShowUpload(false)} title="Adicionar Exame">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo de Exame</label>
            <select
              value={newExamType}
              onChange={(e) => setNewExamType(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0056b3]"
            >
              <option value="radiografia">Radiografia</option>
              <option value="tomografia">Tomografia</option>
              <option value="ultrassom">Ultrassom</option>
              <option value="ressonancia">Ressonância</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Notas (opcional)</label>
            <textarea
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              rows={3}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0056b3] resize-none"
            />
          </div>

          <div
            onClick={() => uploadRef.current?.click()}
            className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center cursor-pointer hover:border-[#0056b3] hover:bg-blue-50/30 transition-all"
          >
            {uploading ? (
              <div className="flex items-center justify-center gap-2 text-slate-500">
                <Loader2 className="animate-spin text-[#0056b3]" size={16} />
                <span className="text-xs">Enviando...</span>
              </div>
            ) : (
              <>
                <Plus size={24} className="text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600">Clique para selecionar arquivo</p>
                <p className="text-[10px] text-slate-400">JPG, PNG, WEBP · Máx 10MB</p>
              </>
            )}
          </div>

          <input
            ref={uploadRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
          />

          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={() => uploadRef.current?.click()} disabled={uploading}>
              Confirmar
            </Button>
            <Button variant="secondary" className="flex-1" onClick={() => setShowUpload(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
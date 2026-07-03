import { ClinicalEvidenceView } from '@/components/ClinicalEvidenceView';
import { useCaseRealtime } from '@/hooks/useCaseRealtime';
import { RadiographViewer } from '@/components/radiographs/RadiographViewer';
// src/pages/CasePage.tsx
// Reescrito com foco clínico prático - remoção de colaboração
import { useState, useMemo, useRef, useEffect, useCallback, memo } from 'react';
import CaseAnalysisTab from '@/components/CaseAnalysisTab';
import { useAnalysis } from '@/contexts/AnalysisContext';
import { ArrowLeft, FileText, Trash2, Edit3, Plus, Check, X, Printer, Pill, Stethoscope, ClipboardList, Calendar, AlertCircle, User as UserIcon, PawPrint, Weight, Ruler, Upload, Activity, GitCompare, LineChart, Ruler as RulerIcon } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { uploadCaseImage } from '@/services/supabase';
import { uploadImageToStorage } from '@/services/imageService';
import { Card, Button, StatusBadge, RiskTag, EmptyState } from '@/components/ui';
import type { ClinicalCase, ProcedureType } from '@/types/index';
import type { MarkingsData } from '@/types/markings';

// ── PROTOCOLOS PÓS-OPERATÓRIOS POR PROCEDIMENTO ─────────────────────────────
interface ProtocolStep {
  text: string;
  days: number;
  category: 'medicacao' | 'restricao' | 'retorno' | 'cuidado';
  mgPerKg?: number;
  frequency?: string;
}

const POST_OP_PROTOCOLS: Record<ProcedureType, { name: string; steps: ProtocolStep[] }> = {
  TPLO: {
    name: 'TPLO - Osteotomia Niveladora do Platô Tibial',
    steps: [
      { text: 'Repouso absoluto (passeios apenas na guia curta)', days: 14, category: 'restricao' },
      { text: 'Dipirona', days: 5, category: 'medicacao', mgPerKg: 25, frequency: '12/12h' },
      { text: 'Cefalexina', days: 7, category: 'medicacao', mgPerKg: 22, frequency: '12/12h' },
      { text: 'Meloxicam', days: 3, category: 'medicacao', mgPerKg: 0.1, frequency: '24/24h' },
      { text: 'Colar elizabetano 24h', days: 14, category: 'cuidado' },
      { text: 'Gelo no local 15min, 3x ao dia', days: 5, category: 'cuidado' },
      { text: 'Retorno para reavaliação', days: 7, category: 'retorno' },
      { text: 'Retirada de pontos', days: 14, category: 'retorno' },
      { text: 'Iniciar fisioterapia leve', days: 21, category: 'retorno' },
    ],
  },
  FHO: {
    name: 'FHO - Excisão da Cabeça e Colo do Fêmur',
    steps: [
      { text: 'Repouso relativo (evitar saltos)', days: 21, category: 'restricao' },
      { text: 'Dipirona', days: 7, category: 'medicacao', mgPerKg: 25, frequency: '12/12h' },
      { text: 'Meloxicam', days: 5, category: 'medicacao', mgPerKg: 0.1, frequency: '24/24h' },
      { text: 'Movimentação passiva do membro', days: 3, category: 'cuidado' },
      { text: 'Fisioterapia ativa diária', days: 30, category: 'retorno' },
      { text: 'Retorno para reavaliação', days: 10, category: 'retorno' },
    ],
  },
  TTA: {
    name: 'TTA - Avanço da Tuberosidade Tibial',
    steps: [
      { text: 'Repouso absoluto (guia curta)', days: 14, category: 'restricao' },
      { text: 'Dipirona', days: 5, category: 'medicacao', mgPerKg: 25, frequency: '12/12h' },
      { text: 'Cefalexina', days: 7, category: 'medicacao', mgPerKg: 22, frequency: '12/12h' },
      { text: 'Colar elizabetano 24h', days: 14, category: 'cuidado' },
      { text: 'Retorno para reavaliação', days: 7, category: 'retorno' },
      { text: 'Retirada de pontos', days: 14, category: 'retorno' },
    ],
  },
  other: {
    name: 'Procedimento Ortopédico',
    steps: [
      { text: 'Repouso conforme orientação', days: 14, category: 'restricao' },
      { text: 'Dipirona', days: 5, category: 'medicacao', mgPerKg: 25, frequency: '12/12h' },
      { text: 'Colar elizabetano', days: 10, category: 'cuidado' },
      { text: 'Retorno para reavaliação', days: 7, category: 'retorno' },
    ],
  },
  LCP_repair: {
    name: 'LCP - Placa de Compressão Bloqueada',
    steps: [
      { text: 'Repouso absoluto (passeios apenas na guia curta)', days: 21, category: 'restricao' },
      { text: 'Dipirona', days: 7, category: 'medicacao', mgPerKg: 25, frequency: '12/12h' },
      { text: 'Cefalexina', days: 7, category: 'medicacao', mgPerKg: 22, frequency: '12/12h' },
      { text: 'Meloxicam', days: 5, category: 'medicacao', mgPerKg: 0.1, frequency: '24/24h' },
      { text: 'Colar elizabetano 24h', days: 14, category: 'cuidado' },
      { text: 'Curativo diário na ferida cirúrgica', days: 7, category: 'cuidado' },
      { text: 'Radiografia de controle', days: 30, category: 'retorno' },
      { text: 'Retorno para reavaliação', days: 14, category: 'retorno' },
      { text: 'Retirada de pontos', days: 14, category: 'retorno' },
    ],
  },
  fracture_fixation: {
    name: 'Fixação Interna de Fratura',
    steps: [
      { text: 'Repouso absoluto (evitar carga no membro)', days: 21, category: 'restricao' },
      { text: 'Dipirona', days: 7, category: 'medicacao', mgPerKg: 25, frequency: '12/12h' },
      { text: 'Cefalexina', days: 7, category: 'medicacao', mgPerKg: 22, frequency: '12/12h' },
      { text: 'Meloxicam', days: 5, category: 'medicacao', mgPerKg: 0.1, frequency: '24/24h' },
      { text: 'Colar elizabetano 24h', days: 14, category: 'cuidado' },
      { text: 'Avaliação da ferida cirúrgica diária', days: 7, category: 'cuidado' },
      { text: 'Radiografia de controle', days: 30, category: 'retorno' },
      { text: 'Retorno para reavaliação', days: 10, category: 'retorno' },
      { text: 'Retirada de pontos', days: 14, category: 'retorno' },
    ],
  },
  joint_replacement: {
    name: 'Artroplastia Total (Prótese Articular)',
    steps: [
      { text: 'Repouso absoluto em gaiola', days: 14, category: 'restricao' },
      { text: 'Passeios apenas na guia curta (5min)', days: 30, category: 'restricao' },
      { text: 'Dipirona', days: 7, category: 'medicacao', mgPerKg: 25, frequency: '12/12h' },
      { text: 'Tramadol', days: 5, category: 'medicacao', mgPerKg: 3, frequency: '8/8h' },
      { text: 'Cefalexina', days: 10, category: 'medicacao', mgPerKg: 22, frequency: '12/12h' },
      { text: 'Meloxicam', days: 7, category: 'medicacao', mgPerKg: 0.1, frequency: '24/24h' },
      { text: 'Colar elizabetano 24h', days: 14, category: 'cuidado' },
      { text: 'Crioterapia (gelo) 15min, 4x ao dia', days: 7, category: 'cuidado' },
      { text: 'Iniciar fisioterapia passiva', days: 3, category: 'retorno' },
      { text: 'Radiografia de controle', days: 30, category: 'retorno' },
      { text: 'Retorno para reavaliação', days: 7, category: 'retorno' },
      { text: 'Retirada de pontos', days: 14, category: 'retorno' },
    ],
  },
  spinal_surgery: {
    name: 'Cirurgia de Coluna (Hemilaminectomia)',
    steps: [
      { text: 'Repouso absoluto em gaiola (sem saltos/escadas)', days: 21, category: 'restricao' },
      { text: 'Passeios apenas na guia curta e peitoral', days: 45, category: 'restricao' },
      { text: 'Dipirona', days: 7, category: 'medicacao', mgPerKg: 25, frequency: '12/12h' },
      { text: 'Tramadol', days: 5, category: 'medicacao', mgPerKg: 3, frequency: '8/8h' },
      { text: 'Gabapentina', days: 14, category: 'medicacao', mgPerKg: 10, frequency: '8/8h' },
      { text: 'Omeprazol (proteção gástrica)', days: 7, category: 'medicacao', mgPerKg: 1, frequency: '24/24h' },
      { text: 'Cefalexina', days: 7, category: 'medicacao', mgPerKg: 22, frequency: '12/12h' },
      { text: 'Colar elizabetano 24h', days: 14, category: 'cuidado' },
      { text: 'Auxílio para urinar/defecar se necessário', days: 7, category: 'cuidado' },
      { text: 'Avaliação neurológica diária', days: 14, category: 'cuidado' },
      { text: 'Retorno para reavaliação neurológica', days: 7, category: 'retorno' },
      { text: 'Iniciar fisioterapia neurológica', days: 10, category: 'retorno' },
      { text: 'Retirada de pontos', days: 14, category: 'retorno' },
      { text: 'Reavaliação completa', days: 30, category: 'retorno' },
    ],
  },
};


// ── HELPERS ─────────────────────────────────────────────────────────────────
function calculateDose(mgPerKg: number, weightKg: number): string {
  const dose = mgPerKg * weightKg;
  if (dose < 1) return `${dose.toFixed(2)}mg`;
  if (dose < 10) return `${dose.toFixed(1)}mg`;
  return `${Math.round(dose)}mg`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return iso; }
}

function generateTutorGuide(c: ClinicalCase, protocol: typeof POST_OP_PROTOCOLS.TPLO): string {
  const lines: string[] = [];
  lines.push(`ORIENTAÇÕES PÓS-CIRÚRGICAS`);
  lines.push(`===========================`);
  lines.push(``);
  lines.push(`Paciente: ${c.patientName}`);
  lines.push(`Procedimento: ${protocol.name}`);
  lines.push(`Data: ${formatDate(new Date().toISOString())}`);
  lines.push(``);
  lines.push(`PRECAUÇÕES IMPORTANTES:`);
  lines.push(`- Mantenha ${c.patientName} em repouso nos primeiros ${protocol.steps.find((s: ProtocolStep) => s.category === 'restricao')?.days || 7} dias`);
  lines.push(`- Evite que o animal lamba a ferida cirúrgica`);
  lines.push(`- Observe o local da cirurgia diariamente`);
  lines.push(``);
  lines.push(`MEDICAMENTOS:`);
  protocol.steps.filter((s: ProtocolStep) => s.category === 'medicacao').forEach((s: ProtocolStep) => {
    const dose = calculateDose(s.mgPerKg || 0, c.weightKg);
    lines.push(`- ${s.text}: ${dose} a cada ${s.frequency} por ${s.days} dias`);
  });
  lines.push(``);
  lines.push(`SINAIS DE ALERTA (retorne imediatamente):`);
  lines.push(`- Inchaço excessivo ou vermelhidão no local`);
  lines.push(`- Secreção (pus) na ferida cirúrgica`);
  lines.push(`- Falta de apetite por mais de 24h`);
  lines.push(`- Vômitos persistentes`);
  lines.push(`- Apatia intensa ou dor não controlada`);
  lines.push(``);
  lines.push(`RETORNOS AGENDADOS:`);
  protocol.steps.filter((s: ProtocolStep) => s.category === 'retorno').forEach((s: ProtocolStep) => {
    lines.push(`- Em ${s.days} dias: ${s.text}`);
  });
  lines.push(``);
  lines.push(`Em caso de dúvidas, entre em contato com a clínica.`);
  return lines.join('\n');
}

// ── MODAL DE EDIÇÃO ─────────────────────────────────────────────────────────
const EditCaseModal = memo(function EditCaseModal({ caseData, onClose, onSave }: { caseData: ClinicalCase; onClose: () => void; onSave: (updates: Partial<ClinicalCase>) => void }) {
  const [form, setForm] = useState({
    title: caseData.title,
    patientName: caseData.patientName,
    breed: caseData.breed,
    ageYears: caseData.ageYears,
    weightKg: caseData.weightKg,
    status: caseData.status,
  });

  const handleSave = () => {
    onSave(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Edit3 size={18} /> Editar Caso</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Título do Caso</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Nome do Paciente</label>
            <input value={form.patientName} onChange={e => setForm({ ...form, patientName: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Raça</label>
            <input value={form.breed} onChange={e => setForm({ ...form, breed: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Idade (anos)</label>
              <input type="number" value={form.ageYears} onChange={e => setForm({ ...form, ageYears: Number(e.target.value) })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Peso (kg)</label>
              <input type="number" step="0.1" value={form.weightKg} onChange={e => setForm({ ...form, weightKg: Number(e.target.value) })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as ClinicalCase['status'] })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="pending">Pendente</option>
              <option value="analyzing">Em Análise</option>
              <option value="analyzed">Analisado</option>
              <option value="critical">Crítico</option>
              <option value="archived">Arquivado</option>
            </select>
          </div>
        </div>
        <div className="p-5 border-t border-slate-100 flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button onClick={handleSave} className="flex-1"><Check size={14} /> Salvar</Button>
        </div>
      </div>
    </div>
  );
});

// ── MODAL DE ORIENTAÇÕES AO TUTOR ───────────────────────────────────────────
const TutorGuideModal = memo(function TutorGuideModal({ caseData, protocol, onClose }: { caseData: ClinicalCase; protocol: typeof POST_OP_PROTOCOLS.TPLO; onClose: () => void }) {
  const guide = useMemo(() => generateTutorGuide(caseData, protocol), [caseData, protocol]);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(guide);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => window.print();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Printer size={18} /> Orientações para o Tutor</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <pre className="text-sm font-mono text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-200">{guide}</pre>
        </div>
        <div className="p-5 border-t border-slate-100 flex gap-2 flex-shrink-0">
          <Button variant="secondary" onClick={handleCopy} className="flex-1">{copied ? <><Check size={14} /> Copiado!</> : <>Copiar Texto</>}</Button>
          <Button onClick={handlePrint} className="flex-1"><Printer size={14} /> Imprimir</Button>
        </div>
      </div>
    </div>
  );
});

// ── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────
export default function CasePage() {
  const { activeCase, closeCase, deleteCase, updateCase, addToast, setCurrentPage, user } = useApp();
  const [aiMarkingsFromSession, setAiMarkingsFromSession] = useState<MarkingsData | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('ortobolt_ai_markings');
      if (raw) {
        const parsed = JSON.parse(raw) as MarkingsData;
        setAiMarkingsFromSession(parsed);
        sessionStorage.removeItem('ortobolt_ai_markings');
      }
    } catch {
      setAiMarkingsFromSession(null);
    }
  }, []);

  const persistedAiMarkings = useMemo<MarkingsData | undefined>(() => {
    const exam = activeCase?.exams?.find(e => e.markings && (e.markings.circles.length > 0 || e.markings.angles.length > 0 || e.markings.markers.length > 0 || e.markings.rois.length > 0));
    return exam?.markings;
  }, [activeCase]);

  const aiMarkingsToViewer = aiMarkingsFromSession ?? persistedAiMarkings;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeCase) return;
    setUploading(true);
    try {
      addToast('Processando radiografia...', 'info');
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      const uploadResult = await uploadImageToStorage(base64, {
        storagePath: `xray-${activeCase.id}-${Date.now()}`,
        type: 'xray',
        caseId: activeCase.id
      });
      if (uploadResult.url) {
        updateCase(activeCase.id, { imageUrl: uploadResult.url, updatedAt: new Date().toISOString() });
        addToast('Radiografia salva na nuvem.', 'success');
      } else {
        addToast('Falha no upload da radiografia.', 'warning');
      }
    } finally {
      setUploading(false);
    }
  }, [activeCase, setUploading, addToast]);

  const handleAvatarUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeCase) return;
    setUploading(true);
    try {
      addToast('Processando avatar...', 'info');
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      const uploadResult = await uploadImageToStorage(base64, {
        storagePath: `avatar-${activeCase.id}-${Date.now()}`,
        type: 'avatar',
        caseId: activeCase.id
      });
      if (uploadResult.url) {
        updateCase(activeCase.id, { avatarUrl: uploadResult.url, updatedAt: new Date().toISOString() });
        addToast('Avatar salvo na nuvem.', 'success');
      } else {
        addToast('Falha no upload do avatar.', 'warning');
      }
    } finally {
      setUploading(false);
    }
  }, [activeCase, setUploading, addToast]);

  const [zoom, setZoom] = useState(100);
  const [showEdit, setShowEdit] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [analysisTool, setAnalysisTool] = useState<string | null>(null);

  const handleSelectAnalysis = useCallback((tool: string) => {
    setAnalysisTool(tool);
    addToast(`Ferramenta de análise selecionada: ${tool}`, 'info');
  }, [addToast]);

  const handleBackToPatient = useCallback(() => {
    setAnalysisTool(null);
  }, []);

  if (!activeCase) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="text-center">
          <AlertCircle size={40} className="mx-auto mb-3 text-slate-300" />
          <EmptyState icon={<AlertCircle size={40} />} title="Sem Casos" description="Nenhum caso selecionado." />
          <Button onClick={() => setCurrentPage('gallery')} className="mt-4">Ir para Galeria</Button>
        </div>
      </div>
    );
  }

  const protocol = POST_OP_PROTOCOLS[activeCase.procedure] || POST_OP_PROTOCOLS.other;
  const completedKey = `ortobolt-checklist-${activeCase.id}`;
  const completedSteps: string[] = (() => {
    try { return JSON.parse(localStorage.getItem(completedKey) || '[]'); } catch { return []; }
  })();

  const toggleStep = (stepText: string) => {
    const next = completedSteps.includes(stepText)
      ? completedSteps.filter(s => s !== stepText)
      : [...completedSteps, stepText];
    localStorage.setItem(completedKey, JSON.stringify(next));
    addToast(completedSteps.includes(stepText) ? 'Etapa desmarcada' : '✓ Etapa concluída', 'success');
  };

  const handleDelete = () => {
    if (confirm(`Excluir o caso "${activeCase.title}"? Esta ação é irreversível.`)) {
      deleteCase(activeCase.id);
      addToast('Caso excluído com sucesso.', 'success');
    }
  };

  const handleSaveEdit = useCallback((updates: Partial<ClinicalCase>) => {
    setSaving(true);
    try {
      updateCase(activeCase.id, { ...updates, updatedAt: new Date().toISOString() });
      addToast('Dados atualizados com sucesso.', 'success');
    } finally {
      setSaving(false);
    }
  }, [activeCase, setSaving, addToast, updateCase]);

  const addClinicalNote = () => {
    if (!newNote.trim()) return;
    const timestamp = new Date().toLocaleString('pt-BR');
    const noteEntry = `[${timestamp}] ${newNote.trim()}`;
    const currentNotes = activeCase.notes?.trim() || '';
    const updated = currentNotes ? `${currentNotes}\n\n${noteEntry}` : noteEntry;
    updateCase(activeCase.id, { notes: updated, updatedAt: new Date().toISOString() });
    setNewNote('');
    setShowNoteInput(false);
    addToast('Nota clínica adicionada.', 'success');
  };

  const handleGoToReports = () => {
    setCurrentPage('reports');
    addToast(
      activeCase.aiAnalysis
        ? 'Relatórios: o PDF usará este caso integrado.'
        : 'Aprove um caso na Análise para gerar PDF com laudo IA.',
      'info'
    );
  };

  const progress = protocol.steps.length > 0 ? Math.round((completedSteps.length / protocol.steps.length) * 100) : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {!analysisTool ? (
        <>
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <button type="button" onClick={() => { closeCase(); setCurrentPage('gallery'); }} className="hover:text-[var(--color-accent)]">Prontuário</button>
            <span>/</span>
            <span className="text-slate-900">Mesa de Luz Digital</span>
          </div>

          {/* Header do Paciente */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <button type="button" onClick={handleBackToPatient} className="px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-semibold text-slate-700 hover:text-[var(--color-accent)] transition-colors">
                <ArrowLeft size={14} className="inline mr-1" /> Voltar ao Prontuário
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--color-surface-muted)] border border-[var(--color-border)] flex items-center justify-center overflow-hidden">
                  {activeCase.avatarUrl ? <img src={activeCase.avatarUrl} alt={activeCase.patientName} className="w-full h-full object-cover" /> : <UserIcon size={18} className="text-slate-400" />}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{activeCase.patientName}</p>
                  <p className="text-xs text-slate-500 capitalize">{activeCase.species} / {activeCase.breed || '—'}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1"><Ruler size={14} /> {activeCase.ageYears} anos</span>
              <span className="flex items-center gap-1"><Weight size={14} /> {activeCase.weightKg} kg</span>
              <span className="flex items-center gap-1"><Activity size={14} /> {activeCase.status}</span>
            </div>
          </div>

          {/* Seleção de Ferramentas de Análise IA */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button type="button" onClick={() => handleSelectAnalysis('comparativa')} className="flex flex-col gap-2 p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-accent)] transition-colors text-left">
              <GitCompare className="text-[var(--color-accent)]" size={24} />
              <p className="text-sm font-bold text-slate-900">Iniciar Análise Comparativa por IA</p>
              <p className="text-xs text-slate-500">Comparação visual e métrica de múltiplos exames</p>
            </button>
            <button type="button" onClick={() => handleSelectAnalysis('evolutiva')} className="flex flex-col gap-2 p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-accent)] transition-colors text-left">
              <LineChart className="text-[var(--color-accent)]" size={24} />
              <p className="text-sm font-bold text-slate-900">Iniciar Análise Evolutiva por IA</p>
              <p className="text-xs text-slate-500">Acompanhamento do progresso e tendências ao longo do tempo</p>
            </button>
            <button type="button" onClick={() => handleSelectAnalysis('alinhamento')} className="flex flex-col gap-2 p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-accent)] transition-colors text-left">
              <RulerIcon className="text-[var(--color-accent)]" size={24} />
              <p className="text-sm font-bold text-slate-900">Iniciar Análise de Alinhamento e Medição por IA</p>
              <p className="text-xs text-slate-500">Medições automáticas e detecção de desvios articulares</p>
            </button>
          </div>

          <p className="text-xs text-slate-500 text-center">Selecione uma análise para começar ou arraste imagens da galeria (não visível) para o canvas.</p>
        </>
      ) : (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <button type="button" onClick={handleBackToPatient} className="flex items-center gap-2 text-sm text-slate-600 hover:text-[var(--color-accent)] font-semibold transition-colors">
            <ArrowLeft size={16} /> Voltar às Ferramentas
          </button>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowEdit(true)}><Edit3 size={14} /> Editar</Button>
            <Button variant="secondary" size="sm" onClick={handleGoToReports} disabled={user?.role === 'student'} title={user?.role === 'student' ? 'Exclusivo para profissionais com CRMV verificado' : ''}><FileText size={14} /> Gerar PDF</Button>
            <Button variant="secondary" size="sm" onClick={() => setShowGuide(true)}><Printer size={14} /> Guia Tutor</Button>
            <button type="button" onClick={handleDelete} className="px-4 py-2 text-[15px] font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1">
              <Trash2 size={14} /> Excluir
            </button>
          </div>
        </div>
      )}

      {/* Título + Status */}
      <Card data-tour="tour-case-patient" className="p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-extrabold text-slate-900 mb-1">{activeCase.title}</h1>
            <p className="text-sm text-slate-500 font-mono">
              Criado em {formatDate(activeCase.createdAt)} · Atualizado em {formatDate(activeCase.updatedAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <RiskTag level={activeCase.riskLevel} />
            <StatusBadge status={activeCase.status} />
          </div>
        </div>
      </Card>

            {/* ═══════════════════════════════════════════════════════════ */}
      {/* Seção de Análise Visual & Refinamento IA (CopilotClinical)  */}
      {/* Aparece apenas quando há análise vinculada ao caso ativo    */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <CaseAnalysisTab />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Coluna Esquerda: Imagem + Dados */}
        <div className="lg:col-span-3 space-y-6">
          {/* Imagem */}
          <Card data-tour="tour-case-image" className="overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Activity size={16} /> Imagem Radiográfica</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => setZoom(z => Math.max(50, z - 25))} className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-bold">−</button>
                <span className="text-xs font-mono text-slate-500 w-10 text-center">{zoom}%</span>
                <button onClick={() => setZoom(z => Math.min(200, z + 25))} className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-bold">+</button>
                <button onClick={() => setZoom(100)} className="text-xs text-slate-500 hover:text-primary px-2">Reset</button>
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="text-xs text-primary hover:text-[var(--color-primary)] px-2 flex items-center gap-1 font-medium">
                    {uploading ? <span className="animate-spin inline-block h-3 w-3 border border-current border-t-transparent rounded-full" /> : <Upload size={14} />}
                    {uploading ? 'Enviando...' : 'Upload'}
                  </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
                <button onClick={() => avatarInputRef.current?.click()} disabled={uploading} className="text-xs text-emerald-600 hover:text-emerald-800 px-2 flex items-center gap-1 font-medium">
                  {uploading ? <span className="animate-spin inline-block h-3 w-3 border border-current border-t-transparent rounded-full" /> : <Upload size={14} />}
                  {uploading ? 'Enviando...' : 'Avatar'}
                </button>
                <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: "none" }} />
              </div>
            </div>
            <div className="bg-slate-900 p-6 flex items-center justify-center min-h-[400px] overflow-auto relative">`n              {activeCase.avatarUrl && <img src={activeCase.avatarUrl} alt="Avatar do paciente" className="absolute top-4 left-4 w-12 h-12 rounded-full border-2 border-white object-cover z-10 shadow-lg" />}
              {activeCase.imageUrl ? (
                <div className="relative inline-block" style={{ width: `${zoom}%`, maxWidth: '100%', transition: 'width .2s' }}>
                  <img src={activeCase.imageUrl} alt={activeCase.patientName} className="w-full h-auto rounded-xl shadow-2xl object-contain block" />
                  {activeCase.aiAnalysis && activeCase.aiAnalysis.anatomicalLandmarks.filter(l => l.detected && l.coordinates).map((l, i) => (
                    <div key={i} className="absolute z-20" style={{ top: `${l.coordinates?.y ?? 0}%`, left: `${l.coordinates?.x ?? 0}%`, transform: 'translate(-50%, -50%)' }}>
                      <div className="w-3 h-3 bg-emerald-400 rounded-full border-2 border-white shadow-lg ring-2 ring-emerald-400/50"></div>
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap font-bold shadow-md">{l.name}</span>
                    </div>
                  ))}
                  {activeCase.precisionScore !== undefined && (
                    <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 z-30 shadow-lg border border-white/20">
                      <Activity size={12} className="text-emerald-400" />
                      Score: {activeCase.precisionScore}%
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-500">
                  <Upload size={32} />
                  <EmptyState icon={<Upload size={32} />} title="Sem Radiografias" description="Nenhuma radiografia" />
                </div>
              )}
            </div>
          </Card>

          {/* Dados Clínicos */}
          <Card className="p-5">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4"><Stethoscope size={16} /> Dados Clínicos</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="flex items-start gap-2">
                <PawPrint size={14} className="text-primary mt-1" />
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Paciente</p>
                  <p className="text-sm font-semibold text-slate-900">{activeCase.patientName}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <UserIcon size={14} className="text-primary mt-1" />
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Espécie</p>
                  <p className="text-sm font-semibold text-slate-900 capitalize">{activeCase.species}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Activity size={14} className="text-primary mt-1" />
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Raça</p>
                  <p className="text-sm font-semibold text-slate-900">{activeCase.breed || '—'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar size={14} className="text-primary mt-1" />
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Idade</p>
                  <p className="text-sm font-semibold text-slate-900">{activeCase.ageYears} anos</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Weight size={14} className="text-primary mt-1" />
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Peso</p>
                  <p className="text-sm font-semibold text-slate-900">{activeCase.weightKg} kg</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Ruler size={14} className="text-primary mt-1" />
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Procedimento</p>
                  <p className="text-sm font-semibold text-slate-900 uppercase">{activeCase.procedure}</p>
                </div>
              </div>
            </div>
            {activeCase.precisionScore !== undefined && (
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">Score de Precisão IA</span>
                <span className="text-lg font-extrabold text-primary font-mono">{activeCase.precisionScore}%</span>
              </div>
            )}
          </Card>

          {activeCase.aiAnalysis && (
            <Card data-tour="tour-case-ai-result" className="p-5">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
                <Activity size={16} /> Análise IA Integrada
              </h2>
              <p className="text-xs text-slate-500 mb-3 font-mono">
                Confiança {(activeCase.aiAnalysis.confidence * 100).toFixed(0)}% ·{' '}
                {activeCase.aiAnalysis.recommendations.length} recomendações
              </p>
              <ul className="space-y-1 mb-3">
                {activeCase.aiAnalysis.recommendations.slice(0, 5).map((r, i) => (
                  <li key={i} className="text-xs text-slate-700 flex gap-2">
                    <span className="text-primary">›</span> {r}
                  </li>
                ))}
              </ul>
              {activeCase.aiAnalysis.anatomicalLandmarks.length > 0 && (
                <div className="border-t border-slate-100 pt-3 space-y-1">
                  {activeCase.aiAnalysis.anatomicalLandmarks.map((l) => (
                    <div key={l.name} className="flex justify-between text-xs">
                      <span className="text-slate-600">{l.name}</span>
                      <span className="font-mono text-emerald-600">
                        {l.detected ? `${(l.confidence * 100).toFixed(0)}%` : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Galeria de Radiografias */}
          <Card className="p-5">
            <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Activity size={16} /> Galeria de Radiografias
            </h2>
            <RadiographViewer caseId={activeCase.id} markings={aiMarkingsToViewer ?? undefined} />
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
              📋 Protocolo Sugerido: {protocol?.name}
            </h2>
            <div className="space-y-2">
              {protocol.steps.map((step, i) => {
                const done = completedSteps.includes(step.text);
                const icon = { medicacao: '💊', restricao: '🛌', retorno: '📅', cuidado: '🩹' }[step.category];
                return (
                  <button key={i} onClick={() => toggleStep(step.text)} className={`w-full text-left p-3 rounded-lg border transition-all flex items-start gap-3 ${done ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-100 hover:border-primary/30 hover:bg-blue-50/30'}`}>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${done ? 'bg-emerald-500 text-white' : 'border-2 border-slate-300'}`}>
                      {done && <Check size={12} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold ${done ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                        <span className="mr-1">{icon}</span> {step.text}
                        {step.mgPerKg && (
                          <span className="ml-1 font-mono text-primary font-bold">
                            ({calculateDose(step.mgPerKg, activeCase.weightKg)})
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {step.frequency ? `${step.frequency} por ${step.days} dias` : `${step.days} dias`}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Ações Rápidas */}
          <Card data-tour="tour-case-actions" className="p-5">
            <h2 className="text-sm font-bold text-slate-900 mb-3">Ações Rápidas</h2>
            <div className="space-y-2">
              <Button onClick={() => setShowEdit(true)} variant="secondary" className="w-full justify-start"><Edit3 size={14} /> Editar dados do caso</Button>
              <Button onClick={() => setShowNoteInput(true)} variant="secondary" className="w-full justify-start"><Plus size={14} /> Adicionar nota clínica</Button>
              <Button onClick={() => setShowGuide(true)} variant="secondary" className="w-full justify-start"><Printer size={14} /> Imprimir guia para tutor</Button>
              <Button onClick={handleGoToReports} variant="secondary" className="w-full justify-start" disabled={user?.role === 'student'} title={user?.role === 'student' ? 'Exclusivo para profissionais com CRMV verificado' : ''}><FileText size={14} /> Gerar laudo em PDF</Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Modais */}
      {showEdit && <EditCaseModal caseData={activeCase} onClose={() => setShowEdit(false)} onSave={handleSaveEdit} />}
      {showGuide && <TutorGuideModal caseData={activeCase} protocol={protocol} onClose={() => setShowGuide(false)} />}
    </div>
  );
}








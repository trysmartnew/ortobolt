// src/pages/CasePage.tsx
// Reescrito com foco clínico prático - remoção de colaboração
import { useState, useMemo, useRef } from 'react';
import { ArrowLeft, FileText, Trash2, Edit3, Plus, Check, X, Printer, Pill, Stethoscope, ClipboardList, Calendar, AlertCircle, User as UserIcon, PawPrint, Weight, Ruler, Upload, Activity } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { uploadCaseImage } from '@/services/supabase';
import { Card, Button, StatusBadge, RiskTag } from '@/components/ui';
import type { ClinicalCase, ProcedureType } from '@/types/index';

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
function EditCaseModal({ caseData, onClose, onSave }: { caseData: ClinicalCase; onClose: () => void; onSave: (updates: Partial<ClinicalCase>) => void }) {
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
      <div className="bg-white rounded-[22px] shadow-[0_8px_24px_rgba(0,0,0,0.08)] max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Edit3 size={18} /> Editar Caso</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Título do Caso</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0056b3]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Nome do Paciente</label>
            <input value={form.patientName} onChange={e => setForm({ ...form, patientName: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0056b3]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Raça</label>
            <input value={form.breed} onChange={e => setForm({ ...form, breed: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0056b3]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Idade (anos)</label>
              <input type="number" value={form.ageYears} onChange={e => setForm({ ...form, ageYears: Number(e.target.value) })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0056b3]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Peso (kg)</label>
              <input type="number" step="0.1" value={form.weightKg} onChange={e => setForm({ ...form, weightKg: Number(e.target.value) })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0056b3]" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as ClinicalCase['status'] })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0056b3]">
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
}

// ── MODAL DE ORIENTAÇÕES AO TUTOR ───────────────────────────────────────────
function TutorGuideModal({ caseData, protocol, onClose }: { caseData: ClinicalCase; protocol: typeof POST_OP_PROTOCOLS.TPLO; onClose: () => void }) {
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
      <div className="bg-white rounded-[22px] shadow-[0_8px_24px_rgba(0,0,0,0.08)] max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
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
}

// ── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────
export default function CasePage() {
  const { activeCase, closeCase, deleteCase, updateCase, addToast, setCurrentPage, user } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeCase) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const url = await uploadCaseImage(reader.result as string, activeCase.id, 'xray');
      updateCase(activeCase.id, { imageUrl: url || reader.result as string, updatedAt: new Date().toISOString() });
      addToast(url ? 'Radiografia salva na nuvem.' : 'Apenas cache local (falha no upload).', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeCase) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const url = await uploadCaseImage(reader.result as string, activeCase.id, 'avatar');
      updateCase(activeCase.id, { avatarUrl: url || reader.result as string, updatedAt: new Date().toISOString() });
      addToast(url ? 'Avatar salvo na nuvem.' : 'Apenas cache local (falha no upload).', 'success');
    };
    reader.readAsDataURL(file);
  };

  const [zoom, setZoom] = useState(100);
  const [showEdit, setShowEdit] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);

  if (!activeCase) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="text-center">
          <AlertCircle size={40} className="mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500">Nenhum caso selecionado.</p>
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

  const handleSaveEdit = (updates: Partial<ClinicalCase>) => {
    updateCase(activeCase.id, { ...updates, updatedAt: new Date().toISOString() });
    addToast('Dados atualizados com sucesso.', 'success');
  };

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
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button onClick={() => { closeCase(); setCurrentPage('gallery'); }} className="flex items-center gap-2 text-sm text-slate-600 hover:text-[#0056b3] font-semibold transition-colors">
          <ArrowLeft size={16} /> Voltar à Galeria
        </button>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowEdit(true)}><Edit3 size={14} /> Editar</Button>
          <Button variant="secondary" size="sm" onClick={handleGoToReports} disabled={user?.role === 'student'} title={user?.role === 'student' ? 'Exclusivo para profissionais com CRMV verificado' : ''}><FileText size={14} /> Gerar PDF</Button>
          <Button variant="secondary" size="sm" onClick={() => setShowGuide(true)}><Printer size={14} /> Guia Tutor</Button>
          <button onClick={handleDelete} className="px-4 py-2 text-[15px] font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1">
            <Trash2 size={14} /> Excluir
          </button>
        </div>
      </div>

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
                <button onClick={() => setZoom(100)} className="text-xs text-slate-500 hover:text-[#0056b3] px-2">Reset</button>
                <button onClick={() => fileInputRef.current?.click()} className="text-xs text-[#0056b3] hover:text-[#003d7a] px-2 flex items-center gap-1 font-medium">
                  <Upload size={14} /> Upload
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
                <button onClick={() => avatarInputRef.current?.click()} className="text-xs text-emerald-600 hover:text-emerald-800 px-2 flex items-center gap-1 font-medium">
                  <Upload size={14} /> Avatar
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
                  <p className="text-sm">Nenhuma radiografia</p>
                </div>
              )}
            </div>
          </Card>

          {/* Dados Clínicos */}
          <Card className="p-5">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4"><Stethoscope size={16} /> Dados Clínicos</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="flex items-start gap-2">
                <PawPrint size={14} className="text-[#0056b3] mt-1" />
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Paciente</p>
                  <p className="text-sm font-semibold text-slate-900">{activeCase.patientName}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <UserIcon size={14} className="text-[#0056b3] mt-1" />
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Espécie</p>
                  <p className="text-sm font-semibold text-slate-900 capitalize">{activeCase.species}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Activity size={14} className="text-[#0056b3] mt-1" />
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Raça</p>
                  <p className="text-sm font-semibold text-slate-900">{activeCase.breed || '—'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar size={14} className="text-[#0056b3] mt-1" />
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Idade</p>
                  <p className="text-sm font-semibold text-slate-900">{activeCase.ageYears} anos</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Weight size={14} className="text-[#0056b3] mt-1" />
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Peso</p>
                  <p className="text-sm font-semibold text-slate-900">{activeCase.weightKg} kg</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Ruler size={14} className="text-[#0056b3] mt-1" />
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Procedimento</p>
                  <p className="text-sm font-semibold text-slate-900 uppercase">{activeCase.procedure}</p>
                </div>
              </div>
            </div>
            {activeCase.precisionScore !== undefined && (
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">Score de Precisão IA</span>
                <span className="text-lg font-extrabold text-[#0056b3] font-mono">{activeCase.precisionScore}%</span>
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
                    <span className="text-[#0056b3]">›</span> {r}
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

          {/* Notas Clínicas */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 data-tour="tour-case-notes" className="text-sm font-bold text-slate-900 flex items-center gap-2"><ClipboardList size={16} /> Notas Clínicas</h2>
              <Button size="sm" variant="secondary" onClick={() => setShowNoteInput(!showNoteInput)}>
                <Plus size={14} /> {showNoteInput ? 'Cancelar' : 'Nova Nota'}
              </Button>
            </div>
            {showNoteInput && (
              <div className="mb-4 space-y-2">
                <textarea value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Descreva observações clínicas, evolução, conduta..." rows={3} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0056b3] resize-none" />
                <Button size="sm" onClick={addClinicalNote}><Check size={14} /> Salvar Nota</Button>
              </div>
            )}
            {activeCase.notes ? (
                <div className="relative pl-6">
                  <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gradient-to-b from-[#0056b3] to-[#0056b3]/20"></div>
                  <div className="space-y-4">
                    {activeCase.notes.split('\n\n').reverse().map((note, i) => {
                      const timestampMatch = note.match(/^\[(\d{2}\/\d{2}\/\d{4},?\s*\d{2}:\d{2}:\d{2})\]/);
                      const timestamp = timestampMatch ? timestampMatch[1] : null;
                      const cleanNote = timestampMatch ? note.replace(/^\[.*?\]\s*/, '') : note;
                      
                      return (
                        <div key={i} className="relative">
                          <div className="absolute -left-4 top-1.5 w-3 h-3 rounded-full bg-[#0056b3] border-2 border-white shadow-sm"></div>
                          <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                            {timestamp && (
                              <div className="flex items-center gap-1.5 mb-2 text-[10px] text-slate-500 font-semibold">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {timestamp}
                              </div>
                            )}
                            <div className="text-xs text-slate-700 font-mono whitespace-pre-wrap leading-relaxed">
                              {cleanNote}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 mb-2">
                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-xs text-slate-400 italic">Nenhuma nota clínica registrada ainda.</p>
                  <p className="text-[10px] text-slate-400 mt-1">Clique em "Nova Nota" para começar</p>
                </div>
              )}
            </Card>
        </div>

        {/* Coluna Direita: Plano de Ação */}
        <div className="lg:col-span-2 space-y-6">
          {/* Protocolo */}
          <Card data-tour="tour-case-checklist" className="p-5"><div className="flex items-center justify-between mb-4"><h2 data-tour="tour-case-protocol"><Pill size={16} /> Plano Pós-Operatório</h2>
              <span className="text-xs font-mono font-bold text-[#0056b3] bg-blue-50 px-2 py-0.5 rounded">{protocol.name.split(' - ')[0]}</span>
            </div>
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>Progresso do protocolo</span>
                <span className="font-bold">{progress}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#0056b3] to-[#38BDF8] transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
            <div className="space-y-2">
              {protocol.steps.map((step, i) => {
                const done = completedSteps.includes(step.text);
                const icon = { medicacao: '💊', restricao: '🛌', retorno: '📅', cuidado: '🩹' }[step.category];
                return (
                  <button key={i} onClick={() => toggleStep(step.text)} className={`w-full text-left p-3 rounded-lg border transition-all flex items-start gap-3 ${done ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-100 hover:border-[#0056b3]/30 hover:bg-blue-50/30'}`}>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${done ? 'bg-emerald-500 text-white' : 'border-2 border-slate-300'}`}>
                      {done && <Check size={12} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold ${done ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                        <span className="mr-1">{icon}</span> {step.text}
                        {step.mgPerKg && (
                          <span className="ml-1 font-mono text-[#0056b3] font-bold">
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








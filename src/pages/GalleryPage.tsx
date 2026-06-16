// ✅ U-02: addToast no handleAdd — feedback visual ao criar caso
// ✅ D-01: veterinarianId usa user?.id em vez de hardcoded 'vet-001'
import { useState, useMemo, useRef } from 'react';
import { Search, Plus, Filter, X, AlertTriangle, Users, ChevronRight, Trash2, Upload } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { uploadCaseImage } from '@/services/supabase';
import { Button, Card, StatusBadge, PrecisionGauge, RiskTag, Modal, SectionHeader, EmptyState, Badge } from '@/components/ui';
import { PROCEDURE_LABELS, SPECIES_LABELS } from '@/data/mockData';
import type { ClinicalCase, CaseStatus, ProcedureType, AnimalSpecies } from '@/types/index';

const STATUS_FILTERS: { value: CaseStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'completed', label: 'Concluídos' },
  { value: 'in_analysis', label: 'Em Análise' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'critical', label: 'Críticos' },
];

function CaseDetailModal({ c, onClose, allCases }: { c: ClinicalCase; onClose: () => void; allCases: ClinicalCase[] }) {
  return (
    <Modal open title={c.title} onClose={onClose}>
      {c.imageUrl && <img src={c.imageUrl} alt={c.patientName} className="w-full h-52 object-cover rounded-t-[18px]" />}
      
      {[['Paciente', c.patientName], ['Espécie', SPECIES_LABELS[c.species]], ['Raça', c.breed], ['Idade', `${c.ageYears} anos`], ['Peso', `${c.weightKg} kg`], ['Procedimento', PROCEDURE_LABELS[c.procedure]]].map(([k, v]) => (
        <div key={k} className="bg-slate-50/70 rounded-[14px] p-3.5">
          <span className="text-xs font-semibold text-slate-500">{k}</span>
          <p className="text-sm font-medium text-slate-900">{v}</p>
        </div>
      ))}
      
      <div className="flex items-center gap-2 mt-2">
        <StatusBadge status={c.status} />
        <RiskTag level={c.riskLevel} />
      </div>
      
      {c.precisionScore && (
        <div className="mt-3 p-3 bg-blue-50/60 rounded-[14px]">
          <PrecisionGauge value={c.precisionScore} size={48} />
          <p className="text-xs text-slate-500 mt-1">precisão IA</p>
        </div>
      )}
      
      {c.aiAnalysis && (
        <div className="mt-4 space-y-3">
          <p className="text-xs font-bold text-slate-700">Análise OrthoVision IA</p>
          {c.aiAnalysis.anatomicalLandmarks.map(l => (
            <div key={l.name} className="flex items-center justify-between text-xs">
              <span className="text-slate-600">{l.name}</span>
              <span className={`font-mono font-semibold ${l.detected ? 'text-emerald-600' : 'text-red-500'}`}>
                {l.detected ? `✓ ${(l.confidence * 100).toFixed(0)}%` : '✗'}
              </span>
            </div>
          ))}
          
          {c.aiAnalysis.recommendations.length > 0 && (
            <>
              <p className="text-xs font-bold text-slate-700 mt-2">Recomendações</p>
              <ul className="space-y-1">
                {c.aiAnalysis.recommendations.map((r, i) => (
                  <li key={i} className="text-xs text-slate-700 flex gap-2">
                    <span>›</span> {r}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
      
      {c.notes && (
        <div className="mt-4 p-3 bg-slate-50 rounded-lg">
          <p className="text-xs font-bold text-slate-700 mb-1">Observações</p>
          <p className="text-xs text-slate-600">{c.notes}</p>
        </div>
      )}
      
      {c.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {c.tags.map(t => <Badge key={t} variant="blue">#{t}</Badge>)}
        </div>
      )}

      {/* Casos Similares */}
      {(() => {
        const similarCases = allCases
          .filter(x => x.id !== c.id)
          .filter(x => x.procedure === c.procedure || x.species === c.species)
          .sort((a, b) => {
            let scoreA = 0, scoreB = 0;
            if (a.procedure === c.procedure) scoreA += 2;
            if (a.species === c.species) scoreA += 1;
            if (b.procedure === c.procedure) scoreB += 2;
            if (b.species === c.species) scoreB += 1;
            return scoreB - scoreA;
          })
          .slice(0, 3);

        if (similarCases.length === 0) return null;

        return (
          <div className="mt-6 pt-4 border-t border-slate-200">
            <p className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Casos Similares Sugeridos
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {similarCases.map(sim => (
                <button
                  key={sim.id}
                  onClick={() => { onClose(); setTimeout(() => window.location.hash = `#/case/${sim.id}`, 100); }}
                  className="text-left bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-[#0056b3] rounded-xl p-3 transition-all group"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                      {sim.patientName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{sim.patientName}</p>
                      <p className="text-[10px] text-slate-500 truncate">{sim.species === 'canine' ? 'Cão' : sim.species === 'feline' ? 'Gato' : sim.species} · {sim.procedure}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      sim.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                      sim.status === 'critical' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {sim.status === 'completed' ? 'Concluído' : sim.status === 'critical' ? 'Crítico' : 'Em Análise'}
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 group-hover:text-[#0056b3] transition-colors"><path d="m9 18 6-6-6-6"/></svg>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })()}

    </Modal>
  );
}

function validateCaseForm(form: { title: string; patientName: string; ageYears: string; weightKg: string; breed: string }) {
  const errs: string[] = [];
  if (!form.title.trim()) errs.push('Título do caso é obrigatório.');
  if (!form.patientName.trim()) errs.push('Nome do paciente é obrigatório.');
  if (!form.breed.trim()) errs.push('Raça é obrigatória.');
  const age = Number(form.ageYears);
  if (form.ageYears !== '' && (isNaN(age) || age < 0 || age > 50)) errs.push('Idade deve ser entre 0 e 50.');
  const weight = Number(form.weightKg);
  if (form.weightKg !== '' && (isNaN(weight) || weight <= 0 || weight > 1000)) errs.push('Peso deve ser entre 0.1 e 1000 kg.');
  return errs;
}

export default function GalleryPage() {
  // ✅ CORREÇÃO: Adicionar 'user' ao destructure
  const { cases, addCase, openCase, deleteCase, addToast, user, updateCase } = useApp();

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarCaseId, setAvatarCaseId] = useState<string | null>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!avatarCaseId) return;
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const url = await uploadCaseImage(reader.result as string, avatarCaseId, 'avatar');
      updateCase(avatarCaseId, { avatarUrl: url || reader.result as string, updatedAt: new Date().toISOString() });
      addToast(url ? 'Avatar salvo na nuvem.' : 'Apenas cache local (falha no upload).', 'success');
      setAvatarCaseId(null);
    };
    reader.readAsDataURL(file);
  };
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CaseStatus | 'all'>('all');
  const [filterProcedure, setFilterProcedure] = useState<ProcedureType | 'all'>('all');
  const [filterSpecies, setFilterSpecies] = useState<AnimalSpecies | 'all'>('all');
  const [filterPeriod, setFilterPeriod] = useState<'all' | '7days' | '30days' | '90days'>('all');
  const [selected, setSelected] = useState<ClinicalCase | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    title: '',
    patientName: '',
    breed: '',
    procedure: 'TPLO' as ProcedureType,
    species: 'canine' as AnimalSpecies,
    ageYears: '',
    weightKg: '',
    notes: '',
    imageFile: null as File | null
  });
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const filtered = useMemo(() => {
    return cases.filter(c => {
      const q = search.toLowerCase();
      const matchSearch = !q || c.title.toLowerCase().includes(q) || c.patientName.toLowerCase().includes(q) || c.tags.some(t => t.toLowerCase().includes(q));
      const matchStatus = statusFilter === 'all' || c.status === statusFilter;
      const matchProcedure = filterProcedure === 'all' || c.procedure === filterProcedure;
      const matchSpecies = filterSpecies === 'all' || c.species === filterSpecies;
      
      let matchPeriod = true;
      if (filterPeriod !== 'all') {
        const days = filterPeriod === '7days' ? 7 : filterPeriod === '30days' ? 30 : 90;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        matchPeriod = new Date(c.createdAt) >= cutoff;
      }
      
      return matchSearch && matchStatus && matchProcedure && matchSpecies && matchPeriod;
    });
  }, [cases, search, statusFilter, filterProcedure, filterSpecies, filterPeriod]);

  // ✅ CORREÇÃO: handleAdd com user?.id e tipagem correta
  const handleAdd = () => {
    const addWithImage = async () => {
    const errs = validateCaseForm(form);
    if (errs.length > 0) {
      setFormErrors(errs);
      // ✅ U-02: toast de validação
      addToast('Preencha todos os campos obrigatórios.', 'warning');
      return;
    }
    setFormErrors([]);
    
    const imageUrl = form.imageFile 
      ? await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(form.imageFile as File);
        })
      : undefined;

    addCase({
      id: crypto.randomUUID(),
      ...form,
      ageYears: Number(form.ageYears) || 0,
      weightKg: Number(form.weightKg) || 0,
      // ✅ CORREÇÃO: Tipagem explícita em vez de 'as any'
      procedure: form.procedure as ProcedureType,
      species: form.species as AnimalSpecies,
      status: 'pending',
      riskLevel: 'medium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: [form.procedure, form.species],
      // ✅ CORREÇÃO: Usar ID real do usuário logado
      veterinarianId: user?.id ?? '',
      // ✅ CORREÇÃO: imageUrl: imageUrl ?? undefined,  // será preenchido via upload de imagem na AnalysisPage
      imageUrl: imageUrl ?? undefined,
    });

    setShowAdd(false);
    };
    addWithImage();

    setForm({
      title: '',
      patientName: '',
      breed: '',
      procedure: 'TPLO',
      species: 'canine',
      ageYears: '',
      weightKg: '',
      notes: '',
    imageFile: null as File | null
    });

    // ✅ U-02: toast de sucesso
    addToast(`Caso "${form.title}" adicionado com sucesso!`, 'success');
  };

  const handleCloseAdd = () => {
    setShowAdd(false);
    setFormErrors([]);
  };

  return (
    <div className="p-6 max-w-7xl space-y-6">
      <SectionHeader
        title="Galeria de Casos Clínicos"
        subtitle={`${cases.length} casos no sistema`}
        action={
          <Button size="sm" data-tour="tour-add-case" onClick={() => setShowAdd(true)}>
            <Plus size={14} /> Novo Caso
          </Button>
        }
      />

      {/* Filters */}
      <div data-tour="tour-gallery-filters" className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 bg-white border border-slate-200/60 rounded-[14px] px-3.5 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex-1 min-w-48">
          <Search size={14} className="text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, espécie, tag..."
            className="flex-1 text-sm outline-none bg-transparent font-mono"
          />
          {search && (
            <button onClick={() => setSearch('')} title="Limpar busca">
              <X size={13} className="text-slate-400 hover:text-slate-600" />
            </button>
          )}
        </div>
        <div className="flex gap-1.5">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3.5 py-1.5 rounded-[12px] text-[13px] font-semibold transition-colors ${
                statusFilter === f.value
                  ? 'bg-[#0056b3] text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          ))}
              <div className="flex gap-2 flex-wrap">
                <select
                  value={filterProcedure}
                  onChange={e => setFilterProcedure(e.target.value as ProcedureType | 'all')}
                  className="px-3 py-1.5 rounded-[12px] text-[13px] font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0056b3]"
                >
                  <option value="all">Todos os Procedimentos</option>
                  {Object.entries(PROCEDURE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                <select
                  value={filterSpecies}
                  onChange={e => setFilterSpecies(e.target.value as AnimalSpecies | 'all')}
                  className="px-3 py-1.5 rounded-[12px] text-[13px] font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0056b3]"
                >
                  <option value="all">Todas as Espécies</option>
                  {Object.entries(SPECIES_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                <select
                  value={filterPeriod}
                  onChange={e => setFilterPeriod(e.target.value as 'all' | '7days' | '30days' | '90days')}
                  className="px-3 py-1.5 rounded-[12px] text-[13px] font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0056b3]"
                >
                  <option value="all">Todo o Período</option>
                  <option value="7days">Últimos 7 dias</option>
                  <option value="30days">Últimos 30 dias</option>
                  <option value="90days">Últimos 90 dias</option>
                </select>
                {(filterProcedure !== 'all' || filterSpecies !== 'all' || filterPeriod !== 'all') && (
                  <button
                    onClick={() => { setFilterProcedure('all'); setFilterSpecies('all'); setFilterPeriod('all'); }}
                    className="px-3 py-1.5 rounded-[12px] text-[13px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                  >
                    Limpar Filtros
                  </button>
                )}
              </div>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Filter size={48} />}
          title="Nenhum caso encontrado"
          description="Ajuste os filtros ou adicione um novo caso clínico."
        />
      ) : (
        <div data-tour="tour-gallery-grid" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(c => (
            <Card key={c.id} className="overflow-hidden hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-300 group rounded-[18px]">
              <div
                className="relative cursor-pointer"
                onClick={() => openCase(c)}
                title="Abrir Colaboração Clínica"
              >
                {c.imageUrl ? (
                  <img
                    src={c.imageUrl}
                    alt={c.patientName}
                    className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-40 bg-slate-100 flex items-center justify-center">
                    <span className="text-slate-400 text-sm">Sem imagem</span>
                  </div>
                )}
                {c.avatarUrl && <img src={c.avatarUrl} alt={`${c.patientName} avatar`} className="absolute top-4 left-4 w-12 h-12 rounded-full border-2 border-white object-cover z-10 shadow-lg" />}
                
                {c.status === 'critical' && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 bg-red-500 text-white text-[10px] px-2 py-1 rounded-full font-bold">
                    <AlertTriangle size={10} /> CRÍTICO
                  </div>
                )}
                {c.precisionScore && (
                  <div className="absolute bottom-2 right-2">
                    <PrecisionGauge value={c.precisionScore} size={44} />
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-sm font-bold text-slate-900 leading-tight line-clamp-2">{c.title}</h3>
                  <StatusBadge status={c.status} />
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 font-mono mb-3">
                  <span>{c.patientName}</span>
                  <span>·</span>
                  <span>{SPECIES_LABELS[c.species]}</span>
                  <span>·</span>
                  <span>{c.weightKg}kg</span>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex flex-wrap gap-1">
                    {c.tags.slice(0, 2).map(t => (
                      <Badge key={t} variant="blue">#{t}</Badge>
                    ))}
                  </div>
                  <RiskTag level={c.riskLevel} />
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-slate-50">
                  <button
                    onClick={() => setSelected(c)}
                    className="flex-1 text-xs text-slate-500 hover:text-slate-700 py-1.5 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                  >
                    Ver detalhes
                  </button>
                  <button
                    onClick={() => openCase(c)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-[#0056b3] hover:bg-[#004494] py-1.5 rounded-lg transition-colors"
                  >
                    <Users size={12} /> Colaborar <ChevronRight size={11} />
                  </button>
                  <button
                    onClick={() => {
                      setAvatarCaseId(c.id);
                      avatarInputRef.current?.click();
                    }}
                    title="Upload Avatar"
                    className="p-1.5 rounded-lg text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                  >
                    <Upload size={13} />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Excluir o caso "${c.title}"? Esta ação não pode ser desfeita.`)) {
                        deleteCase(c.id);
                        addToast(`Caso "${c.title}" excluído.`, 'info');
                      }
                    }}
                    title="Excluir caso"
                    className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: "none" }} />
      {selected && <CaseDetailModal c={selected} onClose={() => setSelected(null)} allCases={cases} />}

      <Modal open={showAdd} onClose={handleCloseAdd} title="Novo Caso Clínico">
        <div className="space-y-4">
          {formErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-1">
              {formErrors.map((e, i) => (
                <p key={i} className="text-xs text-red-600 font-semibold">• {e}</p>
              ))}
            </div>
          )}
          {[
            { label: 'Título do Caso *', key: 'title' as const, placeholder: 'Ex.: TPLO Unilateral — Ruptura LCA' },
            { label: 'Nome do Paciente *', key: 'patientName' as const, placeholder: 'Nome do animal' },
            { label: 'Raça *', key: 'breed' as const, placeholder: 'Raça/Espécie detalhada' },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
                  <input
                    value={form[key]}
                    onChange={e => {
                      setForm(f => ({ ...f, [key]: e.target.value }));
                      setFormErrors([]);
                    }}
                    placeholder={placeholder}
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0056b3] font-mono ${
                      !form[key] && formErrors.length > 0 ? 'border-red-300 bg-red-50' : 'border-slate-200'
                    }`}
                  />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Espécie</label>
              <select
                value={form.species}
                onChange={e => setForm(f => ({ ...f, species: e.target.value as AnimalSpecies }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0056b3]"
              >
                {Object.entries(SPECIES_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Procedimento</label>
              <select
                value={form.procedure}
                onChange={e => setForm(f => ({ ...f, procedure: e.target.value as ProcedureType }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0056b3]"
              >
                {Object.entries(PROCEDURE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Idade (anos)</label>
              <input
                type="number"
                min="0"
                max="50"
                step="0.5"
                value={form.ageYears}
                onChange={e => {
                  setForm(f => ({ ...f, ageYears: e.target.value }));
                  setFormErrors([]);
                }}
                placeholder="Ex: 4"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0056b3] font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Peso (kg)</label>
              <input
                type="number"
                min="0.1"
                max="1000"
                step="0.1"
                value={form.weightKg}
                onChange={e => {
                  setForm(f => ({ ...f, weightKg: e.target.value }));
                  setFormErrors([]);
                }}
                placeholder="Ex: 32.5"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0056b3] font-mono"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Observações</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Notas clínicas, achados, intercorrências..."
              rows={3}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0056b3] font-mono resize-none"
            />
          </div>
  
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Radiografia / Imagem</label>
            <input
              type="file"
              accept="image/*"
              onChange={e => {
                const file = e.target.files?.[0] || null;
                setForm(f => ({ ...f, imageFile: file }));
              }}
              className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#0056b3] file:text-white hover:file:bg-[#003d7a] cursor-pointer"
            />
            {form.imageFile && (
              <p className="text-xs text-green-600 mt-1">Imagem selecionada: {form.imageFile.name}</p>
            )}
          </div>
        <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={handleAdd}>Adicionar Caso</Button>
            <Button variant="secondary" className="flex-1" onClick={handleCloseAdd}>Cancelar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}


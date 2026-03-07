import React, { useState } from 'react';
import { Search, Plus, Filter, Tag, Calendar, X, AlertTriangle } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Button, Card, StatusBadge, PrecisionGauge, RiskTag, Modal, SectionHeader, EmptyState, Badge } from '@/components/ui';
import { PROCEDURE_LABELS, SPECIES_LABELS } from '@/data/mockData';
import type { ClinicalCase, CaseStatus } from '@/types/index';

const STATUS_FILTERS: { value: CaseStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' }, { value: 'completed', label: 'Concluídos' },
  { value: 'in_analysis', label: 'Em Análise' }, { value: 'pending', label: 'Pendentes' },
  { value: 'critical', label: 'Críticos' },
];

function CaseDetailModal({ c, onClose }: { c: ClinicalCase; onClose: () => void }) {
  return (
    <Modal open title={c.title} onClose={onClose}>
      <div className="space-y-5">
        {c.imageUrl && <img src={c.imageUrl} alt={c.patientName} className="w-full h-48 object-cover rounded-xl" />}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[['Paciente', c.patientName],['Espécie', SPECIES_LABELS[c.species]],['Raça', c.breed],['Idade', `${c.ageYears} anos`],['Peso', `${c.weightKg} kg`],['Procedimento', PROCEDURE_LABELS[c.procedure]]].map(([k,v]) => (
            <div key={k} className="bg-slate-50 rounded-lg p-3">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{k}</p>
              <p className="font-semibold text-slate-900 mt-0.5">{v}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={c.status} /><RiskTag level={c.riskLevel} />
          {c.precisionScore && <><PrecisionGauge value={c.precisionScore} size={48} /><span className="text-xs font-mono text-slate-500">precisão IA</span></>}
        </div>
        {c.aiAnalysis && (
          <div className="bg-blue-50 rounded-xl p-4 space-y-3">
            <p className="text-xs font-bold text-[#0056b3] uppercase tracking-wider">Análise OrthoVision IA</p>
            <div className="space-y-1.5">
              {c.aiAnalysis.anatomicalLandmarks.map(l => (
                <div key={l.name} className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">{l.name}</span>
                  <span className={`font-mono font-semibold ${l.detected ? 'text-emerald-600' : 'text-red-500'}`}>
                    {l.detected ? `✓ ${(l.confidence * 100).toFixed(0)}%` : '✗'}
                  </span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Recomendações</p>
              <ul className="space-y-1">{c.aiAnalysis.recommendations.map((r,i) => <li key={i} className="text-xs text-slate-700 flex gap-2"><span className="text-[#0056b3]">›</span>{r}</li>)}</ul>
            </div>
          </div>
        )}
        {c.notes && <div className="bg-amber-50 rounded-xl p-3"><p className="text-xs font-bold text-amber-700 mb-1">Observações</p><p className="text-sm text-amber-900">{c.notes}</p></div>}
        <div className="flex flex-wrap gap-1.5">{c.tags.map(t => <Badge key={t} variant="blue">#{t}</Badge>)}</div>
      </div>
    </Modal>
  );
}

export default function GalleryPage() {
  const { cases, addCase } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CaseStatus | 'all'>('all');
  const [selected, setSelected] = useState<ClinicalCase | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', patientName: '', breed: '', procedure: 'TPLO', species: 'canine', ageYears: '', weightKg: '', notes: '' });

  const filtered = cases.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.title.toLowerCase().includes(q) || c.patientName.toLowerCase().includes(q) || c.tags.some(t => t.toLowerCase().includes(q));
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleAdd = () => {
    if (!form.title || !form.patientName) return;
    addCase({ id: `case-${Date.now()}`, ...form, ageYears: Number(form.ageYears) || 0, weightKg: Number(form.weightKg) || 0, procedure: form.procedure as any, species: form.species as any, status: 'pending', riskLevel: 'medium', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), tags: [form.procedure, form.species], veterinarianId: 'vet-001', imageUrl: `https://picsum.photos/seed/${Date.now()}/400/300` });
    setShowAdd(false); setForm({ title:'', patientName:'', breed:'', procedure:'TPLO', species:'canine', ageYears:'', weightKg:'', notes:'' });
  };

  return (
    <div className="p-6 max-w-7xl space-y-5">
      <SectionHeader title="Galeria de Casos Clínicos" subtitle={`${cases.length} casos no sistema`}
        action={<span data-tour="tour-add-case"><Button size="sm" onClick={() => setShowAdd(true)}><Plus size={14} /> Novo Caso</Button></span>} />

      {/* Filters */}
      <div data-tour="tour-gallery-filters" className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 flex-1 min-w-48">
          <Search size={14} className="text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome, espécie, tag..." className="flex-1 text-sm outline-none bg-transparent font-mono" />
          {search && <button onClick={() => setSearch('')}><X size={13} className="text-slate-400" /></button>}
        </div>
        <div className="flex gap-1.5">
          {STATUS_FILTERS.map(f => (
            <button key={f.value} onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${statusFilter === f.value ? 'bg-[#0056b3] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState icon={<Filter size={48} />} title="Nenhum caso encontrado" description="Ajuste os filtros ou adicione um novo caso clínico." />
      ) : (
        <div data-tour="tour-gallery-grid" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(c => (
            <Card key={c.id} className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow group" onClick={() => setSelected(c)}>
              <div className="relative">
                <img src={c.imageUrl} alt={c.patientName} className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300" onError={e => { (e.target as HTMLImageElement).src = 'https://picsum.photos/400/300'; }} />
                {c.status === 'critical' && <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-500 text-white text-[10px] px-2 py-1 rounded-full font-bold"><AlertTriangle size={10} /> CRÍTICO</div>}
                {c.precisionScore && <div className="absolute bottom-2 right-2"><PrecisionGauge value={c.precisionScore} size={44} /></div>}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-sm font-bold text-slate-900 leading-tight line-clamp-2">{c.title}</h3>
                  <StatusBadge status={c.status} />
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 font-mono mb-3">
                  <span>{c.patientName}</span><span>·</span><span>{SPECIES_LABELS[c.species]}</span><span>·</span><span>{c.weightKg}kg</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">{c.tags.slice(0,2).map(t => <Badge key={t} variant="blue">#{t}</Badge>)}</div>
                  <RiskTag level={c.riskLevel} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {selected && <CaseDetailModal c={selected} onClose={() => setSelected(null)} />}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Novo Caso Clínico">
        <div className="space-y-4">
          {[
            { label: 'Título do Caso', key: 'title', placeholder: 'Ex.: TPLO Unilateral — Ruptura LCA' },
            { label: 'Nome do Paciente', key: 'patientName', placeholder: 'Nome do animal' },
            { label: 'Raça', key: 'breed', placeholder: 'Raça/Espécie' },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
              <input value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0056b3] font-mono" />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Espécie</label>
              <select value={form.species} onChange={e => setForm(f => ({ ...f, species: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0056b3]">
                {Object.entries(SPECIES_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Procedimento</label>
              <select value={form.procedure} onChange={e => setForm(f => ({ ...f, procedure: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0056b3]">
                {Object.entries(PROCEDURE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Idade (anos)</label>
              <input type="number" value={form.ageYears} onChange={e => setForm(f => ({ ...f, ageYears: e.target.value }))} placeholder="Ex: 4" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0056b3] font-mono" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Peso (kg)</label>
              <input type="number" step="0.1" value={form.weightKg} onChange={e => setForm(f => ({ ...f, weightKg: e.target.value }))} placeholder="Ex: 32.5" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0056b3] font-mono" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Observações</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notas clínicas, achados, intercorrências..." rows={3} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0056b3] font-mono resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={handleAdd}>Adicionar Caso</Button>
            <Button variant="secondary" className="flex-1" onClick={() => setShowAdd(false)}>Cancelar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

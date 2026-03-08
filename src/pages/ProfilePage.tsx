import React, { useState } from 'react';
import { Award, Star, BarChart3, Edit2, Check, X, Plus } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Card, Button, Badge, SectionHeader, InlineToast } from '@/components/ui';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

const RADAR_DATA = [
  { subject: 'TPLO', A: 97 }, { subject: 'FHO', A: 92 }, { subject: 'TTA', A: 88 },
  { subject: 'Espinhal', A: 78 }, { subject: 'Fraturas', A: 85 }, { subject: 'Próteses', A: 80 },
];

export default function ProfilePage() {
  const { user, setCurrentPage } = useApp();
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editSpec, setEditSpec] = useState(user?.specialty || '');
  // BUG-06 FIX: persisted display values (local state after save)
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [displaySpec, setDisplaySpec] = useState(user?.specialty || '');
  const [savedToast, setSavedToast] = useState(false);
  // BUG-13 FIX: certification add state
  const [showAddCert, setShowAddCert] = useState(false);
  const [certForm, setCertForm] = useState({ title: '', issuer: '', year: new Date().getFullYear().toString() });
  const [certSaved, setCertSaved] = useState(false);
  const [certifications, setCertifications] = useState(user?.certifications || []);

  if (!user) return null;

  // BUG-06 FIX: save properly updates display state
  const handleSave = () => {
    if (!editName.trim()) return;
    setDisplayName(editName);
    setDisplaySpec(editSpec);
    setEditMode(false);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  };

  const handleCancelEdit = () => {
    setEditName(displayName);
    setEditSpec(displaySpec);
    setEditMode(false);
  };

  // BUG-13 FIX: add certification with feedback
  const handleAddCert = () => {
    if (!certForm.title || !certForm.issuer) return;
    const newCert = {
      id: `c-${Date.now()}`, title: certForm.title, issuer: certForm.issuer,
      year: Number(certForm.year) || new Date().getFullYear(), verified: false,
    };
    setCertifications(prev => [...prev, newCert]);
    setCertForm({ title: '', issuer: '', year: new Date().getFullYear().toString() });
    setShowAddCert(false);
    setCertSaved(true);
    setTimeout(() => setCertSaved(false), 2500);
  };

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <SectionHeader title="Perfil Profissional" subtitle="Dados, certificações e desempenho" />

      {/* Profile header */}
      <Card className="p-6">
        <div className="flex items-start gap-5">
          <div className="w-20 h-20 rounded-2xl bg-[#0056b3] flex items-center justify-center text-white text-3xl font-bold flex-shrink-0">
            {displayName.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            {editMode ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Nome completo</label>
                  <input value={editName} onChange={e => setEditName(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0056b3]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Especialidade</label>
                  <input value={editSpec} onChange={e => setEditSpec(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0056b3]" />
                </div>
                {!editName.trim() && (
                  <p className="text-xs text-red-500 font-semibold">Nome não pode estar vazio.</p>
                )}
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSave} disabled={!editName.trim()}><Check size={13} /> Salvar</Button>
                  <Button size="sm" variant="secondary" onClick={handleCancelEdit}><X size={13} /> Cancelar</Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Montserrat' }}>{displayName}</h2>
                  <button onClick={() => { setEditName(displayName); setEditSpec(displaySpec); setEditMode(true); }}
                    className="text-slate-400 hover:text-[#0056b3] transition-colors"><Edit2 size={14} /></button>
                </div>
                <p className="text-sm text-slate-500 mt-0.5">{displaySpec}</p>
                {savedToast && (
                  <div className="mt-2">
                    <InlineToast message="Perfil atualizado com sucesso!" type="success" />
                  </div>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant="blue">{user.crmv}</Badge>
                  <Badge variant="info">{user.role === 'veterinarian' ? 'Médico Veterinário' : user.role}</Badge>
                  <Badge variant="default">{user.institution}</Badge>
                </div>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div data-tour="tour-profile-stats" className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total de Casos', value: user.stats.totalCases, color: '#0056b3' },
          { label: 'Taxa de Sucesso', value: `${user.stats.successRate}%`, color: '#059669' },
          { label: 'Precisão Média', value: `${user.stats.avgPrecision}%`, color: '#0891b2' },
          { label: 'Procedimentos/Mês', value: user.stats.monthlyProcedures, color: '#d97706' },
        ].map(({ label, value, color }) => (
          <Card key={label} className="p-4 text-center">
            <p className="text-2xl font-bold font-mono" style={{ color }}>{value}</p>
            <p className="text-xs text-slate-500 mt-1 font-semibold">{label}</p>
          </Card>
        ))}
      </div>

      <div data-tour="tour-competency-chart" className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Certifications */}
        <Card className="p-5">
          <SectionHeader title="Certificações" subtitle={`${certifications.length} certificados`} />
          {certSaved && <div className="mb-3"><InlineToast message="Certificação adicionada!" type="success" /></div>}
          <div className="space-y-3">
            {certifications.map(cert => (
              <div key={cert.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-[#0056b3]/10 flex items-center justify-center flex-shrink-0">
                  <Award className="h-4 w-4 text-[#0056b3]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 leading-tight">{cert.title}</p>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{cert.issuer} · {cert.year}</p>
                </div>
                {cert.verified && <Badge variant="success"><Check size={9} className="mr-0.5" />Verificado</Badge>}
                {!cert.verified && <Badge variant="default">Pendente</Badge>}
              </div>
            ))}
          </div>

          {/* BUG-13 FIX: Add certification form */}
          {showAddCert ? (
            <div className="mt-4 p-4 border border-slate-200 rounded-xl space-y-3 bg-slate-50">
              <p className="text-xs font-bold text-slate-600">Nova Certificação</p>
              {[
                { label: 'Título', key: 'title', ph: 'Ex.: Especialização em Ortopedia' },
                { label: 'Emissor', key: 'issuer', ph: 'Ex.: CFMV / USP / ACVS' },
                { label: 'Ano', key: 'year', ph: '2024' },
              ].map(({ label, key, ph }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">{label}</label>
                  <input value={(certForm as any)[key]} onChange={e => setCertForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={ph} className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#0056b3]" />
                </div>
              ))}
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={handleAddCert} disabled={!certForm.title || !certForm.issuer}>
                  <Check size={12} /> Adicionar
                </Button>
                <Button size="sm" variant="secondary" className="flex-1" onClick={() => setShowAddCert(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="secondary" size="sm" className="w-full mt-4" onClick={() => setShowAddCert(true)}>
              <Plus size={13} /> Adicionar Certificação
            </Button>
          )}
        </Card>

        {/* Radar chart */}
        <Card className="p-5">
          <SectionHeader title="Competências Técnicas" subtitle="Score por procedimento" />
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={RADAR_DATA} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#64748b', fontFamily: 'Roboto Mono' }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
              <Radar dataKey="A" stroke="#0056b3" fill="#0056b3" fillOpacity={0.15} strokeWidth={2} dot={{ r: 3, fill: '#0056b3' }} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" size="sm" onClick={() => setCurrentPage('reports')}>
          <BarChart3 size={13} /> Ver Relatórios
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setCurrentPage('gallery')}>
          Ver Histórico de Casos
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setCurrentPage('settings')}>
          Configurações de Conta
        </Button>
      </div>
    </div>
  );
}

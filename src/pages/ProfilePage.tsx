import React, { useState } from 'react';
import { Award, Star, BarChart3, Edit2, Check, X } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Card, Button, Badge, SectionHeader } from '@/components/ui';
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

  if (!user) return null;

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <SectionHeader title="Perfil Profissional" subtitle="Dados, certificações e desempenho" />

      {/* Profile header */}
      <Card className="p-6">
        <div className="flex items-start gap-5">
          <div className="w-20 h-20 rounded-2xl bg-[#0056b3] flex items-center justify-center text-white text-3xl font-bold flex-shrink-0">
            {user.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            {editMode ? (
              <div className="space-y-3">
                <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0056b3]" />
                <input value={editSpec} onChange={e => setEditSpec(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0056b3]" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setEditMode(false)}><Check size={13} /> Salvar</Button>
                  <Button size="sm" variant="secondary" onClick={() => setEditMode(false)}><X size={13} /> Cancelar</Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Montserrat' }}>{editName || user.name}</h2>
                  <button onClick={() => setEditMode(true)} className="text-slate-400 hover:text-[#0056b3] transition-colors"><Edit2 size={14} /></button>
                </div>
                <p className="text-sm text-slate-500 mt-0.5">{editSpec || user.specialty}</p>
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Certifications */}
        <Card className="p-5">
          <SectionHeader title="Certificações" subtitle={`${user.certifications.length} certificados`} />
          <div className="space-y-3">
            {user.certifications.map(cert => (
              <div key={cert.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-[#0056b3]/10 flex items-center justify-center flex-shrink-0">
                  <Award className="h-4 w-4 text-[#0056b3]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 leading-tight">{cert.title}</p>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{cert.issuer} · {cert.year}</p>
                </div>
                {cert.verified && <Badge variant="success"><Check size={9} className="mr-0.5" />Verificado</Badge>}
              </div>
            ))}
          </div>
          <Button variant="secondary" size="sm" className="w-full mt-4">+ Adicionar Certificação</Button>
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

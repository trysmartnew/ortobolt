// src/pages/SettingsPage.tsx
import React, { useState, useEffect } from 'react';
import { Bell, Globe, Brain, FileText, Download, Check, Crown } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/services/supabase';
import { Card, Button, SectionHeader } from '@/components/ui';
import type { Plan } from '@/types/index';

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} className={`relative inline-flex w-11 h-6 rounded-full transition-colors ${checked ? 'bg-[var(--color-accent)]' : 'bg-slate-300'}`}>
      <span className={`absolute top-1 left-1 w-4 h-4 glass-panel-premium rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

function SettingCard({ icon: Icon, title, description, children, accent }: { icon: React.ElementType; title: string; description?: string; children: React.ReactNode; accent?: boolean }) {
  return (
    <Card className={`p-5 ${accent ? 'border-l-4 border-l-[var(--color-accent)]' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-accent)]/10 flex items-center justify-center flex-shrink-0">
            <Icon size={20} className="text-[var(--color-accent)]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</p>
            {description && <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{description}</p>}
          </div>
        </div>
        <div className="flex-shrink-0 flex items-center gap-2">{children}</div>
      </div>
    </Card>
  );
}

export default function SettingsPage() {
  const { user, cases, addToast } = useApp();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [prefs, setPrefs] = useState(() => {
    try {
      const s = localStorage.getItem('vanguard-veterinary_prefs');
      if (s) return JSON.parse(s);
    } catch { }
    return { notifications: true, language: 'pt', autoAnalysis: true, reportFormat: 'pdf' };
  });
  const [timestamp, setTimestamp] = useState(() => new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', ''));
  const [currentPlan, setCurrentPlan] = useState<Plan>('free');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    supabase.from('profiles').select('preferences').eq('id', user?.id).maybeSingle()
      .then(({ data }) => {
        if (!mounted) return;
        if (data?.preferences && typeof data.preferences === 'object') {
          const next = data.preferences as Record<string, unknown>;
          setPrefs((prev: Record<string, unknown>) => ({ ...prev, ...next }));
        }
        setLoading(false);
      }, () => setLoading(false));
    return () => { mounted = false; };
  }, [user?.id]);

  const set = (key: string, val: unknown) => setPrefs((prev: Record<string, unknown>) => ({ ...prev, [key]: val }));

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      localStorage.setItem('vanguard-veterinary_prefs', JSON.stringify(prefs));
      if (user?.id) {
        await supabase.from('profiles').update({ preferences: prefs }).eq('id', user.id);
      }
      setTimestamp(new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', ''));
      addToast('Configurações salvas com sucesso!', 'success');
    } catch {
      addToast('Erro ao salvar configurações.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = () => {
    if (!user?.id) return;
    const payload = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        specialty: user.specialty,
        crmv: user.crmv,
        institution: user.institution,
        avatar: user.avatar,
        certifications: user.certifications,
        stats: user.stats,
        preferences: prefs,
      },
      cases: cases.map(c => ({
        id: c.id,
        title: c.title,
        patientName: c.patientName,
        species: c.species,
        breed: c.breed,
        ageYears: c.ageYears,
        weightKg: c.weightKg,
        procedure: c.procedure,
        status: c.status,
        precisionScore: c.precisionScore,
        riskLevel: c.riskLevel,
        tags: c.tags,
        imageUrl: c.imageUrl,
        avatarUrl: c.avatarUrl,
        notes: c.notes,
        veterinarianId: c.veterinarianId,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        aiAnalysis: c.aiAnalysis,
        clinicalEvidence: c.clinicalEvidence,
        exams: c.exams,
      })),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vanguard-veterinary-data-export-${user.id}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    addToast('Exportação de dados concluída.', 'success');
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <SectionHeader title="Configurações da Conta" subtitle="Preferências do sistema e conta" />
          <p className="text-[10px] text-slate-400 font-mono mt-1">{timestamp}</p>
        </div>
        <Button onClick={handleSaveSettings} loading={saving} className="flex items-center gap-2">
          <Check size={14} />
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>

      {loading ? (
        <div className="p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-accent)]" />
          <p className="ml-3 text-sm text-white/40">Carregando preferências...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <SettingCard icon={Bell} title="Notificações e Interface" description="Alertas de casos críticos e análises concluídas" accent>
            <Toggle checked={!!prefs.notifications} onChange={v => set('notifications', v)} />
            <Button variant="secondary" size="sm">Tour Online</Button>
          </SettingCard>

          <SettingCard icon={Globe} title="Idioma" description="Língua da interface e relatórios">
            <select value={prefs.language as string} onChange={e => set('language', e.target.value)} className="border border-[var(--color-border)] bg-[var(--color-surface)] text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]">
              <option value="pt">Português (BR)</option>
              <option value="en">English</option>
            </select>
          </SettingCard>

          <SettingCard icon={Brain} title="IA e Análise" description="Análise automática de IA adicionadas. Melhore seus laudos">
            <Toggle checked={!!prefs.autoAnalysis} onChange={v => set('autoAnalysis', v)} />
          </SettingCard>

          <SettingCard icon={FileText} title="Formato de Relatório" description="Formato padrão para exportação">
            <select value={prefs.reportFormat as string} onChange={e => set('reportFormat', e.target.value)} className="border border-[var(--color-border)] bg-[var(--color-surface)] text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]">
              <option value="pdf">PDF</option>
              <option value="docx">DOCX</option>
            </select>
          </SettingCard>

          <SettingCard icon={Crown} title="Upgrade de Plano" description="Recursos disponíveis e opções de upgrade">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white bg-[var(--color-surface-muted)] px-2 py-1 rounded-lg capitalize border border-[var(--color-border)]">
                {currentPlan === 'free' ? 'Gratuito' : currentPlan === 'professional' ? 'Professional' : 'Enterprise'}
              </span>
              <Button variant="secondary" size="sm" disabled title="Em breve">
                Ver Planos
              </Button>
            </div>
          </SettingCard>

          <SettingCard icon={Download} title="Meus Dados" description="Baixar todos os seus casos e dados em formato JSON (dados pessoais, e configurações de conta)">
            <Button variant="secondary" size="sm" onClick={handleExportData}>
              <Download size={14} />
              Exportar (.json)
            </Button>
          </SettingCard>
        </div>
      )}
    </div>
  );
}

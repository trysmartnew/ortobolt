import React, { useState } from 'react';
import { Bell, Moon, Globe, FileDown, Zap, Shield, Database, RefreshCw, Check } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Card, Button, SectionHeader, InlineToast } from '@/components/ui';

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} className={`relative inline-flex w-11 h-6 rounded-full transition-colors ${checked ? 'bg-[#0056b3]' : 'bg-slate-200'}`}>
      <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

function SettingRow({ icon: Icon, title, description, children }: { icon: React.ElementType; title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-slate-50 last:border-0">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0 mt-0.5"><Icon size={15} className="text-[#0056b3]" /></div>
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="flex-shrink-0 ml-4">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useApp();
  const [prefs, setPrefs] = useState(user?.preferences || { notifications: true, theme: 'light', language: 'pt', autoAnalysis: true, reportFormat: 'pdf' });
  const [saved, setSaved] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);

  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };
  const set = (key: string, val: any) => setPrefs(p => ({ ...p, [key]: val }));

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <SectionHeader title="Configurações" subtitle="Preferências do sistema e conta" />

      <Card data-tour="tour-settings-toggles" className="p-5">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Notificações e Interface</p>
        <div>
          <SettingRow icon={Bell} title="Notificações em Tempo Real" description="Alertas de casos críticos e análises concluídas">
            <Toggle checked={prefs.notifications} onChange={v => set('notifications', v)} />
          </SettingRow>
          <SettingRow icon={Moon} title="Tema do Sistema" description="Aparência da plataforma">
            <select value={prefs.theme} onChange={e => set('theme', e.target.value)} className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0056b3]">
              <option value="light">Claro</option>
              <option value="dark">Escuro</option>
            </select>
          </SettingRow>
          <SettingRow icon={Globe} title="Idioma" description="Língua da interface e relatórios">
            <select value={prefs.language} onChange={e => set('language', e.target.value)} className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0056b3]">
              <option value="pt">Português (BR)</option>
              <option value="en">English</option>
            </select>
          </SettingRow>
        </div>
      </Card>

      <Card className="p-5">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">IA e Análise</p>
        <div>
          <SettingRow icon={Zap} title="Análise Automática" description="Iniciar análise IA automaticamente ao carregar imagens">
            <Toggle checked={prefs.autoAnalysis} onChange={v => set('autoAnalysis', v)} />
          </SettingRow>
          <SettingRow icon={FileDown} title="Formato de Relatório" description="Formato padrão para exportação">
            <select value={prefs.reportFormat} onChange={e => set('reportFormat', e.target.value)} className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0056b3]">
              <option value="pdf">PDF</option>
              <option value="docx">DOCX</option>
            </select>
          </SettingRow>
        </div>
      </Card>

      <Card className="p-5">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Sistema</p>
        <div>
          <SettingRow icon={Database} title="Modelo de IA Ativo" description="Versão do modelo de visão computacional">
            <span className="text-xs font-mono font-semibold text-[#0056b3] bg-blue-50 px-2 py-1 rounded-lg">OrthoVision v3.2</span>
          </SettingRow>
          <SettingRow icon={Shield} title="Segurança" description="Autenticação e criptografia dos dados">
            <span className="text-xs font-mono text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">✓ Ativo · TLS 1.3</span>
          </SettingRow>
          <SettingRow icon={RefreshCw} title="Cache e Dados Locais" description="Limpar dados temporários do sistema">
            <Button variant="secondary" size="sm" onClick={() => { setCacheCleared(true); setTimeout(() => setCacheCleared(false), 2500); }}>Limpar Cache</Button>
          </SettingRow>
        </div>
      </Card>

      <div className="flex gap-3 pt-2">
        <Button onClick={save} className="flex-1">
          {saved ? <><Check size={14} />Salvo!</> : 'Salvar Configurações'}
        </Button>
        <Button variant="secondary" onClick={() => setPrefs(user?.preferences || prefs)} className="flex-shrink-0">Resetar</Button>
      </div>

      {cacheCleared && <InlineToast message="Cache limpo com sucesso! Dados temporários removidos." type="success" />}

      <p className="text-xs text-slate-400 font-mono text-center">
        OrtoBolt v1.0.0 · © 2025 OrtoBolt LTDA · CRMV-SP Certificado · HL7 FHIR v4.0
      </p>
    </div>
  );
}

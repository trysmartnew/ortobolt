import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/services/supabase';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui';

interface OrthoRecordProps {
  caseId: string;
}

interface GaitData {
  claudicacaoGrau: string;
  membroAfetado: string[];
  observacoes: string;
}

interface ROMData {
  [membro: string]: { flexao: string; extensao: string; abducao: string; aducao: string };
}

interface OrthoTest {
  nome: string;
  resultado: 'positivo' | 'negativo' | 'inconclusivo' | '';
}

interface SurgicalHistory {
  id: string;
  data: string;
  procedimento: string;
  notas: string;
}

const ORTHO_TESTS_LIST = [
  'Teste de Gaveta Cranial',
  'Teste de Compressão Tibial',
  'Teste de Ortolani',
  'Teste de Barlow',
  'Palpação de Patela',
  'Teste de Efusão Articular',
];

const MEMBROS = ['AD', 'AE', 'PD', 'PE'];
const MEMBROS_LABELS: Record<string, string> = {
  AD: 'AD (Anterior Direito)',
  AE: 'AE (Anterior Esquerdo)',
  PD: 'PD (Posterior Direito)',
  PE: 'PE (Posterior Esquerdo)',
};

export default function OrthoRecord({ caseId }: OrthoRecordProps) {
  const { addToast } = useApp();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [gait, setGait] = useState<GaitData>({
    claudicacaoGrau: '0',
    membroAfetado: [],
    observacoes: '',
  });
  const [rom, setRom] = useState<ROMData>({
    AD: { flexao: '', extensao: '', abducao: '', aducao: '' },
    AE: { flexao: '', extensao: '', abducao: '', aducao: '' },
    PD: { flexao: '', extensao: '', abducao: '', aducao: '' },
    PE: { flexao: '', extensao: '', abducao: '', aducao: '' },
  });
  const [tests, setTests] = useState<OrthoTest[]>(
    ORTHO_TESTS_LIST.map(nome => ({ nome, resultado: '' }))
  );
  const [surgeries, setSurgeries] = useState<SurgicalHistory[]>([]);

  useEffect(() => {
    loadRecord();
  }, [caseId]);

  const loadRecord = async () => {
    try {
      const { data, error } = await supabase
        .from('ortho_records')
        .select('*')
        .eq('case_id', caseId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        if (data.gait_data) setGait(data.gait_data);
        if (data.rom_data) setRom(data.rom_data);
        if (data.ortho_tests) setTests(data.ortho_tests);
        if (data.surgical_history) setSurgeries(data.surgical_history);
      }
    } catch (err) {
      console.error('Erro ao carregar prontuário:', err);
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await supabase.from('ortho_records').upsert({
        case_id: caseId,
        gait_data: gait,
        rom_data: rom,
        ortho_tests: tests,
        surgical_history: surgeries,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'case_id' });

      addToast('Prontuário salvo com sucesso!', 'success');
    } catch (err) {
      console.error(err);
      addToast('Erro ao salvar prontuário.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = (id: string) => {
    setCollapsed(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const renderSectionHeader = (id: string, label: string) => (
    <div
      className="cursor-pointer flex items-center justify-between py-3 border-b border-slate-100"
      onClick={() => toggleSection(id)}
    >
      <span className="text-sm font-bold text-slate-800">{label}</span>
      {collapsed.has(id) ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronUp size={16} className="text-slate-400" />}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <Loader2 className="animate-spin text-[#0056b3]" size={16} />
        Carregando prontuário...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Gait Exam */}
      <div className="border border-slate-100 rounded-xl overflow-hidden">
        {renderSectionHeader('gait', '🚶 Exame de Marcha')}
        {!collapsed.has('gait') && (
          <div className="space-y-4 pt-3 px-4 pb-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Claudicação</label>
              <select
                value={gait.claudicacaoGrau}
                onChange={(e) => setGait({ ...gait, claudicacaoGrau: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="0">0 - Sem claudicação</option>
                <option value="1">1 - Leve</option>
                <option value="2">2 - Moderada</option>
                <option value="3">3 - Grave</option>
                <option value="4">4 - Não suporta peso</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Membro(s) afetado(s)</label>
              <div className="flex flex-wrap gap-2">
                {MEMBROS.map(membro => (
                  <label key={membro} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={gait.membroAfetado.includes(membro)}
                      onChange={() => {
                        setGait(prev => ({
                          ...prev,
                          membroAfetado: prev.membroAfetado.includes(membro)
                            ? prev.membroAfetado.filter(m => m !== membro)
                            : [...prev.membroAfetado, membro],
                        }));
                      }}
                      className="accent-[#0056b3]"
                    />
                    <span className="text-sm">{MEMBROS_LABELS[membro]}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Observações</label>
              <textarea
                value={gait.observacoes}
                onChange={(e) => setGait({ ...gait, observacoes: e.target.value })}
                rows={2}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* ROM */}
      <div className="border border-slate-100 rounded-xl overflow-hidden">
        {renderSectionHeader('rom', '📐 Amplitude de Movimento (ADM)')}
        {!collapsed.has('rom') && (
          <div className="space-y-4 pt-3 px-4 pb-4">
            {MEMBROS.map(membro => (
              <div key={membro}>
                <p className="text-xs font-bold text-slate-600 mb-2">{MEMBROS_LABELS[membro]}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {['flexao', 'extensao', 'abducao', 'aducao'].map(campo => (
                    <div key={campo}>
                      <label className="text-[10px] text-slate-500 capitalize block mb-1">{campo} (°)</label>
                      <input
                        type="number"
                        placeholder="—"
                        value={rom[membro][campo as keyof typeof rom['AD']]}
                        onChange={(e) => {
                          setRom(prev => ({
                            ...prev,
                            [membro]: { ...prev[membro], [campo]: e.target.value },
                          }));
                        }}
                        className="w-full border border-slate-200 rounded px-2 py-1 text-sm font-mono"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 italic mt-1">
                  Ref. normal canino: Flexão 40–60° · Extensão 160–165° · Confirmação física obrigatória
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ortho Tests */}
      <div className="border border-slate-100 rounded-xl overflow-hidden">
        {renderSectionHeader('tests', '🔍 Testes Ortopédicos')}
        {!collapsed.has('tests') && (
          <div className="space-y-2 pt-3 px-4 pb-4">
            {tests.map((test, index) => (
              <div key={index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                <span className="text-sm flex-1 text-slate-700">{test.nome}</span>
                <select
                  value={test.resultado}
                  onChange={(e) => {
                    const newTests = [...tests];
                    newTests[index].resultado = e.target.value as OrthoTest['resultado'];
                    setTests(newTests);
                  }}
                  className={`border rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none ${
                    test.resultado === 'positivo' ? 'border-red-300 text-red-700 bg-red-50' :
                    test.resultado === 'negativo' ? 'border-emerald-300 text-emerald-700 bg-emerald-50' :
                    test.resultado === 'inconclusivo' ? 'border-amber-300 text-amber-700 bg-amber-50' :
                    'border-slate-200 text-slate-600'
                  }`}
                >
                  <option value="">Não avaliado</option>
                  <option value="positivo">Positivo</option>
                  <option value="negativo">Negativo</option>
                  <option value="inconclusivo">Inconclusivo</option>
                </select>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Surgical History */}
      <div className="border border-slate-100 rounded-xl overflow-hidden">
        {renderSectionHeader('surgery', '🏥 Histórico Cirúrgico')}
        {!collapsed.has('surgery') && (
          <div className="space-y-3 pt-3 px-4 pb-4">
            {surgeries.map((surgery, idx) => (
              <div key={surgery.id} className="border border-slate-100 rounded-xl p-3 space-y-2 relative">
                <button
                  onClick={() => setSurgeries(prev => prev.filter((_, i) => i !== idx))}
                  className="absolute top-2 right-2 text-slate-300 hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Data</label>
                    <input
                      type="date"
                      value={surgery.data}
                      onChange={(e) => {
                        const newSurgeries = [...surgeries];
                        newSurgeries[idx].data = e.target.value;
                        setSurgeries(newSurgeries);
                      }}
                      className="w-full border border-slate-200 rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Procedimento</label>
                    <input
                      type="text"
                      value={surgery.procedimento}
                      onChange={(e) => {
                        const newSurgeries = [...surgeries];
                        newSurgeries[idx].procedimento = e.target.value;
                        setSurgeries(newSurgeries);
                      }}
                      className="w-full border border-slate-200 rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Notas</label>
                    <input
                      type="text"
                      value={surgery.notas}
                      onChange={(e) => {
                        const newSurgeries = [...surgeries];
                        newSurgeries[idx].notas = e.target.value;
                        setSurgeries(newSurgeries);
                      }}
                      className="w-full border border-slate-200 rounded px-2 py-1 text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={() => setSurgeries(prev => [...prev, { id: Date.now().toString(), data: '', procedimento: '', notas: '' }])}
              className="flex items-center gap-2 text-xs text-[#0056b3] border border-[#0056b3] px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors font-semibold"
            >
              <Plus size={12} /> Adicionar Cirurgia Anterior
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <p className="text-xs text-slate-400 italic">
          Último save: {saving ? 'salvando...' : 'nunca'}
        </p>
        <Button onClick={save} disabled={saving} className="flex items-center gap-2">
          {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
          {saving ? 'Salvando...' : 'Salvar Prontuário'}
        </Button>
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { Copy, Check, Plus, FolderPlus, Download, RefreshCw, SplitSquareHorizontal } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { generateCaseReport } from '@/services/pdfService';
import { Modal, Button } from '@/components/ui';
import { PROCEDURE_LABELS } from '@/data/mockData';
import type { ProcedureType, AnimalSpecies } from '@/types/index';

interface AnalysisToolbarProps {
  result: string;
  imageData: string;
  onReanalyze: () => void;
  onShowCompare: () => void;
}

export default function AnalysisToolbar({ result, imageData, onReanalyze, onShowCompare }: AnalysisToolbarProps) {
  const [copied, setCopied] = useState(false);
  const [showAddCase, setShowAddCase] = useState(false);
  const [caseTitleInput, setCaseTitleInput] = useState('');
  const [caseProcedure, setCaseProcedure] = useState<ProcedureType>('other');
  const { activeCase, user, addCase, addToast } = useApp();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddCase = () => {
    if (!user) {
      addToast('Faça login para criar um caso.', 'error');
      return;
    }
    if (!caseTitleInput.trim()) {
      addToast('Informe um título para o caso.', 'warning');
      return;
    }

    addCase({
      id: `case-${Date.now()}`,
      title: caseTitleInput,
      patientName: 'Paciente',
      species: 'canine' as AnimalSpecies,
      breed: '',
      ageYears: 0,
      weightKg: 0,
      procedure: caseProcedure,
      status: 'pending',
      riskLevel: 'medium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: [caseProcedure],
      veterinarianId: user.id,
      imageUrl: imageData || undefined,
    });

    setShowAddCase(false);
    setCaseTitleInput('');
    setCaseProcedure('other');
    addToast('Caso criado com sucesso!', 'success');
  };

  const handleSaveToCase = () => {
    if (activeCase) {
      addToast('Laudo salvo no caso.', 'success');
    } else {
      addToast('Abra um caso na Galeria primeiro.', 'info');
    }
  };

  const handleExportPDF = () => {
    if (user) {
      const syntheticCase = {
        id: 'analysis-' + Date.now(),
        title: 'Análise OrthoVision',
        patientName: 'Paciente',
        species: 'canine' as AnimalSpecies,
        breed: '',
        ageYears: 0,
        weightKg: 0,
        procedure: 'other' as ProcedureType,
        status: 'in_analysis' as const,
        riskLevel: 'medium' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ['análise'],
        veterinarianId: user.id,
      };
      generateCaseReport(syntheticCase as any, user);
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
        <button
          onClick={handleCopy}
          className="bg-white border border-slate-200 text-slate-700 hover:border-[#0056b3] px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
          {copied ? 'Copiado' : 'Copiar laudo'}
        </button>

        <button
          onClick={() => setShowAddCase(true)}
          className="bg-[#0056b3] text-white hover:bg-[#004494] px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <Plus size={14} />
          Adicionar caso
        </button>

        <button
          onClick={handleSaveToCase}
          className="bg-emerald-600 text-white hover:bg-emerald-700 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <FolderPlus size={14} />
          Salvar no caso
        </button>

        <button
          onClick={handleExportPDF}
          className="bg-white border border-slate-200 text-slate-700 hover:border-[#0056b3] px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <Download size={14} />
          Exportar PDF
        </button>

        <button
          onClick={onReanalyze}
          className="bg-white border border-slate-200 text-slate-700 hover:border-[#0056b3] px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw size={14} />
          Segunda análise
        </button>

        <button
          onClick={onShowCompare}
          className="bg-white border border-slate-200 text-slate-700 hover:border-[#0056b3] px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <SplitSquareHorizontal size={14} />
          Comparar exame
        </button>
      </div>

      <Modal open={showAddCase} onClose={() => setShowAddCase(false)} title="Criar Novo Caso">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Título do Caso *</label>
            <input
              value={caseTitleInput}
              onChange={(e) => setCaseTitleInput(e.target.value)}
              placeholder="Ex.: TPLO Unilateral — Ruptura LCA"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0056b3]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Procedimento</label>
            <select
              value={caseProcedure}
              onChange={(e) => setCaseProcedure(e.target.value as ProcedureType)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0056b3]"
            >
              {Object.entries(PROCEDURE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={handleAddCase}>Criar Caso</Button>
            <Button variant="secondary" className="flex-1" onClick={() => setShowAddCase(false)}>Cancelar</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
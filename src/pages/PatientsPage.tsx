import React, { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card, Button, Badge, EmptyState, Spinner } from '@/components/ui';
import { Search, Plus, Edit3, Eye, Trash2, Calendar, Activity, Bot } from 'lucide-react';
import type { ClinicalCase, CaseStatus, AnimalSpecies } from '@/types/index';
import { SPECIES_LABELS } from '@/constants/labels';
import { CLINICAL_TERMS } from '@/constants/clinicalTerms';
import PatientForm from '../components/PatientForm';
import PatientAssistantPanel from '../components/analysis/PatientAssistantPanel';

interface PatientRecord {
  id: string;
  patientName: string;
  species: AnimalSpecies;
  breed: string;
  ageYears: number;
  owner: string;
  lastCaseDate: string;
  status: CaseStatus;
  avatarUrl?: string;
}

function getPatientStatusLabel(status: CaseStatus): string {
  const map: Record<CaseStatus, string> = {
    in_analysis: 'Em Tratamento',
    completed: 'Recuperando',
    pending: 'Diagnosticado',
    critical: 'Em Tratamento',
  };
  return map[status] ?? 'Diagnosticado';
}

function getPatientStatusVariant(status: CaseStatus): 'success' | 'info' | 'danger' {
  if (status === 'completed') return 'success';
  if (status === 'in_analysis' || status === 'critical') return 'info';
  return 'danger';
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return iso;
  }
}

// ...
export default function PatientsPage() {
  const { cases, user, authLoading, openCase, deleteCase, addToast, setActiveCase, setCurrentPage } = useApp();
  const [search, setSearch] = useState('');
  const [breedFilter, setBreedFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingPatient, setEditingPatient] = useState<ClinicalCase | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [activeAssistantCase, setActiveAssistantCase] = useState<ClinicalCase | null>(null);

  const patients = useMemo(() => {
    const sorted = [...cases].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const map = new Map<string, PatientRecord>();

    for (const c of sorted) {
      const key = `${c.patientName}-${c.species}-${c.breed}`;
      if (!map.has(key)) {
        map.set(key, {
          id: c.id,
          patientName: c.patientName,
          species: c.species,
          breed: c.breed,
          ageYears: c.ageYears,
          owner: '',
          lastCaseDate: c.createdAt,
          status: c.status,
          avatarUrl: c.avatarUrl,
        });
      }
    }
    return Array.from(map.values());
  }, [cases]);

  const uniqueBreeds = useMemo(() => {
    const breeds = new Set(patients.map(p => p.breed));
    return Array.from(breeds).sort();
  }, [patients]);

  const uniqueStatuses = useMemo(() => {
    const statuses = new Set(patients.map(p => getPatientStatusLabel(p.status)));
    return Array.from(statuses).sort();
  }, [patients]);

  const filtered = useMemo(() => {
    return patients.filter(p => {
      const matchesSearch =
        p.patientName.toLowerCase().includes(search.toLowerCase()) ||
        p.breed.toLowerCase().includes(search.toLowerCase());
      const matchesBreed = !breedFilter || p.breed.toLowerCase() === breedFilter.toLowerCase();
      const matchesStatus = !statusFilter || getPatientStatusLabel(p.status) === statusFilter;
      const matchesDate = !dateFilter || p.lastCaseDate.includes(dateFilter);
      return matchesSearch && matchesBreed && matchesStatus && matchesDate;
    });
  }, [patients, search, breedFilter, statusFilter, dateFilter]);

  const handleAddPatient = () => {
    setEditingPatient(null);
    setShowForm(true);
  };

  const handleBack = () => {
    setShowForm(false);
    setEditingPatient(null);
  };

  const handleView = (patientId: string) => {
    const selectedCase = cases.find(c => c.id === patientId);
    if (selectedCase) {
      setActiveCase(selectedCase);
      setCurrentPage('patientDetail');
    }
  };

  const handleEdit = (caseId: string) => {
    const c = cases.find(x => x.id === caseId);
    if (c) {
      setEditingPatient(c);
      setShowForm(true);
    }
  };

  const handleDelete = async (caseId: string) => {
    if (deleting === caseId) return;
    setDeleting(caseId);
    try {
      deleteCase(caseId);
      addToast('Paciente excluído com sucesso.', 'success');
    } catch {
      addToast('Erro ao excluir paciente.', 'error');
    } finally {
      setDeleting(null);
    }
  };

  if (authLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Spinner />
        <p className="ml-3 text-sm text-slate-500">Carregando pacientes...</p>
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <PatientForm caseData={editingPatient} onClose={handleBack} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {activeAssistantCase && (
        <PatientAssistantPanel 
          isOpen={!!activeAssistantCase} 
          onClose={() => setActiveAssistantCase(null)} 
          caseData={activeAssistantCase} 
        />
      )}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'Montserrat, sans-serif' }}>Página de Pacientes</h1>
        <p className="text-sm text-slate-600">Gerencie seus pacientes e acompanhe o histórico clínico.</p>
      </div>

      <Card className="glass-panel-premium !text-[var(--color-text-primary)] p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" size={16} />
            <input
              type="text"
              placeholder="Search Patients (Pesquisa Pacientes)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
          </div>

          <select
            value={breedFilter}
            onChange={(e) => setBreedFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] cursor-pointer"
          >
            <option value="">By Breed (Raça)</option>
            {uniqueBreeds.map(breed => (
              <option key={breed} value={breed}>{breed}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] cursor-pointer"
          >
            <option value="">By Status</option>
            {uniqueStatuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>

          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" size={16} />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="pl-9 pr-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
          </div>

          <Button variant="primary" onClick={handleAddPatient} className="ml-auto">
            <Plus size={16} />
            <span className="hidden sm:inline">Add Patient</span>
          </Button>
        </div>
      </Card>

      <Card className="glass-panel-premium !text-[var(--color-text-primary)] overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Activity size={48} className="text-slate-300" />}
            title="Nenhum paciente encontrado"
            description="Cadastre casos na Análise de Imagens para começar a montar a sua lista de pacientes."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="text-left py-3 px-4 text-[var(--color-text-secondary)] font-semibold">Foto</th>
                  <th className="text-left py-3 px-4 text-[var(--color-text-secondary)] font-semibold">Nome</th>
                  <th className="text-left py-3 px-4 text-[var(--color-text-secondary)] font-semibold">Espécie / Raça</th>
                  <th className="text-left py-3 px-4 text-[var(--color-text-secondary)] font-semibold">Idade</th>
                  <th className="text-left py-3 px-4 text-[var(--color-text-secondary)] font-semibold">Proprietário</th>
                  <th className="text-left py-3 px-4 text-[var(--color-text-secondary)] font-semibold">Último Caso</th>
                  <th className="text-left py-3 px-4 text-[var(--color-text-secondary)] font-semibold">Status Clínico</th>
                  <th className="text-left py-3 px-4 text-[var(--color-text-secondary)] font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-surface)]/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="w-10 h-10 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center overflow-hidden">
                        {p.avatarUrl ? (
                          <img src={p.avatarUrl} alt={p.patientName} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs font-bold text-[var(--color-text-secondary)]">
                            {p.patientName.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-[var(--color-text-primary)]">{p.patientName}</p>
                    </td>
                    <td className="py-3 px-4 text-[var(--color-text-secondary)]">
                      {SPECIES_LABELS[p.species] ?? p.species} / {p.breed}
                    </td>
                    <td className="py-3 px-4 text-[var(--color-text-secondary)]">{p.ageYears ?? '-'} anos</td>
                    <td className="py-3 px-4 text-[var(--color-text-secondary)]">{p.owner || '-'}</td>
                    <td className="py-3 px-4 text-[var(--color-text-secondary)]">{formatDate(p.lastCaseDate)}</td>
                    <td className="py-3 px-4">
                      <Badge variant={getPatientStatusVariant(p.status)} className="border-0">
                        {getPatientStatusLabel(p.status)}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleView(p.id)}
                          className="p-1.5 rounded-md hover:bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
                          title="Visualizar"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => setActiveAssistantCase(cases.find(c => c.id === p.id) as any)}
                          className="p-1.5 rounded-md hover:bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-primary transition-colors"
                          title="Assistente Clínico"
                        >
                          <Bot size={16} />
                        </button>
                        <button
                          onClick={() => handleEdit(p.id)}
                          className="p-1.5 rounded-md hover:bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
                          title="Editar"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          disabled={deleting === p.id}
                          className="p-1.5 rounded-md hover:bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-error)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Excluir"
                        >
                          {deleting === p.id ? <span className="animate-spin inline-block h-4 w-4 border border-current border-t-transparent rounded-full" /> : <Trash2 size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

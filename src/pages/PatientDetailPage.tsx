import React, { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card, Button, Badge, EmptyState, Spinner } from '@/components/ui';
import { ArrowLeft, User, PawPrint, Ruler, Activity, Pill, FlaskConical, Image, TrendingUp, Calendar, UserRound } from 'lucide-react';
import type { ClinicalCase, CaseStatus, AnimalSpecies } from '@/types/index';
import { SPECIES_LABELS } from '@/constants/labels';
import RadiographGallery from '../components/RadiographGallery';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return iso;
  }
}

function formatShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  } catch {
    return iso;
  }
}

function getStatusLabel(status: CaseStatus): string {
  const map: Record<CaseStatus, string> = {
    completed: 'Concluído',
    in_analysis: 'Em Análise',
    pending: 'Pendente',
    critical: 'CRÍTICO',
  };
  return map[status] ?? status;
}

export default function PatientDetailPage() {
  const { cases, activeCase, openCase, setCurrentPage, user, authLoading, addToast } = useApp();
  const [loading, setLoading] = useState(false);
  const [showGallery, setShowGallery] = useState(false);

  const patientCases = useMemo(() => {
    const base = activeCase
      ? cases.filter(c => c.patientName === activeCase.patientName)
      : cases;

    return [...base].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [cases, activeCase]);

  const currentPatient = useMemo(() => {
    if (activeCase) {
      return {
        id: activeCase.id,
        patientName: activeCase.patientName,
        species: activeCase.species,
        breed: activeCase.breed,
        ageYears: activeCase.ageYears,
        weightKg: activeCase.weightKg,
        avatarUrl: activeCase.avatarUrl,
      } as const;
    }
    if (patientCases.length > 0) {
      const first = patientCases[0];
      return {
        id: first.id,
        patientName: first.patientName,
        species: first.species,
        breed: first.breed,
        ageYears: first.ageYears,
        weightKg: first.weightKg,
        avatarUrl: first.avatarUrl,
      } as const;
    }
    return null;
  }, [activeCase, patientCases]);

  const medications = useMemo(() => {
    const meds: Array<{ id: string; name: string; dosage: string; frequency: string; caseId: string }> = [];
    for (const c of patientCases) {
      const text = c.notes ?? '';
      const lines = text.split('\n').filter((line) => line.trim().length > 0);
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length > 0) {
          meds.push({
            id: `${c.id}-${trimmed}`,
            name: trimmed,
            dosage: '—',
            frequency: '—',
            caseId: c.id,
          });
        }
      }
      if (c.aiAnalysis?.recommendations) {
        for (const rec of c.aiAnalysis.recommendations) {
          meds.push({
            id: `${c.id}-rec-${rec}`,
            name: rec,
            dosage: '—',
            frequency: '—',
            caseId: c.id,
          });
        }
      }
    }
    return meds.slice(-10);
  }, [patientCases]);

  const labs = useMemo(() => {
    const list: Array<{ id: string; name: string; date: string; result: string }> = [];
    for (const c of patientCases) {
      if (c.exams) {
        for (const exam of c.exams) {
          list.push({
            id: exam.id,
            name: exam.modality === 'radiograph' ? 'Radiografia' : exam.modality === 'clinical_photo' ? 'Foto Clínica' : 'Exame',
            date: exam.createdAt,
            result: exam.analysisText ? 'Com laudo' : 'Sem laudo',
          });
        }
      }
    }
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);
  }, [patientCases]);

  const images = useMemo(() => {
    const list: Array<{ id: string; url: string; date: string; modality: string }> = [];
    for (const c of patientCases) {
      if (c.imageUrl) {
        list.push({ id: `${c.id}-main`, url: c.imageUrl, date: c.createdAt, modality: 'principal' });
      }
      if (c.exams) {
        for (const exam of c.exams) {
          for (const url of exam.imageUrls) {
            list.push({ id: exam.id, url, date: exam.createdAt, modality: exam.modality });
          }
        }
      }
    }
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 12);
  }, [patientCases]);

  const handleOpenCase = (c: ClinicalCase) => {
    setLoading(true);
    try {
      openCase(c);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Spinner />
        <p className="ml-3 text-sm text-slate-500">Carregando prontuário...</p>
      </div>
    );
  }

  if (!currentPatient) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<UserRound size={48} className="text-slate-300" />}
          title="Nenhum paciente selecionado"
          description="Abra um caso clínico para visualizar o prontuário completo."
        />
      </div>
    );
  }

  if (showGallery) {
    return (
      <RadiographGallery
        patientName={currentPatient.patientName}
        species={currentPatient.species}
        breed={currentPatient.breed}
        ageYears={currentPatient.ageYears}
        weightKg={currentPatient.weightKg}
        avatarUrl={currentPatient.avatarUrl}
        cases={patientCases}
        onBack={() => setShowGallery(false)}
      />
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="secondary" onClick={() => window.history.back()}>
          <ArrowLeft size={16} /> Voltar
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Prontuário: {currentPatient.patientName}
          </h1>
          <p className="text-sm text-slate-600">
            {SPECIES_LABELS[currentPatient.species] ?? currentPatient.species} / {currentPatient.breed || '—'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-[var(--color-surface-muted)] border border-[var(--color-border)] flex items-center justify-center overflow-hidden flex-shrink-0">
                {currentPatient.avatarUrl ? (
                  <img src={currentPatient.avatarUrl} alt={currentPatient.patientName} className="w-full h-full object-cover" />
                ) : (
                  <User className="text-slate-400" size={24} />
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-slate-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  {currentPatient.patientName}
                </h2>
                <p className="text-sm text-slate-600">
                  {SPECIES_LABELS[currentPatient.species] ?? currentPatient.species} / {currentPatient.breed || '—'}
                </p>
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <UserRound size={14} /> {user?.name || 'Profissional'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Ruler size={14} /> {currentPatient.ageYears ?? '—'} anos
                  </span>
                  <span className="flex items-center gap-1">
                    <Activity size={14} /> {currentPatient.weightKg ?? '—'} kg
                  </span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="text-[var(--color-accent)]" size={18} />
              <h3 className="text-base font-bold text-slate-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Timeline de Evoluções Clínicas
              </h3>
            </div>

            {patientCases.length === 0 ? (
              <EmptyState
                icon={<Activity size={48} className="text-slate-300" />}
                title="Sem histórico clínico"
                description="Este paciente ainda não possui registros de evolução."
              />
            ) : (
              <div className="space-y-4 relative">
                <div className="absolute left-5 top-2 bottom-2 w-px bg-[var(--color-border)]" />

                {patientCases.map((c, idx) => (
                  <div key={c.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-[var(--color-accent)] border-2 border-white shadow-sm" />
                      {idx < patientCases.length - 1 && <div className="w-px flex-1 bg-[var(--color-border)]" />}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {formatDate(c.createdAt)} — {c.title || 'Sem título'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {user?.name || 'Profissional'} · {getStatusLabel(c.status)}
                          </p>
                        </div>
                        <Badge variant={c.status === 'completed' ? 'success' : c.status === 'critical' ? 'danger' : 'info'}>
                          {getStatusLabel(c.status)}
                        </Badge>
                      </div>
                      {(c.notes || c.aiAnalysis?.recommendations?.length) && (
                        <div className="mt-2 p-3 rounded-lg bg-[var(--color-surface-muted)] border border-[var(--color-border)]">
                          <p className="text-xs text-slate-600 whitespace-pre-line">
                            {c.notes
                              ? c.notes
                              : c.aiAnalysis?.recommendations?.slice(0, 3).join('\n')}
                          </p>
                        </div>
                      )}
                      <div className="mt-2">
                        <Button variant="secondary" size="sm" onClick={() => handleOpenCase(c)} loading={loading} disabled={loading}>
                          Abrir caso
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="text-[var(--color-accent)]" size={18} />
              <h3 className="text-sm font-bold text-slate-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Ferramentas Clínicas
              </h3>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => setCurrentPage('analysis')}
                className="w-full p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surface-muted)] hover:border-[var(--color-accent)] transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[var(--color-surface-muted)] flex items-center justify-center group-hover:bg-[var(--color-accent)]/20">
                    <Image className="text-[var(--color-accent)]" size={20} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-slate-900 group-hover:text-[var(--color-accent)]">Análise de Imagens</p>
                    <p className="text-xs text-slate-500">Upload e análise radiográfica</p>
                  </div>
                </div>
              </button>
              <button
                onClick={() => setCurrentPage('evolutionaryAnalysis')}
                className="w-full p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surface-muted)] hover:border-[var(--color-accent)] transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[var(--color-surface-muted)] flex items-center justify-center group-hover:bg-[var(--color-accent)]/20">
                    <TrendingUp className="text-[var(--color-accent)]" size={20} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-slate-900 group-hover:text-[var(--color-accent)]">Análise Evolutiva</p>
                    <p className="text-xs text-slate-500">Timeline clínica e evolutiva</p>
                  </div>
                </div>
              </button>
              <button
                onClick={() => setCurrentPage('alignmentAnalysis')}
                className="w-full p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surface-muted)] hover:border-[var(--color-accent)] transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[var(--color-surface-muted)] flex items-center justify-center group-hover:bg-[var(--color-accent)]/20">
                    <Ruler className="text-[var(--color-accent)]" size={20} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-slate-900 group-hover:text-[var(--color-accent)]">Análise de Alinhamento</p>
                    <p className="text-xs text-slate-500">Avaliação pós-cirúrgica</p>
                  </div>
                </div>
              </button>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <FlaskConical className="text-[var(--color-accent)]" size={18} />
              <h3 className="text-sm font-bold text-slate-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Laboratory Results
              </h3>
            </div>
            {labs.length === 0 ? (
              <p className="text-xs text-slate-500">Sem exames laboratoriais registrados.</p>
            ) : (
              <div className="space-y-2">
                {labs.slice(0, 5).map((lab) => (
                  <div key={lab.id} className="text-xs">
                    <p className="font-semibold text-slate-700">{lab.name}</p>
                    <p className="text-slate-500">{formatShortDate(lab.date)} · {lab.result}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 mb-3">
                <Image className="text-[var(--color-accent)]" size={18} />
                <h3 className="text-sm font-bold text-slate-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  Imaging Gallery
                </h3>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setShowGallery(true)}>
                Ver Galeria
              </Button>
            </div>
            {images.length === 0 ? (
              <p className="text-xs text-slate-500">Sem imagens registradas.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {images.slice(0, 6).map((img) => (
                  <button
                    key={img.id}
                    onClick={() => handleOpenCase(patientCases.find(c => c.imageUrl === img.url || c.exams?.some(e => e.imageUrls.includes(img.url)) || null) || patientCases[0])}
                    className="aspect-square rounded-lg bg-[var(--color-surface-muted)] border border-[var(--color-border)] overflow-hidden hover:border-[var(--color-accent)] transition-colors"
                    title={img.modality}
                  >
                    <img src={img.url} alt={img.modality} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            {images.length > 6 && (
              <Button variant="secondary" size="sm" className="w-full mt-3">
                Ver Todas
              </Button>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

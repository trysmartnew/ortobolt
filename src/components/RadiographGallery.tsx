import React, { useMemo } from 'react';
import { Card, Button, Badge, EmptyState, Spinner } from '@/components/ui';
import { ArrowLeft, User, PawPrint, Ruler, Activity, Calendar, Image, FileText, ChevronRight, Save } from 'lucide-react';
import type { ClinicalCase, CaseStatus, AnimalSpecies } from '@/types/index';
import { SPECIES_LABELS } from '@/constants/labels';

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

interface RadiographGalleryProps {
  patientName: string;
  species: AnimalSpecies;
  breed: string;
  ageYears: number;
  weightKg: number;
  avatarUrl?: string;
  cases: ClinicalCase[];
  onBack?: () => void;
}

export default function RadiographGallery({
  patientName,
  species,
  breed,
  ageYears,
  weightKg,
  avatarUrl,
  cases,
  onBack,
}: RadiographGalleryProps) {
  const patientCases = useMemo(() => {
    return [...cases].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [cases]);

  const timelineCards = useMemo(() => {
    const cards: Array<{ id: string; date: string; title: string; description: string; imageUrl?: string }> = [];
    for (const c of patientCases) {
      if (c.imageUrl) {
        cards.push({
          id: `${c.id}-main`,
          date: c.createdAt,
          title: c.title || 'Sem título',
          description: c.notes?.trim() || c.aiAnalysis?.recommendations?.slice(0, 2).join('; ') || 'Sem descrição',
          imageUrl: c.imageUrl,
        });
      }
      if (c.exams) {
        for (const exam of c.exams) {
          for (const url of exam.imageUrls) {
            cards.push({
              id: `${exam.id}-${url}`,
              date: exam.createdAt,
              title: exam.modality === 'radiograph' ? 'Radiografia' : exam.modality === 'clinical_photo' ? 'Foto Clínica' : 'Exame',
              description: exam.analysisText?.trim() || 'Sem descrição',
              imageUrl: url,
            });
          }
        }
      }
    }
    return cards.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [patientCases]);

  const radiographs = useMemo(() => {
    const list: Array<{ id: string; date: string; url: string; modality: string; analysisText?: string }> = [];
    for (const c of patientCases) {
      if (c.imageUrl && !c.exams?.some(e => e.modality === 'radiograph')) {
        list.push({ id: `${c.id}-img`, date: c.createdAt, url: c.imageUrl, modality: 'Radiografia', analysisText: c.notes });
      }
      if (c.exams) {
        for (const exam of c.exams) {
          if (exam.modality === 'radiograph') {
            for (const url of exam.imageUrls) {
              list.push({ id: exam.id, date: exam.createdAt, url, modality: 'Radiografia', analysisText: exam.analysisText });
            }
          }
        }
      }
    }
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [patientCases]);

  const ctScans = useMemo(() => {
    const list: Array<{ id: string; date: string; url: string; modality: string; analysisText?: string }> = [];
    for (const c of patientCases) {
      if (c.exams) {
        for (const exam of c.exams) {
          if (exam.modality !== 'radiograph') {
            for (const url of exam.imageUrls) {
              list.push({ id: exam.id, date: exam.createdAt, url, modality: exam.modality, analysisText: exam.analysisText });
            }
          }
        }
      }
    }
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [patientCases]);

  const historyItems = useMemo(() => {
    return [...patientCases]
      .filter(c => c.notes || c.imageUrl)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20);
  }, [patientCases]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="secondary" onClick={onBack}>
              <ArrowLeft size={16} /> Voltar ao Prontuário
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Galeria - Evolução Clínica e Visual de {patientName}
            </h1>
            <p className="text-sm text-slate-600">
              {SPECIES_LABELS[species] ?? species} / {breed || '—'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[var(--color-surface-muted)] border border-[var(--color-border)] flex items-center justify-center overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt={patientName} className="w-full h-full object-cover" />
            ) : (
              <User className="text-slate-400" size={20} />
            )}
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-900">{patientName}</p>
            <p className="text-xs text-slate-500">{ageYears ?? '—'} anos · {weightKg ?? '—'} kg</p>
          </div>
        </div>
      </div>

      <Card className="p-6">
        <h2 className="text-base font-bold text-slate-900 mb-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          Linha do Tempo Visual de Evolução
        </h2>
        {timelineCards.length === 0 ? (
          <EmptyState
            icon={<Image size={48} className="text-white/40" />}
            title="Sem imagens registradas"
            description="Adicione radiografias ou fotos clínicas para montar a linha do tempo visual."
          />
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {timelineCards.map((card) => (
              <div key={card.id} className="min-w-[220px] max-w-[220px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
                <div className="aspect-square bg-[var(--color-surface-muted)] overflow-hidden">
                  <img src={card.imageUrl} alt={card.title} className="w-full h-full object-cover" />
                </div>
                <div className="p-3">
                  <p className="text-xs font-semibold text-slate-900">{card.title}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{formatShortDate(card.date)}</p>
                  <p className="text-[10px] text-slate-600 mt-1 line-clamp-2">{card.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6 space-y-6">
        <h2 className="text-base font-bold text-slate-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          Arquivo de Exames de Imagem
        </h2>

        <div>
          <h3 className="text-sm font-semibold text-white/70 mb-3">Radiografias (RX)</h3>
          {radiographs.length === 0 ? (
            <p className="text-xs text-slate-500">Sem radiografias registradas.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {radiographs.map((item) => (
                <div key={item.id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
                  <div className="aspect-square bg-[var(--color-surface-muted)] overflow-hidden">
                    <img src={item.url} alt={item.modality} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-2">
                    <p className="text-[10px] font-semibold text-slate-900">{formatShortDate(item.date)}</p>
                    <p className="text-[10px] text-slate-500">{item.modality}</p>
                    {item.analysisText && (
                      <p className="text-[10px] text-slate-600 mt-1 line-clamp-2">{item.analysisText}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white/70 mb-3">Tomografia Computadorizada (TC)</h3>
          {ctScans.length === 0 ? (
            <p className="text-xs text-slate-500">Sem tomografias registradas.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {ctScans.map((item) => (
                <div key={item.id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
                  <div className="aspect-square bg-[var(--color-surface-muted)] overflow-hidden">
                    <img src={item.url} alt={item.modality} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-2">
                    <p className="text-[10px] font-semibold text-slate-900">{formatShortDate(item.date)}</p>
                    <p className="text-[10px] text-slate-500">{item.modality}</p>
                    {item.analysisText && (
                      <p className="text-[10px] text-slate-600 mt-1 line-clamp-2">{item.analysisText}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          Histórico Visual
        </h2>
        {historyItems.length === 0 ? (
          <EmptyState
            icon={<FileText size={48} className="text-white/40" />}
            title="Sem histórico visual"
            description="Registros clínicos com imagens aparecerão aqui."
          />
        ) : (
          <div className="space-y-3">
            {historyItems.map((c) => (
              <div key={c.id} className="flex items-center gap-4 p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
                <div className="w-16 h-16 rounded-lg bg-[var(--color-surface-muted)] border border-[var(--color-border)] flex-shrink-0 overflow-hidden">
                  {c.imageUrl ? (
                    <img src={c.imageUrl} alt={c.patientName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <Image size={20} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{c.title || c.patientName}</p>
                  <p className="text-xs text-slate-500">{formatShortDate(c.createdAt)} · {getStatusLabel(c.status)}</p>
                  {c.notes && (
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">{c.notes}</p>
                  )}
                </div>
                <Badge variant={c.status === 'completed' ? 'success' : c.status === 'critical' ? 'danger' : 'info'}>
                  {getStatusLabel(c.status)}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Button variant="secondary">
          <FileText size={16} /> Visualizar Todas
        </Button>
        <Button variant="primary">
          <Save size={16} /> Salvar Anotações
        </Button>
      </div>
    </div>
  );
}

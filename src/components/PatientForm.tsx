import React, { useState, useRef, useEffect } from 'react';
import { Card, Button, EmptyState, Spinner } from '@/components/ui';
import { Upload, X, User, UserRound, Phone, Mail, MapPin, FileText, Save, ArrowLeft } from 'lucide-react';
import { uploadCaseImage } from '@/services/supabase';
import { useApp } from '@/contexts/AppContext';
import type { ClinicalCase, AnimalSpecies } from '@/types/index';
import { SPECIES_LABELS } from '@/constants/labels';
import { CLINICAL_TERMS } from '@/constants/clinicalTerms';

const SEX_OPTIONS = ['Macho', 'Fêmea', 'Indefinido'] as const;
const SPECIES_OPTIONS: AnimalSpecies[] = ['canine', 'feline', 'equine', 'bovine', 'other'];

interface PatientFormProps {
  caseData?: ClinicalCase | null;
  onClose?: () => void;
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function formatDisplayDate(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('pt-BR');
}

function validateRequired(value: string, label: string): string | null {
  if (!value.trim()) return `${label} é obrigatório.`;
  return null;
}

function validateEmail(value: string): string | null {
  if (!value.trim()) return null;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(value.trim())) return 'E-mail inválido.';
  return null;
}

function validatePhone(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length < 10 || digits.length > 15) return 'Telefone inválido.';
  return null;
}

function validateCep(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  if (!digits && !value.trim()) return null;
  if (digits.length !== 8) return 'CEP deve conter 8 dígitos.';
  return null;
}

function validateNumber(value: string, label: string): string | null {
  if (!value.trim()) return null;
  const n = Number(value);
  if (Number.isNaN(n) || n < 0) return `${label} inválido.`;
  return null;
}

export default function PatientForm({ caseData, onClose }: PatientFormProps) {
  const { cases, addToast, updateCase: updateCaseAction } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const existing = caseData ?? cases[0] ?? null;

  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const [patientName, setPatientName] = useState(existing?.patientName ?? '');
  const [species, setSpecies] = useState<AnimalSpecies>(existing?.species ?? 'canine');
  const [breed, setBreed] = useState(existing?.breed ?? '');
  const [ageYears, setAgeYears] = useState(existing?.ageYears?.toString() ?? '');
  const [birthDate, setBirthDate] = useState('');
  const [sex, setSex] = useState('');
  const [color, setColor] = useState('');
  const [weightKg, setWeightKg] = useState(existing?.weightKg?.toString() ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(existing?.avatarUrl);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const [ownerName, setOwnerName] = useState('');
  const [ownerDocument, setOwnerDocument] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerAddress, setOwnerAddress] = useState('');
  const [ownerCity, setOwnerCity] = useState('');
  const [ownerCep, setOwnerCep] = useState('');

  const [firstConsultationDate, setFirstConsultationDate] = useState('');
  const [currentCondition, setCurrentCondition] = useState(existing?.notes ?? '');

  useEffect(() => {
    if (!existing) return;
    setPatientName(existing.patientName);
    setSpecies(existing.species);
    setBreed(existing.breed);
    setAgeYears(existing.ageYears?.toString() ?? '');
    setWeightKg(existing.weightKg?.toString() ?? '');
    setAvatarUrl(existing.avatarUrl);
    setCurrentCondition(existing.notes ?? '');
  }, [existing?.id]);

  const [loading, setLoading] = useState(false);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !existing?.id) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      try {
        const url = await uploadCaseImage(dataUrl, existing.id, 'avatar');
        if (url) {
          setAvatarUrl(url);
          addToast('Foto do paciente atualizada.', 'success');
        } else {
          addToast('Falha ao enviar foto.', 'error');
        }
      } catch {
        addToast('Erro ao processar imagem.', 'error');
      }
    };
    reader.readAsDataURL(file);
  }

  function removeAvatar() {
    setAvatarUrl(undefined);
    setAvatarFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function validate(): boolean {
    const next: Record<string, string | null> = {};
    next.patientName = validateRequired(patientName, 'Nome');
    next.breed = validateRequired(breed, 'Raça');
    next.ageYears = validateNumber(ageYears, 'Idade');
    next.weightKg = validateNumber(weightKg, 'Peso');
    next.ownerName = validateRequired(ownerName, 'Nome do tutor');
    next.ownerPhone = validatePhone(ownerPhone);
    next.ownerEmail = validateEmail(ownerEmail);
    next.ownerCep = validateCep(ownerCep);

    const hasError = Object.values(next).some((v): v is string => v !== null);
    setErrors(next);
    return !hasError;
  }

  async function handleSave() {
    if (!existing?.id || !validate()) return;

    setLoading(true);
    try {
      await updateCaseAction(existing.id, {
        patientName: patientName.trim(),
        species,
        breed: breed.trim(),
        ageYears: Number(ageYears),
        weightKg: Number(weightKg),
        notes: currentCondition.trim() || undefined,
      } as Partial<ClinicalCase>);

      const trimmed = existing.title?.trim() ? existing.title : patientName.trim() || 'Sem título';
      const title = `${CLINICAL_TERMS.patient}: ${trimmed}`;
      await updateCaseAction(existing.id, { title } as Partial<ClinicalCase>);

      addToast('Ficha cadastral salva com sucesso.', 'success');
      onClose?.();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Erro ao salvar ficha cadastral.', 'error');
    } finally {
      setLoading(false);
    }
  }

  if (!existing) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<FileText size={48} className="text-slate-300" />}
          title="Selecione um caso"
          description="Abra um caso clínico para editar a ficha cadastral."
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Ficha Cadastral: {patientName || 'Novo Paciente'}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            {SPECIES_LABELS[species] ?? species} / {breed || '—'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-[var(--color-surface-muted)] border border-[var(--color-border)] flex items-center justify-center overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt={patientName} className="w-full h-full object-cover" />
            ) : (
              <UserRound className="text-slate-400" size={24} />
            )}
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-900">{patientName || 'Sem nome'}</p>
            <p className="text-xs text-slate-500">{SPECIES_LABELS[species] ?? species} / {breed || '—'}</p>
            <div className="flex gap-2 mt-1">
              <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload size={14} /> Alterar Foto
              </Button>
              {avatarUrl && (
                <Button variant="ghost" size="sm" onClick={removeAvatar}>
                  <X size={14} />
                </Button>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
        </div>
      </div>

      <Card className="p-6 space-y-6">
        <SectionHeaderWithBorder title={`Dados do Paciente (${patientName || 'Paciente'})`} />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Nome">
            <input
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg bg-[var(--color-surface)] border text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] ${errors.patientName ? 'border-[var(--color-error)]' : 'border-[var(--color-border)]'}`}
            />
            {errors.patientName && <p className="text-xs text-[var(--color-error)] mt-1">{errors.patientName}</p>}
          </Field>

          <Field label="Espécie">
            <select
              value={species}
              onChange={(e) => setSpecies(e.target.value as AnimalSpecies)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            >
              {SPECIES_OPTIONS.map((s) => (
                <option key={s} value={s}>{SPECIES_LABELS[s] ?? s}</option>
              ))}
            </select>
          </Field>

          <Field label="Raça">
            <input
              value={breed}
              onChange={(e) => setBreed(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg bg-[var(--color-surface)] border text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] ${errors.breed ? 'border-[var(--color-error)]' : 'border-[var(--color-border)]'}`}
            />
            {errors.breed && <p className="text-xs text-[var(--color-error)] mt-1">{errors.breed}</p>}
          </Field>

          <Field label="Idade">
            <input
              type="number"
              min="0"
              value={ageYears}
              onChange={(e) => setAgeYears(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg bg-[var(--color-surface)] border text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] ${errors.ageYears ? 'border-[var(--color-error)]' : 'border-[var(--color-border)]'}`}
            />
            {errors.ageYears && <p className="text-xs text-[var(--color-error)] mt-1">{errors.ageYears}</p>}
          </Field>

          <Field label="Data de Nascimento">
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
          </Field>

          <Field label="Sexo">
            <select
              value={sex}
              onChange={(e) => setSex(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            >
              <option value="">Selecione</option>
              {SEX_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>

          <Field label="Cor">
            <input
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
          </Field>

          <Field label="Peso (kg)">
            <input
              type="number"
              min="0"
              step="0.1"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg bg-[var(--color-surface)] border text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] ${errors.weightKg ? 'border-[var(--color-error)]' : 'border-[var(--color-border)]'}`}
            />
            {errors.weightKg && <p className="text-xs text-[var(--color-error)] mt-1">{errors.weightKg}</p>}
          </Field>

          <Field label="Foto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--color-surface-muted)] border border-[var(--color-border)] flex items-center justify-center overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={patientName} className="w-full h-full object-cover" />
                ) : (
                  <User className="text-slate-400" size={16} />
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Upload size={14} /> Alterar
                </Button>
                {avatarUrl && (
                  <Button variant="ghost" size="sm" onClick={removeAvatar}>
                    <X size={14} />
                  </Button>
                )}
              </div>
            </div>
          </Field>
        </div>
      </Card>

      <Card className="p-6 space-y-6">
        <SectionHeaderWithBorder title={`Dados do Tutor (${CLINICAL_TERMS.owner})`} />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Nome Completo">
            <input
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg bg-[var(--color-surface)] border text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] ${errors.ownerName ? 'border-[var(--color-error)]' : 'border-[var(--color-border)]'}`}
            />
            {errors.ownerName && <p className="text-xs text-[var(--color-error)] mt-1">{errors.ownerName}</p>}
          </Field>

          <Field label="CPF/CNPJ">
            <input
              value={ownerDocument}
              onChange={(e) => setOwnerDocument(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
          </Field>

          <Field label="Telefone">
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" size={16} />
              <input
                value={ownerPhone}
                onChange={(e) => setOwnerPhone(e.target.value)}
                className={`w-full pl-9 pr-3 py-2 rounded-lg bg-[var(--color-surface)] border text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] ${errors.ownerPhone ? 'border-[var(--color-error)]' : 'border-[var(--color-border)]'}`}
              />
            </div>
            {errors.ownerPhone && <p className="text-xs text-[var(--color-error)] mt-1">{errors.ownerPhone}</p>}
          </Field>

          <Field label="E-mail">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" size={16} />
              <input
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                className={`w-full pl-9 pr-3 py-2 rounded-lg bg-[var(--color-surface)] border text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] ${errors.ownerEmail ? 'border-[var(--color-error)]' : 'border-[var(--color-border)]'}`}
              />
            </div>
            {errors.ownerEmail && <p className="text-xs text-[var(--color-error)] mt-1">{errors.ownerEmail}</p>}
          </Field>

          <Field label="Endereço">
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" size={16} />
              <input
                value={ownerAddress}
                onChange={(e) => setOwnerAddress(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              />
            </div>
          </Field>

          <Field label="Cidade">
            <input
              value={ownerCity}
              onChange={(e) => setOwnerCity(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
          </Field>

          <Field label="CEP">
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" size={16} />
              <input
                value={ownerCep}
                onChange={(e) => setOwnerCep(e.target.value)}
                className={`w-full pl-9 pr-3 py-2 rounded-lg bg-[var(--color-surface)] border text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] ${errors.ownerCep ? 'border-[var(--color-error)]' : 'border-[var(--color-border)]'}`}
              />
            </div>
            {errors.ownerCep && <p className="text-xs text-[var(--color-error)] mt-1">{errors.ownerCep}</p>}
          </Field>
        </div>
      </Card>

      <Card className="p-6 space-y-6">
        <SectionHeaderWithBorder title="Histórico Clínico e Notas" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Data da Primeira Consulta">
            <input
              type="date"
              value={firstConsultationDate}
              onChange={(e) => setFirstConsultationDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
          </Field>

          <Field label="Condição Atual" className="sm:col-span-2">
            <textarea
              value={currentCondition}
              onChange={(e) => setCurrentCondition(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
          </Field>
        </div>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>
          <ArrowLeft size={16} /> Voltar
        </Button>
        <Button variant="primary" onClick={handleSave} loading={loading} disabled={loading}>
          <Save size={16} /> Salvar Alterações
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-xs font-semibold text-[var(--color-text-secondary)]">{label}</label>
      {children}
    </div>
  );
}

function SectionHeaderWithBorder({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="text-base font-bold text-slate-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{title}</h2>
      <div className="h-px flex-1 bg-[var(--color-border)]" />
    </div>
  );
}

// src/services/backupService.ts
import { supabase } from './supabase';
import type { User, ClinicalCase, CaseExam } from '@/types/index';

type SanitizedUser = Pick<User, 'id' | 'name' | 'role' | 'specialty' | 'institution'>;
type SanitizedCase = Omit<ClinicalCase, 'veterinarianId' | 'notes' | 'aiAnalysis' | 'clinicalEvidence'> & {
  exams?: Array<Omit<CaseExam, 'markings' | 'markedAt' | 'markedBy'>>;
};

function sanitizeUser(u: User): SanitizedUser {
  return {
    id: u.id,
    name: u.name,
    role: u.role,
    specialty: u.specialty,
    institution: u.institution,
  };
}

function sanitizeCase(c: ClinicalCase): SanitizedCase {
  const { id, title, patientName, species, breed, ageYears, weightKg, procedure, status, precisionScore, riskLevel, createdAt, updatedAt, tags, imageUrl, avatarUrl, exams } = c;
  const cleanExams = (exams as CaseExam[] | undefined)?.map(({ id, modality, imageUrls, analysisText, createdAt }) => ({
    id,
    modality,
    imageUrls,
    analysisText,
    createdAt,
  }));
  return {
    id,
    title,
    patientName,
    species,
    breed,
    ageYears,
    weightKg,
    procedure,
    status,
    precisionScore,
    riskLevel,
    createdAt,
    updatedAt,
    tags,
    imageUrl,
    avatarUrl,
    exams: cleanExams,
  };
}

export async function exportUserData(userId: string): Promise<void> {
  const [profileResult, casesResult] = await Promise.all([
    supabase.from('users')
      .select('id, name, email, role, crmv, specialty, institution')
      .eq('id', userId)
      .single(),
    supabase.from('clinical_cases')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
  ]);

  if (profileResult.error) throw new Error(`Erro ao buscar perfil: ${profileResult.error.message}`);
  if (casesResult.error) throw new Error(`Erro ao buscar casos: ${casesResult.error.message}`);

  const backup = {
    version: '1.0',
    exported_at: new Date().toISOString(),
    user: sanitizeUser(profileResult.data as User),
    cases: (casesResult.data ?? []).map(sanitizeCase),
    total_cases: casesResult.data?.length ?? 0,
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ortobolt-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

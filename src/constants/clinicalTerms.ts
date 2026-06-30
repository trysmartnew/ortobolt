export const CLINICAL_TERMS = {
  patient: 'Paciente',
  pet: 'animal de estimação',
  tutor: 'Tutor',
  owner: 'Tutor',
  report: 'Laudo',
  analysis: 'Análise',
  radiograph: 'Radiografia',
  case: 'Caso Clínico',
} as const;

export type ClinicalTermKey = keyof typeof CLINICAL_TERMS;

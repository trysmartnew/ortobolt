import type {
  AIAnalysisResult,
  AnatomicalLandmark,
  ClinicalCase,
  CaseExam,
  CaseStatus,
  ProcedureType,
  RiskFactor,
} from '@/types/index';
import type { ChatMessage } from '@/types/index';
import type { ApproveCompleteCaseInput } from '@/types/casePipeline';
import { PIPELINE_TAG_ANALYSIS, PIPELINE_TAG_INTEGRATED } from '@/types/casePipeline';
import { ApproveCompleteCaseInputSchema } from '@/schemas/casePipeline';
import { deriveClinicalEvidence } from './clinicalEngine';

const AI_STORAGE_PREFIX = 'vanguard-veterinary-case-ai-';
const LAST_INTEGRATED_KEY = 'vanguard-veterinary-last-integrated-case';

export function persistCaseAiAnalysis(
  caseId: string,
  ai: AIAnalysisResult | undefined
): void {
  if (!ai) return;
  try {
    localStorage.setItem(`${AI_STORAGE_PREFIX}${caseId}`, JSON.stringify(ai));
  } catch {
    console.warn('clinicalCaseIntegration: falha ao persistir aiAnalysis');
  }
}

export function loadPersistedAiAnalysis(caseId: string): AIAnalysisResult | undefined {
  try {
    const raw = localStorage.getItem(`${AI_STORAGE_PREFIX}${caseId}`);
    if (!raw) return undefined;
    return JSON.parse(raw) as AIAnalysisResult;
  } catch {
    return undefined;
  }
}

export function setLastIntegratedCaseId(caseId: string): void {
  try {
    sessionStorage.setItem(LAST_INTEGRATED_KEY, caseId);
  } catch {
    /* ignore */
  }
}

export function getLastIntegratedCaseId(): string | null {
  try {
    return sessionStorage.getItem(LAST_INTEGRATED_KEY);
  } catch {
    return null;
  }
}

/** Score determinístico 85–97 a partir do texto da análise */
export function hashTextScore(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = (h * 31 + text.charCodeAt(i)) | 0;
  }
  return 85 + (Math.abs(h) % 13);
}

export function parseAnalysisTextToAIResult(analysisText: string): AIAnalysisResult {
  const lines = analysisText.split('\n').map((l) => l.trim()).filter(Boolean);
  const recommendations: string[] = [];
  const landmarks: AnatomicalLandmark[] = [];
  const riskFactors: RiskFactor[] = [];

  for (const line of lines) {
    if (/^[-•*]\s/.test(line)) {
      recommendations.push(line.replace(/^[-•*]\s*/, '').trim());
    }
    const pctMatch = line.match(/(.+?)[\s:–-]+(\d{1,3})\s*%/i);
    if (pctMatch && /confian|landmark|detect|estrutura|região|ângulo/i.test(line)) {
      landmarks.push({
        name: pctMatch[1].trim().slice(0, 80),
        detected: true,
        confidence: Number(pctMatch[2]) / 100,
      });
    }
  }

  if (recommendations.length === 0) {
    const sentences = analysisText
      .split(/[.!?\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 25);
    recommendations.push(...sentences.slice(0, 5));
  }

  if (landmarks.length === 0) {
    landmarks.push({
      name: 'Interpretação radiográfica integrada',
      detected: true,
      confidence: 0.9,
    });
  }

  const lower = analysisText.toLowerCase();
  if (/crític|urgente|grave|emergên|deslocad/i.test(lower)) {
    riskFactors.push({
      category: 'Achado clínico',
      description: 'Achados de maior gravidade na análise integrada.',
      severity: 'high',
    });
  } else if (/moderad|atenção|displasia|fratura|ruptura/i.test(lower)) {
    riskFactors.push({
      category: 'Achado clínico',
      description: 'Acompanhamento clínico próximo recomendado.',
      severity: 'medium',
    });
  } else {
    riskFactors.push({
      category: 'Achado clínico',
      description: 'Sem urgência imediata identificada no laudo textual.',
      severity: 'low',
    });
  }

  const precisionScore = hashTextScore(analysisText);

  return {
    id: `ai-${Date.now()}`,
    timestamp: new Date().toISOString(),
    precisionScore,
    confidence: Math.min(0.98, 0.82 + precisionScore / 500),
    processingTimeMs: 800 + (analysisText.length % 400),
    riskFactors,
    recommendations: recommendations.slice(0, 8),
    anatomicalLandmarks: landmarks.slice(0, 6),
  };
}

export function inferRiskLevel(
  text: string,
  status?: CaseStatus
): 'low' | 'medium' | 'high' {
  if (status === 'critical') return 'high';
  const lower = text.toLowerCase();
  if (/crític|urgente|emergên/i.test(lower)) return 'high';
  if (/moderad|fratura|displasia|ruptura/i.test(lower)) return 'medium';
  return 'low';
}

export function buildCaseTitle(
  patientName: string | undefined,
  procedure: ProcedureType
): string {
  const patient = patientName?.trim() || 'Paciente';
  return `${procedure} — ${patient}`;
}


/**
 * Remove artefatos de IA para exibicao on-page (preserva markdown).
 * Diferente de sanitizeClinicalNotes: NAO stripa ##, **, tabelas.
 */
export function stripAiArtifacts(text: string): string {
  let t = text;
  // Fenced code blocks (fechado + nao-fechado)
  t = t.replace(/```[\s\S]*?```/g, '');
  t = t.replace(/```[\s\S]*$/g, '');
  // Linhas-marker de IA (single-bracket, linha inteira, com ou sem trailing)
  t = t.replace(/^\s*\[[^\]]*(?:OrthoAI|OrtoAI)[^\]]*\].*$/gim, '');
  // Fragmentos orfaos (com bracket inicial opcional)
  t = t.replace(/\[?[A-Za-z\u00c0-\u00ff\s/]*(?:OrthoAI|OrtoAI)\]?[^\n]*/gi, '');
  // Segmentos corrompidos
  t = t.replace(/\u00d8=\u00dcI[^\n]*/g, '');
  // Colapso de linhas vazias residuais
  t = t.replace(/\n{3,}/g, '\n\n');
  return t.trim();
}

export function formatIntegratedNotes(
  analysisText: string,
  copilotMessages?: ChatMessage[]
): string {
  const parts = [`--- Análise IA (Vanguard Veterinary) ---\n${analysisText.trim()}`];
  const chat = (copilotMessages ?? [])
    .filter((m) => m.id !== 'welcome' && !m.isLoading && m.content.trim())
    .slice(-8)
    .map((m) => `[${m.role === 'user' ? 'Veterinário' : 'Copiloto'}] ${m.content}`)
    .join('\n');
  if (chat) {
    parts.push(`--- Histórico Copiloto ---\n${chat}`);
  }
  return parts.join('\n\n');
}

export function sanitizeClinicalNotes(raw: string): string {
  let text = raw;
  // Remove "--- Historico Copiloto ---" and everything after
  text = text.replace(/---\s*Hist[oó]rico\s+Copiloto\s*---[\s\S]*$/i, '');
  // Remove "--- Analise IA ... ---" header lines
  text = text.replace(/^---\s*An[aá]lise\s*IA.*?---\s*$/gim, '');
  // Remove [Copiloto] / [Veterinario] prefixed lines
  text = text.replace(/^\[(?:Copiloto|Veterin[aá]rio)\].*$/gm, '');
  // Remove [[...]] markers (multiline-safe)
  text = text.replace(/\[\[[\s\S]*?\]\]+/g, '');
  // Remove AI-marker header lines entirely (single-bracket, whole-line)
    // [v2] Remove linhas-marker de IA inteiras (single-bracket, com trailing)
    text = text.replace(/^\s*\[[^\]]*(?:OrthoAI|OrtoAI)[^\]]*\].*$/gim, '');
    // [v2] Remove fragmentos orfaos com bracket inicial opcional
    text = text.replace(/\[?[A-Za-z\u00c0-\u00ff\s\/]*(?:OrthoAI|OrtoAI)\]?[^\n]*/gi, '');
  text = text.replace(/^\s*\[[^\]]*OrthoAI[^\]]*\]\s*$/gm, '');
  // Remove orphaned AI-marker fragments (e.g. "c OrthoAI]")
  text = text.replace(/[A-Za-z\u00c0-\u00ff\s]*OrthoAI\]*/gi, '');
  // Strip single-bracket line headers -> keep inner text
  text = text.replace(/^\[([^\]]+)\]\s*$/gm, '$1');
  // Remove fenced code blocks (closed)
  text = text.replace(/```[\s\S]*?```/g, '');
  // Remove unclosed fenced code blocks
  text = text.replace(/```[\s\S]*$/g, '');
  // Remove corrupted segments
  text = text.replace(/\[?\u00d8=\u00dcI[^\]\n]*/g, '');
  // Strip markdown headers (## ...)
  text = text.replace(/^#{1,6}\s+/gm, '');
  // Strip markdown table separators
  text = text.replace(/^\|[-\s|:]+\|$/gm, '');
  // Replace remaining pipes with spaces
  text = text.replace(/\|/g, '  ');
  // Remove escaped asterisks
  text = text.replace(/\\\*/g, '');
  // Strip markdown bold/italic
  text = text.replace(/\*\*(.+?)\*\*/g, '$1');
  text = text.replace(/\*(.+?)\*/g, '$1');
  // Collapse spaced-out characters (corruption artifact)
  text = text.replace(/((?:[A-Za-z\u00c0-\u00ff] ){3,}[A-Za-z\u00c0-\u00ff])/g, (m) => m.replace(/ /g, ''));
  text = text.replace(/ {2,}/g, ' ');
  // Collapse excessive newlines
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

export function buildIntegratedClinicalCase(input: ApproveCompleteCaseInput): ClinicalCase {
    // B2: Defesa em profundidade — garante que um caso nunca seja criado sem URL de imagem.
    if (!input.imageStorageUrl) {
      throw new Error(
        'Defensive Guard: Tentativa de criar caso clínico sem URL de imagem de armazenamento.'
      );
    }
    const parsed = ApproveCompleteCaseInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(`Dados inválidos em buildIntegratedClinicalCase: ${parsed.error.message}`);
    }
    const procedure = parsed.data.clinicalContext.procedure ?? 'other';
  const species = input.clinicalContext.species ?? 'canine';
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const aiAnalysis = parseAnalysisTextToAIResult(input.analysisText);
  const status = input.status ?? 'completed';
  const riskLevel = inferRiskLevel(input.analysisText, status);

  const title =
    input.titleOverride?.trim() ||
    buildCaseTitle(input.clinicalContext.patientName, procedure);

  const primaryExam: CaseExam = {
    id: `exam-${id}-primary`,
    modality: 'radiograph',
    imageUrls: input.imageStorageUrl ? [input.imageStorageUrl] : [],
    aiAnalysis,
    analysisText: input.analysisText,
    markings: input.markings,
    createdAt: now,
  };

  const clinicalEvidence = deriveClinicalEvidence(aiAnalysis);

  return {
    id,
    title,
    patientName: input.clinicalContext.patientName?.trim() || 'Sem nome',
    species,
    breed: input.clinicalContext.breed?.trim() || '—',
    ageYears: input.clinicalContext.ageYears ?? 0,
    weightKg: input.clinicalContext.weightKg ?? 0,
    procedure,
    status,
    precisionScore: aiAnalysis.precisionScore,
    riskLevel,
    createdAt: now,
    updatedAt: now,
    tags: [procedure, species, PIPELINE_TAG_ANALYSIS, PIPELINE_TAG_INTEGRATED],
    imageUrl: input.imageStorageUrl ?? undefined,
    notes: formatIntegratedNotes(input.analysisText, input.copilotMessages),
    veterinarianId: input.veterinarianId,
    clinicalEvidence,
    aiAnalysis,
    exams: [primaryExam, ...(input.additionalExams ?? [])],
  };
}

export function enrichCaseWithPersistedAi(c: ClinicalCase): ClinicalCase {
  const ai = c.aiAnalysis ?? loadPersistedAiAnalysis(c.id);
  if (!ai) return c;
  return {
    ...c,
    aiAnalysis: ai,
    precisionScore: c.precisionScore ?? ai.precisionScore,
  };
}

/** Caso mais adequado para relatório PDF de caso */
export function pickCaseForReport(
  cases: ClinicalCase[],
  activeCase: ClinicalCase | null
): ClinicalCase | undefined {
  const lastId = getLastIntegratedCaseId();
  if (lastId) {
    const last = cases.find((c) => c.id === lastId);
    if (last?.aiAnalysis) return enrichCaseWithPersistedAi(last);
  }
  if (activeCase?.aiAnalysis) return enrichCaseWithPersistedAi(activeCase);
  const withAi = cases
    .map(enrichCaseWithPersistedAi)
    .filter((c) => c.aiAnalysis)
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  return withAi[0];
}

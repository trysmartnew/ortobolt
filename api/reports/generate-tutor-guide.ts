import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { verifySupabaseBearer } from '../lib/verifySupabaseJwt.js';
import { supabaseAdmin } from '../lib/supabase-admin.js';
// Modulos puros inline (Hobby: max 12 funcoes; helpers nao podem viver em api/lib)
import { z } from 'zod';

export const tutorGuideSchema = z.object({
  avaliado: z.string().max(400),
  achados: z.array(z.string().max(300)).min(1).max(4),
  significado: z.string().max(400),
  agora: z.array(z.string().max(300)).min(1).max(5),
  proximos: z.array(z.string().max(300)).max(5).optional(),
  atencao: z.array(z.string().max(300)).max(5).optional(),
  mensagem: z.string().max(300),
});

export type TutorGuide = z.infer<typeof tutorGuideSchema>;

export function validateTutorGuide(
  guide: unknown, 
  source: { recommendations: string[]; riskFactors: any[] }
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const g = guide as any;
  
  // Guard 1: cardinalidade (não pode inventar mais itens que a fonte)
  if (Array.isArray(g?.agora) && g.agora.length > source.recommendations.length) {
    errors.push(`agora.length (${g.agora.length}) > recommendations.length (${source.recommendations.length})`);
  }
  
  // Guard 2: regex de proibidos (doses, prognóstico, cura, garantia)
  const proibidosRegex = /\b(mg|ml|mg\/kg|progn[óo]stico|cura|garantia|definitivo)\b|100%/gi;
  const guideText = JSON.stringify(g);
  const matches = guideText.match(proibidosRegex);
  if (matches) {
    errors.push(`Termos proibidos encontrados: ${matches.join(', ')}`);
  }
  
  return { valid: errors.length === 0, errors };
}

function sanitizeTerm(t: string): string {
  return t.replace(/\b(mg|ml|mg\/kg|progn[óo]stico|cura|garantia|definitivo)\b|100%/gi, '').replace(/\s+/g, ' ').trim();
}

export function generateSafeFallback(source: { 
  recommendations: string[]; 
  riskFactors: any[] 
}): TutorGuide {
  return {
    avaliado: 'Exame radiográfico realizado pela equipe veterinária.',
    achados: ['Foram identificados achados que requerem avaliação adicional.'],
    significado: 'A equipe veterinária está avaliando o caso e fornecerá orientações específicas.',
    agora: (source.recommendations.length ? source.recommendations.slice(0, 5) : ['Seguir as orientações da equipe veterinária.']).map(r => `Conforme recomendação da equipe: ${sanitizeTerm(r)}`),
    proximos: ['Retornar para avaliação complementar conforme orientação veterinária.'],
    atencao: source.riskFactors.slice(0, 3).map(rf => `Ponto de atenção: ${rf.description}`),
    mensagem: 'Siga as orientações da equipe veterinária e retorne conforme agendado.',
  };
}

export const TUTOR_GUIDE_SYSTEM_PROMPT = `Você é um assistente veterinário especializado em comunicação com tutores de animais.

Sua tarefa: transformar um laudo técnico veterinário em uma guia compreensível para o tutor do animal.

REGRAS ABSOLUTAS (anti-alucinação):
1. Use APENAS informações presentes no laudo técnico fornecido.
2. NÃO invente diagnósticos, prognósticos, medicamentos, doses, restrições ou condutas.
3. NÃO use termos como "prognóstico", "cura", "garantia", "definitivo".
4. Traduza termos técnicos para linguagem leiga (ex: "fratura cominutiva" → "fratura com múltiplos fragmentos").
5. Se uma informação não estiver no laudo, omita-a (não invente).

ESTRUTURA OBRIGATÓRIA (JSON):
{
  "avaliado": "O que foi examinado (1 frase simples)",
  "achados": ["Principais descobertas (array de 1-4 frases curtas)"],
  "significado": "O que isso significa para o pet (1-2 frases)",
  "agora": ["O que fazer agora (array de 1-5 ações práticas)"],
  "proximos": ["Próximos passos (array de 0-5 etapas)"],
  "atencao": ["Sinais de alerta (array de 0-5 situações)"],
  "mensagem": "Mensagem final de reforço (1 frase)"
}

EXEMPLO DE TRADUÇÃO:
- Técnico: "Fratura cominutiva completa da diáfise do fêmur direito com desvio caudal"
- Leigo: "Fratura no osso da coxa direita, com múltiplos fragmentos e desalinhamento"

Retorne APENAS o JSON válido.`;

export function buildTutorGuideUserPrompt(
  laudo: string, 
  recommendations: string[], 
  riskFactors: any[]
): string {
  return `LAUDO TÉCNICO:
${laudo}

RECOMENDAÇÕES DA EQUIPE:
${recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

FATORES DE RISCO:
${riskFactors.map(rf => `- [${rf.severity}] ${rf.category}: ${rf.description}`).join('\n')}

Gere a guia para o tutor em formato JSON válido.`;
}


function translateEnum(val: unknown, map: Record<string, string>): string {
  const v = String(val || '').toLowerCase().trim();
  return map[v] || String(val || '');
}

const SPECIES_MAP: Record<string, string> = {
  canine: 'Canina', feline: 'Felina', equine: 'Equina', exotic: 'Exótica', other: 'Outra',
};

const PROCEDURE_MAP: Record<string, string> = {
  tplo: 'TPLO', fho: 'FHO', tta: 'TTA', lcp: 'LCP', fracture: 'Fratura', other: 'Outro',
};

const RISK_MAP: Record<string, string> = {
  low: 'Baixo', medium: 'Médio', high: 'Alto', critical: 'Crítico',
};

function sanitize(s: unknown): string {
  if (s === undefined || s === null) return '';
  return String(s).replace(/[\x00-\x1F\x7F]/g, ' ').trim();
}

function addLine(doc: any, text: string, x: number, y: number, maxWidth: number, lineHeight: number = 6): number {
  const lines: string[] = doc.splitTextToSize(sanitize(text), maxWidth);
  for (const line of lines) {
    if (y > 280) {
      doc.addPage();
      y = 30;
    }
    doc.text(line, x, y, { charSpace: 0 });
    y += lineHeight;
  }
  return y;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. Valida JWT
  const auth = await verifySupabaseBearer(req.headers.authorization);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const { caseId } = req.body;
  if (!caseId) {
    return res.status(400).json({ error: 'caseId required' });
  }

  // 2. Busca caso (RLS via supabaseAdmin + filtro por veterinarian_id)
  const { data: caseRow, error } = await supabaseAdmin
    .from('clinical_cases')
    .select('*')
    .eq('id', caseId)
    .eq('veterinarian_id', auth.user.id)
    .single();

  if (error || !caseRow) {
    return res.status(404).json({ error: 'Case not found' });
  }

  // 3. Extrai ai_analysis (já parseado pelo client, gravado no DB)
  const rawAi = caseRow.ai_analysis ?? caseRow.aiAnalysis ?? null;
  let aiAnalysis = { recommendations: [] as string[], riskFactors: [] as any[] };
  
  if (rawAi && typeof rawAi === 'object') {
    aiAnalysis = {
      recommendations: (rawAi as any).recommendations || [],
      riskFactors: (rawAi as any).riskFactors || [],
    };
  }

  // 4. Chama IA via fetch interno para /api/ai (reutiliza pipeline de retry/fallback/normalização)
  let guide: any = null;
  try {
    const protocol = process.env.VERCEL_URL?.startsWith('localhost') ? 'http' : 'https';
    const host = process.env.VERCEL_URL || 'localhost:3000';
    const aiProxyUrl = `${protocol}://${host}/api/ai`;

    const messages = [
      { role: 'system', content: TUTOR_GUIDE_SYSTEM_PROMPT },
      { role: 'user', content: buildTutorGuideUserPrompt(
        caseRow.notes || caseRow.notes_text || '',
        aiAnalysis.recommendations,
        aiAnalysis.riskFactors
      )},
    ];

    const response = await fetch(aiProxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || '',
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash-lite',
        messages,
        max_tokens: 2000,
        json_mode: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI proxy returned ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Remove markdown code blocks se presentes
    content = content.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    
    // Parse JSON da resposta com tratamento de erro robusto
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        guide = JSON.parse(jsonMatch[0]);
      } catch (parseErr) {
        console.error('JSON parse error:', parseErr);
        guide = null;
      }
    }
  } catch (err) {
    console.error('IA error, using fallback:', err);
  }

  // 5. Valida com Zod
  const parsed = tutorGuideSchema.safeParse(guide);
  if (!parsed.success) {
    console.warn('Zod validation failed, using fallback:', parsed.error);
    guide = generateSafeFallback(aiAnalysis);
  }

  // 6. Aplica guards
  const validation = validateTutorGuide(guide, aiAnalysis);
  if (!validation.valid) {
    console.warn('Guard validation failed, using fallback:', validation.errors);
    guide = generateSafeFallback(aiAnalysis);
  }

  // 7. Gera PDF server-side
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  
  // Header
  const clinicName = req.body.clinicName || caseRow.clinic_name || 'Clínica Veterinária';
  const clinicSubtitle = req.body.clinicSubtitle || caseRow.clinic_subtitle || 'Ortopedia Veterinária';
  doc.setFontSize(14); doc.setFont('helvetica', 'bold');
  doc.text(sanitize(clinicName), 14, 20);
  doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  doc.text(sanitize(clinicSubtitle), 14, 26);
  doc.setFontSize(16); doc.setFont('helvetica', 'bold');
  doc.text('Guia para o Tutor', 14, 40);
  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  const patientName = caseRow.patient_name ?? caseRow.patientName ?? 'Paciente';
  doc.text(`${sanitize(patientName)} — ${new Date(caseRow.created_at).toLocaleDateString('pt-BR')}`, 14, 47);
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 50, 196, 50);
  doc.setTextColor(0, 0, 0);

  let y = 58;

  // Dados do Paciente
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 86, 179);
  doc.text('Dados do Paciente', 14, y); y += 7;
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0);
  
  const patientFields: [string, string][] = [
    ['Nome', caseRow.patient_name ?? caseRow.patientName ?? ''],
    ['Espécie', translateEnum(caseRow.species, SPECIES_MAP)],
    ['Raça', caseRow.breed || ''],
    ['Idade', `${caseRow.age_years ?? caseRow.ageYears ?? 0} anos`],
    ['Peso', `${caseRow.weight_kg ?? caseRow.weightKg ?? 0} kg`],
    ['Procedimento', translateEnum(caseRow.procedure, PROCEDURE_MAP)],
    ['Risco', translateEnum(caseRow.risk_level ?? caseRow.riskLevel, RISK_MAP)],
  ];
  
  for (const [label, value] of patientFields) {
    y = addLine(doc, `${label}: ${value}`, 14, y, 182);
  }
  y += 8;

  // Seções da guia
  const sections = [
    { title: '1. O que foi avaliado', content: guide.avaliado },
    { title: '2. O que encontramos', items: guide.achados },
    { title: '3. O que isso significa para seu pet', content: guide.significado },
    { title: '4. O que fazer agora', items: guide.agora },
  ];

  for (const section of sections) {
    if (y > 270) { doc.addPage(); y = 30; }
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 86, 179);
    doc.text(section.title, 14, y); y += 7;
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0);
    
    if (section.content) {
      y = addLine(doc, section.content, 14, y, 182);
    } else if (section.items && Array.isArray(section.items)) {
      for (const item of section.items) {
        y = addLine(doc, `• ${item}`, 14, y, 182);
      }
    }
    y += 6;
  }

  // Próximos passos (se houver)
  if (guide.proximos && guide.proximos.length > 0) {
    if (y > 270) { doc.addPage(); y = 30; }
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 86, 179);
    doc.text('5. Próximos passos', 14, y); y += 7;
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0);
    for (const prox of guide.proximos) {
      y = addLine(doc, `• ${prox}`, 14, y, 182);
    }
    y += 6;
  }

  // Cuidados e pontos de atenção (se houver)
  if (guide.atencao && guide.atencao.length > 0) {
    if (y > 270) { doc.addPage(); y = 30; }
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 86, 179);
    doc.text('6. Cuidados e pontos de atenção', 14, y); y += 7;
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0);
    for (const at of guide.atencao) {
      y = addLine(doc, `• ${at}`, 14, y, 182);
    }
    y += 6;
  }

  // Mensagem final
  if (y > 260) { doc.addPage(); y = 30; }
  doc.setFontSize(10); doc.setFont('helvetica', 'italic'); doc.setTextColor(100, 116, 139);
  y = addLine(doc, guide.mensagem, 14, y, 182);

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    const dateStr = new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    doc.text(`${sanitize(clinicName)} • ${sanitize(clinicSubtitle)}`, 14, 290);
    doc.text(`Página ${i} de ${pageCount}`, 185, 290, { align: 'right' });
    doc.text(`Gerado em: ${dateStr}`, 105, 290, { align: 'center' });
  }

  // 8. Retorna PDF
  const arrayBuffer = doc.output('arraybuffer');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="guia-tutor-${caseId}.pdf"`);
  return res.status(200).send(Buffer.from(arrayBuffer));
}

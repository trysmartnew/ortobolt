import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { verifySupabaseBearer } from '../lib/verifySupabaseJwt.js';
import { supabaseAdmin } from '../lib/supabase-admin.js';
import { jsPDF } from 'jspdf';
import { tutorGuideSchema, validateTutorGuide, generateSafeFallback } from '../lib/tutorGuide.js';
import { TUTOR_GUIDE_SYSTEM_PROMPT, buildTutorGuideUserPrompt } from '../lib/tutorGuidePrompts.js';

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
    const content = data.choices?.[0]?.message?.content || data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Parse JSON da resposta
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      guide = JSON.parse(jsonMatch[0]);
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
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  
  // Header
  const clinicName = caseRow.clinic_name || 'Clínica Veterinária';
  const clinicSubtitle = caseRow.clinic_subtitle || 'Ortopedia Veterinária';
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
    if (y > 260) { doc.addPage(); y = 30; }
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
    if (y > 260) { doc.addPage(); y = 30; }
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
    if (y > 260) { doc.addPage(); y = 30; }
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

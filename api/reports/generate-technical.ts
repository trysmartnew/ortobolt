import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifySupabaseBearer } from '../lib/verifySupabaseJwt.js';
import { applyCors } from '../lib/cors.js';
import { supabaseAdmin } from '../lib/supabase-admin.js';

function sanitize(s: unknown): string {
  return String(s ?? '').replace(/[\x00-\x1F\x7F]/g, '').trim();
}

function serializeField(val: unknown): string {
  if (typeof val === 'string') return val;
  try { return JSON.stringify(val, null, 2); } catch { return String(val); }
}

function field(val: unknown): string {
  const s = sanitize(val);
  return s || '—';
}

function addLine(doc: any, text: string, x: number, y: number, maxWidth: number, lineHeight: number = 6): number {
  const split = doc.splitTextToSize(text, maxWidth);
  for (const line of split) {
    if (y > 270) {
      doc.setFontSize(9);
      doc.text('Vanguard Veterinary — Ortopedia Veterinária', 15, 287);
      doc.addPage();
      y = 20;
      doc.setFontSize(10);
    }
    doc.text(line, x, y);
    y += lineHeight;
  }
  return y;
}

function stripPdfNotes(text: string): string {
  if (!text) return '';
  let cleaned = text;

  const copilotIdx = cleaned.indexOf('--- Histórico Copiloto---');
  if (copilotIdx !== -1) {
    cleaned = cleaned.substring(0, copilotIdx);
  }

  cleaned = cleaned.replace(/---\s*Análise IA.*?---/g, '');
  cleaned = cleaned.replace(/```[\s\S]*?(?:```|$)/g, '');
  cleaned = cleaned.replace(/^#{1,4}\s+/gm, '');
  cleaned = cleaned.replace(/\*\*(.+?)\*\*/g, '$1');
  cleaned = cleaned.replace(/\*(.+?)\*/g, '$1');
  cleaned = cleaned.replace(/^\|[-\s|:]+\|$/gm, '');
  cleaned = cleaned.replace(/\|/g, ' — ');
  cleaned = cleaned.replace(/^---+$/gm, '');
  cleaned = cleaned.replace(/\[\[.*?\]\]/g, '');
  cleaned = cleaned.replace(/\[(.*?)\]\(.*?\)/g, '$1');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.replace(/[ \t]{2,}/g, ' ');

  return cleaned.trim();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(res, (req.headers.origin as string) || '');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await verifySupabaseBearer(req.headers.authorization);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const caseId = sanitize(body?.caseId);
    if (!caseId) return res.status(400).json({ error: 'caseId is required' });

    const { data: caseRow, error } = await supabaseAdmin
      .from('clinical_cases')
      .select('*')
      .eq('id', caseId)
      .eq('veterinarian_id', auth.user.id)
      .single();

    if (error || !caseRow) return res.status(404).json({ error: 'Case not found' });

    let vetName = '—';
    let vetCrmv = '—';
    try {
      const { data: vetProfile } = await supabaseAdmin
        .from('profiles')
        .select('name, crmv')
        .eq('id', auth.user.id)
        .single();
      if (vetProfile) {
        vetName = field(vetProfile.name);
        vetCrmv = field(vetProfile.crmv);
      }
    } catch { /* fallback: manter '—' */ }

    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    doc.setCharSpace(0);

    const now = new Date();
    const dateStr = now.toLocaleString('pt-BR');

    // ─── Cabeçalho Clínico ───
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('VANGUARD VETERINARY', 15, 20);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Ortopedia Veterinária', 15, 26);
    doc.setDrawColor(0, 86, 179);
    doc.line(15, 30, 195, 30);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('LAUDO TÉCNICO', 15, 40);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Data: ${dateStr}`, 15, 47);
    doc.text(`Responsável Técnico: ${vetName} — CRMV: ${vetCrmv}`, 15, 53);

    // ─── 1. DADOS DO PACIENTE ───
    let y = 63;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('1. DADOS DO PACIENTE', 15, y);
    y += 7;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    y = addLine(doc, `Nome: ${field(caseRow.patient_name ?? caseRow.patientName)}`, 18, y, 170);
    y = addLine(doc, `Espécie: ${field(caseRow.species)}`, 18, y, 170);
    y = addLine(doc, `Raça: ${field(caseRow.breed)}`, 18, y, 170);
    y = addLine(doc, `Idade: ${field(caseRow.age_years ?? caseRow.ageYears)} anos`, 18, y, 170);
    y = addLine(doc, `Peso: ${field(caseRow.weight_kg ?? caseRow.weightKg)} kg`, 18, y, 170);
    y = addLine(doc, `Procedimento: ${field(caseRow.procedure)}`, 18, y, 170);
    y = addLine(doc, `Status: ${field(caseRow.status)}`, 18, y, 170);
    y += 4;

    // ─── 2. NOTAS CLÍNICAS ───
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('2. NOTAS CLÍNICAS', 15, y);
    y += 7;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const notesContent = stripPdfNotes(sanitize(caseRow.notes ?? caseRow.notes_text ?? ''));
    if (notesContent) {
      y = addLine(doc, notesContent, 18, y, 170);
    } else {
      doc.text('—', 18, y);
      y += 6;
    }
    y += 4;

    // ─── 3. ANÁLISE DE IA ───
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('3. ANÁLISE DE IA', 15, y);
    y += 7;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    // AI analysis (if present)
    const rawAi = caseRow.ai_analysis ?? caseRow.aiAnalysis ?? null;
    let aiObj: any = null;
    if (rawAi) {
      try { aiObj = typeof rawAi === 'string' ? JSON.parse(rawAi) : rawAi; } catch { aiObj = rawAi; }
    }
    if (aiObj) {
      // Landmarks Anatômicos
      doc.setFontSize(10);
      doc.text('Landmarks Anatômicos:', 15, y);
      y += 5;
      const landmarks = Array.isArray(aiObj.anatomicalLandmarks) ? aiObj.anatomicalLandmarks : [];
      if (landmarks.length === 0) {
        doc.text('—', 18, y);
        y += 5;
      } else {
        for (const lm of landmarks) {
          const label = lm?.name ? sanitize(lm.name) : '—';
          const status = lm?.detected ? `✓ ${Math.round((lm.confidence ?? 0) * 100)}%` : '✗ Não detectado';
          const bullet = `• ${label}: ${status}`;
          const split = doc.splitTextToSize(bullet, 170);
          for (const s of split) {
            if (y > 270) { doc.addPage(); y = 20; }
            doc.text(s, 18, y);
            y += 5;
          }
        }
      }
      y += 4;

      // Recomendações
      doc.text('Recomendações:', 15, y);
      y += 5;
      const recs = Array.isArray(aiObj.recommendations) ? aiObj.recommendations : [];
      if (recs.length === 0) {
        doc.text('—', 18, y);
        y += 5;
      } else {
        for (const r of recs) {
          const bullet = `• ${sanitize(typeof r === 'string' ? r : JSON.stringify(r))}`;
          const split = doc.splitTextToSize(bullet, 170);
          for (const s of split) {
            if (y > 270) { doc.addPage(); y = 20; }
            doc.text(s, 18, y);
            y += 5;
          }
        }
      }
      y += 4;

      // Fatores de Risco
      doc.text('Fatores de Risco:', 15, y);
      y += 5;
      const risks = Array.isArray(aiObj.riskFactors) ? aiObj.riskFactors : [];
      if (risks.length === 0) {
        doc.text('—', 18, y);
        y += 5;
      } else {
        for (const rf of risks) {
          const sev = rf?.severity ? `[${sanitize(String(rf.severity)).toUpperCase()}] ` : '';
          const cat = rf?.category ? `${sanitize(rf.category)}: ` : '';
          const desc = rf?.description ? sanitize(rf.description) : sanitize(serializeField(rf));
          const bullet = `• ${sev}${cat}${desc}`;
          const split = doc.splitTextToSize(bullet, 170);
          for (const s of split) {
            if (y > 270) { doc.addPage(); y = 20; }
            doc.text(s, 18, y);
            y += 5;
          }
        }
      }
    }

    // ─── 4. ASSINATURA E VALIDAÇÃO ───
    y += 10;
    if (y > 190) {
      doc.addPage();
      y = 30;
    }

    // Linha de assinatura
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(60, y + 25, 150, y + 25);

    // Nome do responsável (abaixo da linha)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(vetName, 105, y + 31, { align: 'center' });

    // CRMV
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`CRMV: ${vetCrmv}`, 105, y + 36, { align: 'center' });

    // Data e hora de emissão
    doc.text(`Emitido em: ${dateStr}`, 105, y + 41, { align: 'center' });

    // Campo de carimbo (à esquerda)
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Carimbo:', 20, y + 25);
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.rect(20, y + 28, 35, 20);

    // Reset
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('Vanguard Veterinary — Ortopedia Veterinária', 15, 287);
      doc.text(`Página ${i} de ${pageCount}`, 170, 287);
      doc.text(`Gerado em: ${dateStr}`, 105, 287, { align: 'center' });
    }
    doc.setTextColor(0, 0, 0);

    const arrayBuffer = doc.output('arraybuffer');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="laudo-tecnico.pdf"');
    return res.status(200).send(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error('generate-technical error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

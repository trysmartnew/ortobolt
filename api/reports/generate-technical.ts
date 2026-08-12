import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifySupabaseBearer } from '../lib/verifySupabaseJwt.js';
import { applyCors } from '../lib/cors.js';
import { supabaseAdmin } from '../lib/supabase-admin.js';












import { sanitize, serializeField, parseConfidence, removeAiDuplicateSections, SPECIES_MAP, PROCEDURE_MAP, STATUS_MAP, translateEnum, field, addLine, stripPdfNotes } from '../lib/pdf-helpers.js';

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
    

    const now = new Date();
    const dateStr = now.toLocaleString('pt-BR');

    // ─── Cabeçalho Clínico ───
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('VANGUARD VETERINARY', 15, 20, { charSpace: 0 });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Ortopedia Veterinária', 15, 26, { charSpace: 0 });
    doc.setDrawColor(0, 86, 179);
    doc.line(15, 30, 195, 30);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('LAUDO TÉCNICO', 15, 40, { charSpace: 0 });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Data: ${dateStr}`, 15, 47, { charSpace: 0 });
    doc.text(`Responsável Técnico: ${vetName} — CRMV: ${vetCrmv}`, 15, 53, { charSpace: 0 });

    // ─── 1. DADOS DO PACIENTE ───
    let y = 63;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('1. DADOS DO PACIENTE', 15, y, { charSpace: 0 });
    y += 7;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    y = addLine(doc, `Nome: ${field(caseRow.patient_name ?? caseRow.patientName)}`, 18, y, 170);
    y = addLine(doc, `Espécie: ${translateEnum(caseRow.species, SPECIES_MAP)}`, 18, y, 170);
    y = addLine(doc, `Raça: ${field(caseRow.breed)}`, 18, y, 170);
    const ageVal = caseRow.age_years ?? caseRow.ageYears;
    y = addLine(doc, `Idade: ${ageVal && Number(ageVal) > 0 ? `${ageVal} anos` : '—'}`, 18, y, 170);
    const weightVal = caseRow.weight_kg ?? caseRow.weightKg;
    y = addLine(doc, `Peso: ${weightVal && Number(weightVal) > 0 ? `${weightVal} kg` : '—'}`, 18, y, 170);
    y = addLine(doc, `Procedimento: ${translateEnum(caseRow.procedure, PROCEDURE_MAP)}`, 18, y, 170);
    y = addLine(doc, `Status: ${translateEnum(caseRow.status, STATUS_MAP)}`, 18, y, 170);
    y += 4;

    // ─── 2. NOTAS CLÍNICAS ───
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('2. NOTAS CLÍNICAS', 15, y, { charSpace: 0 });
    y += 7;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const rawAi = caseRow.ai_analysis ?? caseRow.aiAnalysis ?? null;
    let aiObj: any = null;
    if (rawAi) {
      try { aiObj = typeof rawAi === 'string' ? JSON.parse(rawAi) : rawAi; } catch { aiObj = rawAi; }
    }

    let notesContent = stripPdfNotes(sanitize(caseRow.notes ?? caseRow.notes_text ?? ''));
    if (aiObj) {
      notesContent = removeAiDuplicateSections(notesContent);
    }
    if (notesContent) {
      y = addLine(doc, notesContent, 18, y, 170);
    } else {
      doc.text('—', 18, y, { charSpace: 0 });
      y += 6;
    }
    y += 4;

    // ─── 3. ANÁLISE DE IA ───
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('3. ANÁLISE DE IA', 15, y, { charSpace: 0 });
    y += 7;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    // AI analysis (if present)
    if (aiObj) {
      // Landmarks Anatômicos
      const allLandmarks = Array.isArray(aiObj.anatomicalLandmarks) ? aiObj.anatomicalLandmarks : [];
      const landmarks = allLandmarks.filter(lm => {
        const rawLabel = lm?.name ? sanitize(lm.name) : '—';
        return !/interpreta[cç][ãa]o radiogr[áa]fica integrada/i.test(rawLabel);
      });
      if (landmarks.length > 0) {
        doc.setFontSize(10);
        doc.text('Landmarks Anatômicos:', 15, y, { charSpace: 0 });
        y += 5;
        for (const lm of landmarks) {
          const rawLabel = lm?.name ? sanitize(lm.name) : '—';
          const label = rawLabel.replace(/((?:[A-Za-zÀ-ÿ\u00C0-\u00FF][ \u00A0]){6,}[A-Za-zÀ-ÿ\u00C0-\u00FF])/g, (mm) => mm.replace(/[ \u00A0]/g, ''));
          const pct = Math.round(parseConfidence(lm.confidence) * 100);
          const status = lm?.detected ? `Detectado: ${pct}%` : 'Nao detectado';
          const bullet = `• ${label}: ${status}`;
          const split = doc.splitTextToSize(bullet, 170);
          for (const s of split) {
            if (y > 270) { doc.addPage(); y = 20; }
            doc.text(s, 18, y, { charSpace: 0 });
            y += 5;
          }
        }
      }
      y += 4;

      // Recomendações
      doc.text('Recomendações:', 15, y, { charSpace: 0 });
      y += 5;
      const recs = Array.isArray(aiObj.recommendations) ? aiObj.recommendations : [];
      if (recs.length === 0) {
        doc.text('—', 18, y, { charSpace: 0 });
        y += 5;
      } else {
        for (const r of recs) {
          const bullet = `• ${sanitize(typeof r === 'string' ? r : JSON.stringify(r))}`;
          const split = doc.splitTextToSize(bullet, 170);
          for (const s of split) {
            if (y > 270) { doc.addPage(); y = 20; }
            doc.text(s, 18, y, { charSpace: 0 });
            y += 5;
          }
        }
      }
      y += 4;

      // Fatores de Risco
      doc.text('Fatores de Risco:', 15, y, { charSpace: 0 });
      y += 5;
      let risks = Array.isArray(aiObj.riskFactors) ? aiObj.riskFactors : [];
      // Se a IA retornou fallback genérico, extrair do texto das notas
      if (risks.length === 0 || (risks.length === 1 && /Achado clínico.*maior gravidade/i.test(risks[0]?.description || ''))) {
        risks = extractRiskFactorsFromNotes(notesContent);
      }
      if (risks.length === 0) {
        doc.text('—', 18, y, { charSpace: 0 });
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
            doc.text(s, 18, y, { charSpace: 0 });
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
    doc.text(vetName, 105, y + 31, { charSpace: 0,  align: 'center' });

    // CRMV
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`CRMV: ${vetCrmv}`, 105, y + 36, { charSpace: 0,  align: 'center' });

    // Data e hora de emissão
    doc.text(`Emitido em: ${dateStr}`, 105, y + 41, { charSpace: 0,  align: 'center' });

    // Campo de carimbo (à esquerda)
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Carimbo:', 20, y + 25, { charSpace: 0 });
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
      doc.text('Vanguard Veterinary — Ortopedia Veterinária', 15, 287, { charSpace: 0 });
      doc.text(`Página ${i} de ${pageCount}`, 170, 287, { charSpace: 0 });
      doc.text(`Gerado em: ${dateStr}`, 105, 287, { charSpace: 0,  align: 'center' });
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

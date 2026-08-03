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

    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

    const now = new Date();
    const dateStr = now.toLocaleString('pt-BR');

    // Header
    doc.setFontSize(18);
    doc.text('Laudo Técnico', 15, 20);
    doc.setFontSize(10);
    doc.text(`Paciente: ${sanitize(caseRow.patient_name ?? caseRow.patientName)}`, 15, 28);
    doc.text(`Data: ${dateStr}`, 15, 34);

    // Body
    doc.setFontSize(11);
    let y = 44;
    const lines = [
      `Nome: ${sanitize(caseRow.patient_name ?? caseRow.patientName)}`,
      `Espécie: ${sanitize(caseRow.species)}`,
      `Raça: ${sanitize(caseRow.breed)}`,
      `Idade (anos): ${sanitize(caseRow.age_years ?? caseRow.ageYears)}`,
      `Peso (kg): ${sanitize(caseRow.weight_kg ?? caseRow.weightKg)}`,
      `Procedimento: ${sanitize(caseRow.procedure)}`,
      `Status: ${sanitize(caseRow.status)}`,
      '',
      'Notas Clínicas:',
      sanitize(caseRow.notes ?? caseRow.notes_text ?? ''),
    ];

    for (const line of lines) {
      const split = doc.splitTextToSize(line, 180);
      doc.text(split, 15, y);
      y += split.length * 6;
      if (y > 260) {
        // footer for page
        doc.setFontSize(9);
        doc.text(`Vanguard Veterinary — Ortopedia Veterinária`, 15, 287);
        doc.addPage();
        y = 20;
      }
    }

    // AI analysis (if present)
    const rawAi = caseRow.ai_analysis ?? caseRow.aiAnalysis ?? null;
    let aiObj: any = null;
    if (rawAi) {
      try { aiObj = typeof rawAi === 'string' ? JSON.parse(rawAi) : rawAi; } catch { aiObj = rawAi; }
    }
    if (aiObj) {
      y += 4;
      doc.setFontSize(11);
      doc.text('Análise de IA:', 15, y);
      y += 6;

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

    // Footer
    doc.setFontSize(9);
    doc.text(`Vanguard Veterinary — Ortopedia Veterinária — ${dateStr}`, 15, 287);

    const arrayBuffer = doc.output('arraybuffer');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="laudo-tecnico.pdf"');
    return res.status(200).send(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error('generate-technical error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

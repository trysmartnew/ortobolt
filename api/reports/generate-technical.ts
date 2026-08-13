import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifySupabaseBearer } from '../lib/verifySupabaseJwt.js';
import { applyCors } from '../lib/cors.js';
import { supabaseAdmin } from '../lib/supabase-admin.js';












import { sanitize, serializeField, removeAiDuplicateSections, SPECIES_MAP, PROCEDURE_MAP, STATUS_MAP, translateEnum, field, addLine, stripPdfNotes, extractRiskFactorsFromNotes, extractDiagnosticConclusion } from '../lib/pdf-helpers.js';

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

    const ctx = body?.context || {};
    const responsible = ctx.responsible || {};
    const examMeta = ctx.exam_meta || {};
    const patientExtra = ctx.patient_extra || {};
    const clinicName = sanitize(body?.clinicName) || 'VANGUARD VETERINARY';
    const clinicSubtitle = sanitize(body?.clinicSubtitle) || 'Ortopedia Veterinária';
    const clinicPhone = sanitize(body?.clinicPhone) || '';
    const clinicAddress = sanitize(body?.clinicAddress) || '';
    const clinicCnpj = sanitize(body?.clinicCnpj) || '';

    const { data: caseRow, error } = await supabaseAdmin
      .from('clinical_cases')
      .select('*')
      .eq('id', caseId)
      .eq('veterinarian_id', auth.user.id)
      .single();

    if (error || !caseRow) return res.status(404).json({ error: 'Case not found' });

    let vetName = '—';
    let vetCrmv = '—';
    let vetEmail = '—';
    try {
      const { data: vetProfile } = await supabaseAdmin
        .from('profiles')
        .select('name, crmv, email')
        .eq('id', auth.user.id)
        .single();
      if (vetProfile) {
        vetName = field(vetProfile.name);
        vetCrmv = field(vetProfile.crmv);
        vetEmail = field(vetProfile.email);
      }
    } catch { /* fallback: manter '—' */ }

    const bodyCrmv = sanitize(body?.userCrmv);
    if (bodyCrmv) vetCrmv = bodyCrmv;

    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    
    const now = new Date();
    const dateStr = now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    // ─── Cabeçalho Institucional ───
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(clinicName.toUpperCase(), 15, 20, { charSpace: 0 });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(clinicSubtitle, 15, 26, { charSpace: 0 });
    if (clinicPhone) doc.text(clinicPhone, 15, 31, { charSpace: 0 });
    if (clinicAddress) doc.text(clinicAddress, 15, 36, { charSpace: 0 });
    if (clinicCnpj) doc.text(`CNPJ: ${clinicCnpj}`, 15, 41, { charSpace: 0 });
    doc.setDrawColor(41, 163, 153);
    doc.setLineWidth(0.5);
    doc.line(15, 45, 195, 45);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('LAUDO TÉCNICO', 15, 55, { charSpace: 0 });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Data de Emissão: ${dateStr}`, 15, 62, { charSpace: 0 });
    doc.text(`Responsável Técnico: ${vetName} — CRMV: ${vetCrmv}`, 15, 68, { charSpace: 0 });

    let y = 80;
    const addSection = (num: number, title: string) => {
      if (y > 255) { doc.addPage(); y = 30; }
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(41, 163, 153);
      doc.text(`${num}. ${title}`, 15, y, { charSpace: 0 });
      y += 6;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
    };

    // ─── 1. RESPONSÁVEL PELO ANIMAL (Res. CFMV 1.653/2025) ───
    addSection(1, 'RESPONSÁVEL PELO ANIMAL');
    y = addLine(doc, `Nome: ${field(responsible.tutorName)}`, 18, y, 170);
    y = addLine(doc, `Telefone: ${field(responsible.tutorPhone)}`, 18, y, 170);
    y = addLine(doc, `E-mail: ${field(responsible.tutorEmail)}`, 18, y, 170);
    y += 4;

    // ─── 2. DADOS DO PACIENTE ───
    addSection(2, 'DADOS DO PACIENTE');
    y = addLine(doc, `Nome: ${field(caseRow.patient_name ?? caseRow.patientName)}`, 18, y, 170);
    y = addLine(doc, `Espécie: ${translateEnum(caseRow.species, SPECIES_MAP)}`, 18, y, 170);
    y = addLine(doc, `Raça: ${field(caseRow.breed)}`, 18, y, 170);
    const ageVal = caseRow.age_years ?? caseRow.ageYears;
    y = addLine(doc, `Idade: ${ageVal && Number(ageVal) > 0 ? `${ageVal} anos` : '—'}`, 18, y, 170);
    const weightVal = caseRow.weight_kg ?? caseRow.weightKg;
    y = addLine(doc, `Peso: ${weightVal && Number(weightVal) > 0 ? `${weightVal} kg` : '—'}`, 18, y, 170);
    if (patientExtra.observations) {
      y = addLine(doc, `Observações: ${field(patientExtra.observations)}`, 18, y, 170);
    }
    y += 4;

    // ─── 3. DADOS CRONOLÓGICOS E TÉCNICOS ───
    addSection(3, 'DADOS CRONOLÓGICOS E TÉCNICOS');
    y = addLine(doc, `Data do Exame: ${field(examMeta.examDate)}`, 18, y, 170);
    y = addLine(doc, `Tipo de Exame: ${field(examMeta.examType)}`, 18, y, 170);
    if (examMeta.equipment && examMeta.equipment !== 'Não informado') {
      y = addLine(doc, `Equipamento: ${field(examMeta.equipment)}`, 18, y, 170);
    }
    const procLabel = translateEnum(caseRow.procedure, PROCEDURE_MAP);
    if (procLabel && procLabel !== 'Outro') {
      y = addLine(doc, `Procedimento: ${procLabel}`, 18, y, 170);
    }
    y = addLine(doc, `Status: ${translateEnum(caseRow.status, STATUS_MAP)}`, 18, y, 170);
    y += 4;

    // ─── 4. ACHADOS CLÍNICOS ───
    addSection(4, 'ACHADOS CLÍNICOS');
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
      const splitN = doc.splitTextToSize(notesContent, 170);
      for (const s of splitN) {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(s, 18, y, { charSpace: 0 });
        y += 5;
      }
    } else {
      doc.text('—', 18, y, { charSpace: 0 });
      y += 6;
    }
    y += 4;

    // ─── 5. CONCLUSÃO DIAGNÓSTICA ───
    addSection(5, 'CONCLUSÃO DIAGNÓSTICA');
    const conclusion = extractDiagnosticConclusion(notesContent);
    if (conclusion) {
      const splitConc = doc.splitTextToSize(conclusion, 170);
      for (const s of splitConc) {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(s, 18, y, { charSpace: 0 });
        y += 5;
      }
    } else {
      doc.text('Não informada.', 18, y, { charSpace: 0 });
      y += 6;
    }
    y += 4;

    if (aiObj) {
      let risks = Array.isArray(aiObj.riskFactors) ? aiObj.riskFactors : [];
      risks = risks.filter(rf => !/maior gravidade/i.test(rf?.description || ''));
      if (risks.length === 0) {
        risks = extractRiskFactorsFromNotes(notesContent).filter(rf => !/maior gravidade/i.test(rf?.description || ''));
      }
      if (risks.length > 0) {
        doc.text('Fatores de Risco:', 15, y, { charSpace: 0 });
        y += 5;
        for (const rf of risks) {
          const sev = rf?.severity ? `[${sanitize(String(rf.severity)).toUpperCase()}] ` : '';
          const cat = rf?.category ? `${sanitize(rf.category)}: ` : '';
          const desc = rf?.description ? sanitize(rf.description) : sanitize(serializeField(rf));
          const bullet = `• ${sev}${cat}${desc}`;
          const splitRf = doc.splitTextToSize(bullet, 170);
          for (const s of splitRf) {
            if (y > 270) { doc.addPage(); y = 20; }
            doc.text(s, 18, y, { charSpace: 0 });
            y += 5;
          }
        }
      }
    }
    y += 4;

    // ─── 6. CONDUTA RECOMENDADA ───
    addSection(6, 'CONDUTA RECOMENDADA');
    if (aiObj && Array.isArray(aiObj.recommendations) && aiObj.recommendations.length > 0) {
      aiObj.recommendations.forEach((r: any, i: number) => {
        const bullet = `${i + 1}. ${sanitize(typeof r === 'string' ? r : JSON.stringify(r))}`;
        const splitC = doc.splitTextToSize(bullet, 170);
        for (const s of splitC) {
          if (y > 270) { doc.addPage(); y = 20; }
          doc.text(s, 18, y, { charSpace: 0 });
          y += 5;
        }
      });
    } else {
      doc.text('Aguardando avaliação clínica complementar.', 18, y, { charSpace: 0 });
      y += 6;
    }
    y += 8;

    // ─── DECLARAÇÃO DE RESPONSABILIDADE SOBRE IA ───
    if (y > 230) { doc.addPage(); y = 30; }
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 116, 139);
    const decl = 'Este laudo foi auxiliado por ferramentas de Inteligência Artificial como suporte à análise. A responsabilidade técnica pelo diagnóstico e conduta é exclusiva do Médico-Veterinário signatário, conforme Resoluções CFMV nº 1.321/2020, nº 1.653/2025 e nº 1.465/2022.';
    const splitDecl = doc.splitTextToSize(decl, 170);
    for (const s of splitDecl) {
      doc.text(s, 15, y, { charSpace: 0 });
      y += 4;
    }
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    y += 6;

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

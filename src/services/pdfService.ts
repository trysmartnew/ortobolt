// src/services/pdfService.ts
// ✅ A-03: addWrappedText helper — elimina overflow silencioso
// ✅ A-03: safe() — sanitiza conteúdo da IA antes de inserir no PDF

import type { User, ClinicalCase, KPIMetric, ChartDataPoint } from '@/types/index';

import { sanitizeClinicalNotes } from './clinicalCaseIntegrationService';

const SPECIES_MAP_CLIENT: Record<string, string> = { canine: 'Canina', feline: 'Felina', equine: 'Equina', exotic: 'Exótica', other: 'Outra' };
const PROCEDURE_MAP_CLIENT: Record<string, string> = { tplo: 'TPLO', fho: 'FHO', tta: 'TTA', lcp: 'LCP', fracture: 'Fratura', other: 'Outro' };
const RISK_MAP_CLIENT: Record<string, string> = { low: 'Baixo', medium: 'Médio', high: 'Alto', critical: 'Crítico' };
function translateEnumClient(val: unknown, map: Record<string, string>): string {
  const v = String(val || '').toLowerCase().trim();
  return map[v] || String(val || '');
}
function sanitizeTutorBlocks(text: string): string {
  return text
    .replace(/(Urgente:|Necess[áa]rio:)[\s\S]*$/i, '')
    .replace(/Por favor, prossiga[\s\S]*$/i, '')
    .trim();
}

async function getJsPDF() {
  const { jsPDF } = await import('jspdf');
  return jsPDF;
}

async function getUrlAsBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Falha ao converter URL do logo para Base64:', error);
    return '';
  }
}

// ✅ A-03: Sanitizar texto — remove caracteres de controle que quebram jsPDF
function safe(s?: string | number): string {
  if (s === undefined || s === null) return '';
  return String(s)
    // eslint-disable-next-line no-control-regex -- intentional bounded loop / control-char sanitization
    .replace(/[\x00-\x1F\x7F]/g, ' ') // controles ASCII
    .replace(/[\uFFFD]/g, '?')          // replacement character
    .trim();
}

// ✅ A-03: Wrapper para texto longo com quebra automática de linha e nova página
function addWrappedText(
  doc: InstanceType<Awaited<ReturnType<typeof getJsPDF>>>,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  pageMarginBottom = 270
): number {
  const lines: string[] = doc.splitTextToSize(safe(text), maxWidth);
  for (const line of lines) {
    if (y > pageMarginBottom) {
      doc.addPage();
      y = 30;
    }
    doc.text(line, x, y, { charSpace: 0 });
    y += lineHeight;
  }
  return y;
}

async function addHeader(
  doc: InstanceType<Awaited<ReturnType<typeof getJsPDF>>>,
  title: string,
  subtitle: string,
  options?: { logoUrl?: string | null; clinicName?: string; clinicSubtitle?: string }
) {
  const clinicName = options?.clinicName || localStorage.getItem('vanguard-veterinary_pdf_clinic_name') || 'Vanguard Veterinary';
  const clinicSubtitle = options?.clinicSubtitle || localStorage.getItem('vanguard-veterinary_pdf_clinic_subtitle') || 'Ortopedia Veterinária Inteligente';
  const logoUrl = options?.logoUrl || localStorage.getItem('vanguard-veterinary_pdf_logo');

  doc.setFillColor(0, 86, 179);
  doc.rect(0, 0, 210, 22, 'F');
  doc.setTextColor(255, 255, 255);

  if (logoUrl) {
    try {
      const imageSource = logoUrl.startsWith('http')
        ? await getUrlAsBase64(logoUrl)
        : logoUrl;

      if (imageSource) {
        const format = imageSource.includes('jpeg') ? 'JPEG' : 'PNG';
        doc.addImage(imageSource, format, 14, 2, 18, 18);
      }
    } catch (e) {
      console.warn('Erro ao processar imagem do logo para o PDF:', e);
    }
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(safe(clinicName), 36, 10);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(safe(clinicSubtitle), 36, 16);
  } else {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(safe(clinicName), 14, 10);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(safe(clinicSubtitle), 14, 16);
  }
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(safe(title), 14, 35, { charSpace: 0 });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(safe(subtitle), 14, 42, { charSpace: 0 });
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 46, 196, 46);
}

function addFooter(doc: InstanceType<Awaited<ReturnType<typeof getJsPDF>>>) {
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 285, 196, 285);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    const clinicNameF = (localStorage.getItem('vanguard-veterinary_pdf_clinic_name') || 'Vanguard Veterinary').replace(/((?:[A-Za-z\u00c0-\u00ff] ){3,}[A-Za-z\u00c0-\u00ff])/g, (m) => m.replace(/ /g, '')).replace(/ {2,}/g, ' ');
    const clinicSubtitleF = localStorage.getItem('vanguard-veterinary_pdf_clinic_subtitle') || 'Ortopedia Veterinária Inteligente';
    const dateStrF = new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    doc.text(safe(clinicNameF) + ' • ' + safe(clinicSubtitleF), 14, 290, { charSpace: 0 });
    doc.text(`Página ${i} de ${pageCount}`, 185, 290, { align: 'right', charSpace: 0 });
    doc.text(`Gerado em: ${dateStrF}`, 105, 290, { align: 'center', charSpace: 0 });
  }
}

function stripMarkdownForPdf(text: string): string {
  return text
    .replace(/```json[\s\S]*?(?:```|$)/g, '')
    .replace(/^##\s+/gm, '\n')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^\|[-\s|]+\|$/gm, '')
    .replace(/\|/g, '  ')
    .replace(/^---+$/gm, '')
    .replace(/\[\[.*?\]\]+/g, '')
    .replace(/((?:[A-Za-z\u00c0-\u00ff][ \u00A0]){6,}[A-Za-z\u00c0-\u00ff])/g, (m) => m.replace(/[ \u00A0]/g, ''))
    .replace(/ {2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function generateMonthlyReport(
  user: User, metrics: KPIMetric[], chartData: ChartDataPoint[], cases: ClinicalCase[]
): Promise<void> {
  const JsPDF = await getJsPDF();
  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const month = new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  await addHeader(doc, 'Relatório de Desempenho', month.charAt(0).toUpperCase() + month.slice(1));

  let y = 54;

  // Professional info
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 86, 179);
  doc.text('Dados do Profissional', 14, y, { charSpace: 0 }); y += 7;
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0);

  const profFields: [string, string][] = [
    ['Nome', user.name],
    ['CRMV', user.crmv],
    ['Especialidade', user.specialty],
    ['Instituição', user.institution],
  ];
  for (const [label, value] of profFields) {
    // ✅ A-03: usar addWrappedText para valores potencialmente longos
    y = addWrappedText(doc, `${label}: ${value}`, 14, y, 182, 5);
  }
  y += 5;

  // KPIs
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 86, 179);
  if (y > 260) { doc.addPage(); y = 30; }
  doc.text('Indicadores de Desempenho (KPIs)', 14, y, { charSpace: 0 }); y += 7;
  metrics.forEach(m => {
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0);
    const val = `${m.value}${m.unit || ''}`;
    const trend = m.trendDirection === 'up' ? `↑ ${Math.abs(m.trend)}%` : m.trendDirection === 'down' ? `↓ ${Math.abs(m.trend)}%` : '→';
    y = addWrappedText(doc, `• ${m.label}: ${val} (${trend})`, 14, y, 182, 6);
  });
  y += 4;

  // Monthly evolution table
  if (y > 220) { doc.addPage(); y = 30; }
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 86, 179);
  doc.text('Evolução Mensal de Precisão', 14, y, { charSpace: 0 }); y += 7;
  const headers = ['Mês', 'Precisão (%)', 'Casos', 'Sucessos'];
  const colW = [35, 40, 30, 30];
  let x = 14;
  doc.setFillColor(0, 86, 179); doc.setTextColor(255, 255, 255);
  doc.setFontSize(9); doc.setFont('helvetica', 'bold');
  headers.forEach((h, i) => { doc.rect(x, y, colW[i], 7, 'F'); doc.text(safe(h), x + 2, y + 5, { charSpace: 0 }); x += colW[i]; });
  y += 7;
  chartData.forEach((row, ri) => {
    if (y > 270) { doc.addPage(); y = 30; }
    x = 14;
    doc.setFillColor(ri % 2 === 0 ? 248 : 255, ri % 2 === 0 ? 250 : 255, ri % 2 === 0 ? 252 : 255);
    doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'normal');
    const cells = [safe(row.label), row.precision.toFixed(1), String(row.cases), String(row.success)];
    cells.forEach((c, i) => { doc.rect(x, y, colW[i], 6, 'F'); doc.text(c, x + 2, y + 4, { charSpace: 0 }); x += colW[i]; });
    y += 6;
  });
  y += 8;

  // Recent cases
  if (y > 220) { doc.addPage(); y = 30; }
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 86, 179);
  doc.text('Casos do Período', 14, y, { charSpace: 0 }); y += 7;
  cases.slice(0, 8).forEach(c => {
    if (y > 270) { doc.addPage(); y = 30; }
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0);
    const status = { pending: 'Pendente', in_analysis: 'Em Análise', completed: 'Concluído', critical: 'Crítico' }[c.status];
    const precision = c.precisionScore ? `${c.precisionScore}%` : 'N/A';
    // ✅ A-03: wrapping para títulos longos de casos
    y = addWrappedText(doc, `• ${safe(c.title)} (${safe(c.patientName)}) — ${status} — Precisão: ${precision}`, 14, y, 182, 5);
  });

  addFooter(doc);
  doc.save(`vanguard-veterinary-relatorio-${new Date().toISOString().slice(0, 7)}.pdf`);
}

export async function generateLaudoReport(
  analysisText: string,
  patientContext: { patientName?: string; species?: string; breed?: string; ageYears?: number; weightKg?: number; procedure?: string },
  imageDataUrl?: string | null,
  options?: { logoUrl?: string | null; clinicName?: string; clinicSubtitle?: string }
): Promise<void> {
  // P1-a: Thin wrapper — delega ao pipeline unificado generateCaseReport
  const partialCase = {
    id: `laudo-${Date.now()}`,
    title: `Laudo - ${patientContext.patientName || 'Paciente'}`,
    patientName: patientContext.patientName || 'Paciente',
    species: (patientContext.species || 'canine'),
    breed: patientContext.breed || '',
    ageYears: patientContext.ageYears ?? 0,
    weightKg: patientContext.weightKg ?? 0,
    procedure: (patientContext.procedure || 'other'),
    status: 'completed',
    riskLevel: 'low',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: [] as string[],
    veterinarianId: '',
    notes: analysisText,
  } as ClinicalCase;

  await generateCaseReport(partialCase, {
    ...options,
    reportTitle: 'Laudo Radiogr\u00e1fico',
    imageDataUrl: imageDataUrl ?? undefined,
  });
}

export async function generateCaseReport(
  c: ClinicalCase,
  options?: { isTutorGuide?: boolean; logoUrl?: string | null; clinicName?: string; clinicSubtitle?: string; notes?: string; reportTitle?: string; imageDataUrl?: string | null; responsibleName?: string; responsibleCrmv?: string }
): Promise<Blob | null> {
  const tutorMode = options?.isTutorGuide ?? false;
  const JsPDF = await getJsPDF();
  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const reportTitle = options?.reportTitle ?? (tutorMode ? 'Guia para o Tutor' : 'Relatório de Caso Clínico');
  await addHeader(doc, reportTitle, `${safe(c.patientName)} — ${new Date(c.createdAt).toLocaleDateString('pt-BR')}`, options);

  let y = 54;

  // Patient
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 86, 179);
  doc.text('Dados do Paciente', 14, y, { charSpace: 0 }); y += 7;
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0);
  const patientFields: [string, string][] = [
    ['Nome', safe(c.patientName)],
    ['Espécie', translateEnumClient(c.species, SPECIES_MAP_CLIENT)],
    ['Raça', safe(c.breed)],
    ['Idade', `${c.ageYears} anos`],
    ['Peso', `${c.weightKg} kg`],
    ['Procedimento', translateEnumClient(c.procedure, PROCEDURE_MAP_CLIENT)],
    ['Risco', translateEnumClient(c.riskLevel, RISK_MAP_CLIENT)],
  ];
  for (const [label, value] of patientFields) {
    if (y > 270) { doc.addPage(); y = 30; }
    doc.text(`${label}: ${value}`, 14, y, { charSpace: 0 }); y += 5;
  }
  y += 5;

  // ── Slice B: Responsável Técnico e CRMV (condicional) ──
  if (options?.responsibleName && options?.responsibleCrmv) {
    if (y > 270) { doc.addPage(); y = 30; }
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 86, 179);
    doc.text(`Responsável Técnico: ${safe(options.responsibleName)} | CRMV: ${safe(options.responsibleCrmv)}`, 14, y, { charSpace: 0 });
    y += 7;
    doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0);
  }


  // Notes — apenas no modo técnico (não tutor)
  const cleanNotes = sanitizeClinicalNotes(options?.notes || c.notes || '');
  if (cleanNotes && !tutorMode) {
    if (y > 250) { doc.addPage(); y = 30; }
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 86, 179);
    doc.text('Laudo Radiográfico', 14, y, { charSpace: 0 }); y += 6;
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0);
    y = addWrappedText(doc, safe(cleanNotes), 14, y, 182, 5);
    y += 5;
  }

  // AI Analysis — apenas no modo tutor (evita duplicação no modo técnico)
  if (c.aiAnalysis && tutorMode) {
    if (y > 220) { doc.addPage(); y = 30; }

    if (tutorMode) {
      // ── MODO TUTOR (Simplificado para o proprietário do pet) ──
      doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 86, 179);
      doc.text('Orientações para o Tutor', 14, y, { charSpace: 0 }); y += 7;
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0);
      y = addWrappedText(doc, 'Este documento foi preparado pela equipe veterinária para orientar os cuidados com seu pet com base nas avaliações realizadas.', 14, y, 182, 5);
      y += 8;

      // Recommendations
      if (y > 240) { doc.addPage(); y = 30; }
      doc.setFont('helvetica', 'bold'); doc.text('Cuidados Importantes:', 14, y, { charSpace: 0 }); y += 6;
      doc.setFont('helvetica', 'normal');
      c.aiAnalysis.recommendations.filter(r => r && String(r).trim()).forEach(r => {
        y = addWrappedText(doc, `• ${safe(stripMarkdownForPdf(r))}`, 14, y, 182, 5);
      });

      // Risk factors (simplified)
      if (c.aiAnalysis.riskFactors.length > 0) {
        if (y > 240) { doc.addPage(); y = 30; }
        y += 5;
        doc.setFont('helvetica', 'bold'); doc.text('Pontos de Atenção:', 14, y, { charSpace: 0 }); y += 6;
        doc.setFont('helvetica', 'normal');
        c.aiAnalysis.riskFactors.forEach(rf => {
          y = addWrappedText(doc, `• ${safe(stripMarkdownForPdf(rf.description))}`, 14, y, 182, 5);
        });
      }
    } else {
      // ── MODO VETERINÁRIO (Técnico Completo) ──
      doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 86, 179);
      doc.text('Análise de Imagem', 14, y, { charSpace: 0 }); y += 7;
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0);

      // Landmarks
      doc.setFont('helvetica', 'bold'); doc.text('Landmarks Anatômicos Detectados:', 14, y, { charSpace: 0 }); y += 6;
      doc.setFont('helvetica', 'normal');
      c.aiAnalysis.anatomicalLandmarks.filter(l => l && l.name && l.name.trim()).forEach(l => {
        if (y > 270) { doc.addPage(); y = 30; }
        const status = l.detected ? `✓ ${(l.confidence * 100).toFixed(0)}%` : '✗ Não detectado';
        doc.text(`• ${safe(stripMarkdownForPdf(l.name))}: ${status}`, 14, y, { charSpace: 0 }); y += 5;
      });
      y += 5;

      // Recommendations
      if (y > 240) { doc.addPage(); y = 30; }
      doc.setFont('helvetica', 'bold'); doc.text('Recomendações:', 14, y, { charSpace: 0 }); y += 6;
      doc.setFont('helvetica', 'normal');
      c.aiAnalysis.recommendations.filter(r => r && String(r).trim()).forEach(r => {
        y = addWrappedText(doc, `• ${safe(stripMarkdownForPdf(r))}`, 14, y, 182, 5);
      });

      // Risk factors
      if (c.aiAnalysis.riskFactors.length > 0) {
        if (y > 240) { doc.addPage(); y = 30; }
        y += 3;
        doc.setFont('helvetica', 'bold'); doc.text('Fatores de Risco:', 14, y, { charSpace: 0 }); y += 6;
        doc.setFont('helvetica', 'normal');
        c.aiAnalysis.riskFactors.forEach(rf => {
          y = addWrappedText(doc, `• [${safe(stripMarkdownForPdf(rf.severity)).toUpperCase()}] ${safe(stripMarkdownForPdf(rf.category))}: ${safe(stripMarkdownForPdf(rf.description))}`, 14, y, 182, 5);
        });
      }
    }
  }

  // P1-a: Imagem da radiografia (base64 direto ou URL assinada)
  const imageSource = options?.imageDataUrl || c.imageUrl;
  if (imageSource) {
    const imageWidth = 180;
    const imageHeight = 120;
    if (y + imageHeight > 270) { doc.addPage(); y = 30; }
    try {
      let imgData = imageSource;
      if (imageSource.startsWith('http')) {
        imgData = await getUrlAsBase64(imageSource);
      }
      if (imgData) {
        const format = imgData.includes('image/png') ? 'PNG' : 'JPEG';
        doc.addImage(imgData, format, 15, y, imageWidth, imageHeight);
        y += imageHeight + 5;
      }
    } catch (e) {
      console.warn('Erro ao adicionar imagem ao PDF:', e);
    }
  }

  addFooter(doc);
  try {
    return doc.output('blob');
  } catch (err) {
    console.error('Erro ao gerar PDF blob:', err);
    return null;
  }
}

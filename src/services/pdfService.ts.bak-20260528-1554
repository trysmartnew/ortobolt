// src/services/pdfService.ts
// ✅ A-03: addWrappedText helper — elimina overflow silencioso
// ✅ A-03: safe() — sanitiza conteúdo da IA antes de inserir no PDF

import type { User, ClinicalCase, KPIMetric, ChartDataPoint } from '@/types/index';

async function getJsPDF() {
  const { jsPDF } = await import('jspdf');
  return jsPDF;
}

// ✅ A-03: Sanitizar texto — remove caracteres de controle que quebram jsPDF
function safe(s?: string | number): string {
  if (s === undefined || s === null) return '';
  return String(s)
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
    doc.text(line, x, y);
    y += lineHeight;
  }
  return y;
}

function addHeader(
  doc: InstanceType<Awaited<ReturnType<typeof getJsPDF>>>,
  title: string,
  subtitle: string
) {
  doc.setFillColor(0, 86, 179);
  doc.rect(0, 0, 210, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('OrtoBolt', 14, 10);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Ortopedia Veterinária Inteligente', 14, 16);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(safe(title), 14, 35);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(safe(subtitle), 14, 42);
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
    doc.text('OrtoBolt — Plataforma de Ortopedia Veterinária com IA', 14, 290);
    doc.text(`Página ${i} de ${pageCount}`, 185, 290, { align: 'right' });
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 105, 290, { align: 'center' });
  }
}

export async function generateMonthlyReport(
  user: User, metrics: KPIMetric[], chartData: ChartDataPoint[], cases: ClinicalCase[]
): Promise<void> {
  const JsPDF = await getJsPDF();
  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const month = new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  addHeader(doc, 'Relatório de Desempenho', month.charAt(0).toUpperCase() + month.slice(1));

  let y = 54;

  // Veterinarian info
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 86, 179);
  doc.text('Dados do Profissional', 14, y); y += 7;
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
  doc.text('Indicadores de Desempenho (KPIs)', 14, y); y += 7;
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
  doc.text('Evolução Mensal de Precisão', 14, y); y += 7;
  const headers = ['Mês', 'Precisão (%)', 'Casos', 'Sucessos'];
  const colW = [35, 40, 30, 30];
  let x = 14;
  doc.setFillColor(0, 86, 179); doc.setTextColor(255, 255, 255);
  doc.setFontSize(9); doc.setFont('helvetica', 'bold');
  headers.forEach((h, i) => { doc.rect(x, y, colW[i], 7, 'F'); doc.text(safe(h), x + 2, y + 5); x += colW[i]; });
  y += 7;
  chartData.forEach((row, ri) => {
    if (y > 270) { doc.addPage(); y = 30; }
    x = 14;
    doc.setFillColor(ri % 2 === 0 ? 248 : 255, ri % 2 === 0 ? 250 : 255, ri % 2 === 0 ? 252 : 255);
    doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'normal');
    const cells = [safe(row.label), row.precision.toFixed(1), String(row.cases), String(row.success)];
    cells.forEach((c, i) => { doc.rect(x, y, colW[i], 6, 'F'); doc.text(c, x + 2, y + 4); x += colW[i]; });
    y += 6;
  });
  y += 8;

  // Recent cases
  if (y > 220) { doc.addPage(); y = 30; }
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 86, 179);
  doc.text('Casos do Período', 14, y); y += 7;
  cases.slice(0, 8).forEach(c => {
    if (y > 270) { doc.addPage(); y = 30; }
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0);
    const status = { pending:'Pendente', in_analysis:'Em Análise', completed:'Concluído', critical:'Crítico' }[c.status];
    const precision = c.precisionScore ? `${c.precisionScore}%` : 'N/A';
    // ✅ A-03: wrapping para títulos longos de casos
    y = addWrappedText(doc, `• ${safe(c.title)} (${safe(c.patientName)}) — ${status} — Precisão: ${precision}`, 14, y, 182, 5);
  });

  addFooter(doc);
  doc.save(`ortobolt-relatorio-${new Date().toISOString().slice(0, 7)}.pdf`);
}

export async function generateCaseReport(c: ClinicalCase, user: User): Promise<void> {
  const JsPDF = await getJsPDF();
  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  addHeader(doc, 'Relatório de Caso Clínico', `${safe(c.patientName)} — ${new Date(c.createdAt).toLocaleDateString('pt-BR')}`);

  let y = 54;

  // Patient
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 86, 179);
  doc.text('Dados do Paciente', 14, y); y += 7;
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0);
  const patientFields: [string, string][] = [
    ['Nome', safe(c.patientName)],
    ['Espécie', safe(c.species)],
    ['Raça', safe(c.breed)],
    ['Idade', `${c.ageYears} anos`],
    ['Peso', `${c.weightKg} kg`],
    ['Procedimento', safe(c.procedure)],
    ['Risco', safe(c.riskLevel)],
  ];
  for (const [label, value] of patientFields) {
    if (y > 270) { doc.addPage(); y = 30; }
    doc.text(`${label}: ${value}`, 14, y); y += 5;
  }
  y += 5;

  // Notes — ✅ A-03: wrapping para notas longas
  if (c.notes) {
    if (y > 250) { doc.addPage(); y = 30; }
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 86, 179);
    doc.text('Notas Clínicas', 14, y); y += 6;
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0);
    y = addWrappedText(doc, safe(c.notes), 14, y, 182, 5);
    y += 5;
  }

  // AI Analysis
  if (c.aiAnalysis) {
    if (y > 220) { doc.addPage(); y = 30; }
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 86, 179);
    doc.text('Análise IA — OrthoVision', 14, y); y += 7;
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0);
    doc.text(`Pontuação de Precisão: ${c.aiAnalysis.precisionScore}%`, 14, y); y += 5;
    doc.text(`Confiança do Modelo: ${(c.aiAnalysis.confidence * 100).toFixed(0)}%`, 14, y); y += 5;
    doc.text(`Tempo de Processamento: ${c.aiAnalysis.processingTimeMs}ms`, 14, y); y += 8;

    // Landmarks
    doc.setFont('helvetica', 'bold'); doc.text('Landmarks Anatômicos Detectados:', 14, y); y += 6;
    doc.setFont('helvetica', 'normal');
    c.aiAnalysis.anatomicalLandmarks.forEach(l => {
      if (y > 270) { doc.addPage(); y = 30; }
      const status = l.detected ? `✓ ${(l.confidence * 100).toFixed(0)}%` : '✗ Não detectado';
      doc.text(`• ${safe(l.name)}: ${status}`, 14, y); y += 5;
    });
    y += 5;

    // Recommendations — ✅ A-03: wrapping para recomendações longas da IA
    if (y > 240) { doc.addPage(); y = 30; }
    doc.setFont('helvetica', 'bold'); doc.text('Recomendações:', 14, y); y += 6;
    doc.setFont('helvetica', 'normal');
    c.aiAnalysis.recommendations.forEach(r => {
      y = addWrappedText(doc, `• ${safe(r)}`, 14, y, 182, 5);
    });

    // Risk factors
    if (c.aiAnalysis.riskFactors.length > 0) {
      if (y > 240) { doc.addPage(); y = 30; }
      y += 3;
      doc.setFont('helvetica', 'bold'); doc.text('Fatores de Risco:', 14, y); y += 6;
      doc.setFont('helvetica', 'normal');
      c.aiAnalysis.riskFactors.forEach(rf => {
        y = addWrappedText(doc, `• [${safe(rf.severity).toUpperCase()}] ${safe(rf.category)}: ${safe(rf.description)}`, 14, y, 182, 5);
      });
    }
  }

  addFooter(doc);
  doc.save(`ortobolt-caso-${safe(c.id)}-${safe(c.patientName).toLowerCase().replace(/\s+/g, '-')}.pdf`);
}

async function getJsPDF() {
    const { jsPDF } = await import('jspdf');
    return jsPDF;
}
const BRAND_BLUE = '#0056b3';
const GRAY = '#64748b';
function addHeader(doc, title, subtitle) {
    // Header bar
    doc.setFillColor(0, 86, 179);
    doc.rect(0, 0, 210, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('OrtoBolt', 14, 10);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Ortopedia Veterinária Inteligente', 14, 16);
    // Title
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, 35);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(subtitle, 14, 42);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 46, 196, 46);
}
function addFooter(doc) {
    const pageCount = doc.internal.getNumberOfPages();
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
export async function generateMonthlyReport(user, metrics, chartData, cases) {
    const JsPDF = await getJsPDF();
    const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const month = new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    addHeader(doc, `Relatório de Desempenho`, month.charAt(0).toUpperCase() + month.slice(1));
    let y = 54;
    // Veterinarian info
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 86, 179);
    doc.text('Dados do Profissional', 14, y);
    y += 7;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(`Nome: ${user.name}`, 14, y);
    y += 5;
    doc.text(`CRMV: ${user.crmv}`, 14, y);
    y += 5;
    doc.text(`Especialidade: ${user.specialty}`, 14, y);
    y += 5;
    doc.text(`Instituição: ${user.institution}`, 14, y);
    y += 10;
    // KPIs
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 86, 179);
    doc.text('Indicadores de Desempenho (KPIs)', 14, y);
    y += 7;
    metrics.forEach(m => {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        const val = `${m.value}${m.unit || ''}`;
        const trend = m.trendDirection === 'up' ? `↑ ${Math.abs(m.trend)}%` : m.trendDirection === 'down' ? `↓ ${Math.abs(m.trend)}%` : '→';
        doc.text(`• ${m.label}: ${val} (${trend})`, 14, y);
        y += 6;
    });
    y += 4;
    // Monthly evolution
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 86, 179);
    doc.text('Evolução Mensal de Precisão', 14, y);
    y += 7;
    // Simple table
    const headers = ['Mês', 'Precisão (%)', 'Casos', 'Sucessos'];
    const colW = [35, 40, 30, 30];
    let x = 14;
    doc.setFillColor(0, 86, 179);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    headers.forEach((h, i) => { doc.rect(x, y, colW[i], 7, 'F'); doc.text(h, x + 2, y + 5); x += colW[i]; });
    y += 7;
    chartData.forEach((row, ri) => {
        x = 14;
        doc.setFillColor(ri % 2 === 0 ? 248 : 255, ri % 2 === 0 ? 250 : 255, ri % 2 === 0 ? 252 : 255);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        const cells = [row.label, row.precision.toFixed(1), String(row.cases), String(row.success)];
        cells.forEach((c, i) => { doc.rect(x, y, colW[i], 6, 'F'); doc.text(c, x + 2, y + 4); x += colW[i]; });
        y += 6;
    });
    y += 8;
    // Recent cases
    if (y > 220) {
        doc.addPage();
        y = 30;
    }
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 86, 179);
    doc.text('Casos do Período', 14, y);
    y += 7;
    cases.slice(0, 8).forEach(c => {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        const status = { pending: 'Pendente', in_analysis: 'Em Análise', completed: 'Concluído', critical: 'Crítico' }[c.status];
        const precision = c.precisionScore ? `${c.precisionScore}%` : 'N/A';
        doc.text(`• ${c.title} (${c.patientName}) — ${status} — Precisão: ${precision}`, 14, y);
        y += 5;
        if (y > 270) {
            doc.addPage();
            y = 30;
        }
    });
    addFooter(doc);
    doc.save(`ortobolt-relatorio-${new Date().toISOString().slice(0, 7)}.pdf`);
}
export async function generateCaseReport(c, user) {
    const JsPDF = await getJsPDF();
    const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    addHeader(doc, `Relatório de Caso Clínico`, `${c.patientName} — ${new Date(c.createdAt).toLocaleDateString('pt-BR')}`);
    let y = 54;
    // Patient
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 86, 179);
    doc.text('Dados do Paciente', 14, y);
    y += 7;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    const patientFields = [
        ['Nome', c.patientName], ['Espécie', c.species], ['Raça', c.breed],
        ['Idade', `${c.ageYears} anos`], ['Peso', `${c.weightKg} kg`],
        ['Procedimento', c.procedure], ['Risco', c.riskLevel],
    ];
    patientFields.forEach(([k, v]) => { doc.text(`${k}: ${v}`, 14, y); y += 5; });
    y += 5;
    // AI Analysis
    if (c.aiAnalysis) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 86, 179);
        doc.text('Análise IA — OrthoVision', 14, y);
        y += 7;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(`Pontuação de Precisão: ${c.aiAnalysis.precisionScore}%`, 14, y);
        y += 5;
        doc.text(`Confiança do Modelo: ${(c.aiAnalysis.confidence * 100).toFixed(0)}%`, 14, y);
        y += 5;
        doc.text(`Tempo de Processamento: ${c.aiAnalysis.processingTimeMs}ms`, 14, y);
        y += 8;
        doc.setFont('helvetica', 'bold');
        doc.text('Landmarks Anatômicos Detectados:', 14, y);
        y += 6;
        doc.setFont('helvetica', 'normal');
        c.aiAnalysis.anatomicalLandmarks.forEach(l => {
            const status = l.detected ? `✓ ${(l.confidence * 100).toFixed(0)}%` : '✗ Não detectado';
            doc.text(`• ${l.name}: ${status}`, 14, y);
            y += 5;
        });
        y += 5;
        doc.setFont('helvetica', 'bold');
        doc.text('Recomendações:', 14, y);
        y += 6;
        doc.setFont('helvetica', 'normal');
        c.aiAnalysis.recommendations.forEach(r => { doc.text(`• ${r}`, 14, y); y += 5; });
    }
    addFooter(doc);
    doc.save(`ortobolt-caso-${c.id}-${c.patientName.toLowerCase()}.pdf`);
}

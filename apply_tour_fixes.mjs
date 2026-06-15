import fs from 'fs';

const path = 'src/components/ProductTour.tsx';
const content = fs.readFileSync(path, 'utf8');
const eol = content.includes('\r\n') ? '\r\n' : '\n';
const lines = content.split(/\r?\n/);

let newLines = [];
let i = 0;
let galleryReplaced = false;
let reportReplaced = false;
let footerReplaced = false;

while (i < lines.length) {
  const line = lines[i];

  // 1. GALERIA
  if (line.trim().startsWith('gallery: [')) {
    newLines.push(line);
    newLines.push("    { target: '__welcome__', title: '🗂️ Memória Clínica Centralizada', content: 'Aqui fica o histórico completo de cada paciente. Acompanhe a evolução, reconsultas e protocolos em um só lugar.', placement: 'center' },");
    newLines.push("    { target: 'tour-gallery-filters', title: '⚡ Triagem Rápida', content: 'Encontre casos urgentes ou recorrentes em segundos. Filtre por status para focar no que precisa de atenção agora.', placement: 'bottom', highlight: true },");
    newLines.push("    { target: 'tour-gallery-grid', title: '🔍 Visão 360° do Paciente', content: 'Clique em qualquer card e acesse instantaneamente o laudo da IA, imagens, checklist pós-op e geração de PDF.', placement: 'bottom', highlight: true },");
    newLines.push("    { target: 'tour-add-case', title: '📝 Registro Flexível', content: 'Adicione casos manuais ou provenientes de outras clínicas. A IA pode ser aplicada a qualquer momento depois.', placement: 'left', highlight: true },");
    i++;
    while (i < lines.length && !lines[i].trim().startsWith('],')) { i++; }
    galleryReplaced = true;
    continue;
  }

  // 2. RELATÓRIOS
  if (line.includes("target: 'tour-case-report'")) {
    newLines.push(line);
    newLines.push("    { target: 'tour-report-customize', title: '🎨 Personalização de Marca', content: 'Configure a identidade visual da sua clínica (logo, cores, cabeçalho) para que todos os PDFs saiam profissionais e padronizados.', placement: 'right', highlight: true },");
    i++;
    reportReplaced = true;
    continue;
  }

  // 3. UX (Rodapé do Tooltip)
  if (line.includes('<div className="flex gap-1.5">') && !footerReplaced) {
    newLines.push('        <div className="flex items-center gap-3">');
    newLines.push('          <button');
    newLines.push('            onClick={onClose}');
    newLines.push('            className="text-xs font-medium text-slate-500 hover:text-red-600 transition-colors"');
    newLines.push('          >');
    newLines.push('            Pular');
    newLines.push('          </button>');
    newLines.push('          <span className="text-xs font-semibold text-slate-600">');
    newLines.push('            {stepIndex + 1} / {total}');
    newLines.push('          </span>');
    newLines.push('          <div className="flex gap-1.5">');
    newLines.push('            {Array.from({ length: total }).map((_, i) => (');
    newLines.push('              <div');
    newLines.push('                key={i}');
    newLines.push("                className={`rounded-full transition-all duration-200 ${i === stepIndex ? 'w-5 h-2 bg-[#0056b3]' : 'w-2 h-2 bg-slate-200'`}");
    newLines.push('              />');
    newLines.push('            ))}');
    newLines.push('          </div>');
    newLines.push('        </div>');
    i++;
    while (i < lines.length && !lines[i].includes('<div className="flex gap-2">')) { i++; }
    footerReplaced = true;
    continue;
  }

  newLines.push(line);
  i++;
}

if (!galleryReplaced || !reportReplaced || !footerReplaced) {
  console.error('❌ ERRO: Nem todos os blocos foram encontrados. Abortando sem salvar.');
  console.error(`Galeria: ${galleryReplaced}, Relatórios: ${reportReplaced}, Rodapé: ${footerReplaced}`);
  process.exit(1);
}

fs.writeFileSync(path, newLines.join(eol), 'utf8');
console.log('✅ Modificações aplicadas com parser de linhas (Estrutura JSX preservada).');

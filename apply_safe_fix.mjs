const fs = require('fs');
const path = 'src/components/ProductTour.tsx';
let content = fs.readFileSync(path, 'utf8');
const isCRLF = content.includes('\r\n');
content = content.replace(/\r\n/g, '\n');

// 1. Gallery
const galRegex = /(gallery:\s*\[)([\s\S]*?)(\n\s{2}\],\s*\n\s{2}case:)/;
const newGal = `
    { target: '__welcome__', title: '🗂️ Memória Clínica Centralizada', content: 'Aqui fica o histórico completo de cada paciente. Acompanhe a evolução, reconsultas e protocolos em um só lugar.', placement: 'center' },
    { target: 'tour-gallery-filters', title: '⚡ Triagem Rápida', content: 'Encontre casos urgentes ou recorrentes em segundos. Filtre por status para focar no que precisa de atenção agora.', placement: 'bottom', highlight: true },
    { target: 'tour-gallery-grid', title: '🔍 Visão 360° do Paciente', content: 'Clique em qualquer card e acesse instantaneamente o laudo da IA, imagens, checklist pós-op e geração de PDF.', placement: 'bottom', highlight: true },
    { target: 'tour-add-case', title: '📝 Registro Flexível', content: 'Adicione casos manuais ou provenientes de outras clínicas. A IA pode ser aplicada a qualquer momento depois.', placement: 'left', highlight: true },`;
if (galRegex.test(content)) {
  content = content.replace(galRegex, "$1" + newGal + "$3");
  console.log("✅ 1. Galeria atualizada.");
} else { console.log("⚠️ 1. Galeria não encontrada."); }

// 2. Reports
const repRegex = /(\{ target: 'tour-case-report'[\s\S]*?\},)\n/;
const newRep = `
    { target: 'tour-report-customize', title: '🎨 Personalização de Marca', content: 'Configure a identidade visual da sua clínica (logo, cores, cabeçalho) para que todos os PDFs saiam profissionais e padronizados.', placement: 'right', highlight: true },`;
if (repRegex.test(content)) {
  content = content.replace(repRegex, "$1" + newRep + "\n");
  console.log("✅ 2. Passo Personalização adicionado.");
} else { console.log("⚠️ 2. Laudo Clínico não encontrado."); }

// 3. Footer
const footRegex = /(<div className="px-5 pb-4 flex items-center justify-between">\s*\n\s*<div className=")(flex gap-1\.5)(">)/;
const newFoot = `$1flex items-center gap-3$3
          <button
            onClick={onClose}
            className="text-xs font-medium text-slate-500 hover:text-red-600 transition-colors"
          >
            Pular
          </button>
          <span className="text-xs font-semibold text-slate-600">
            {stepIndex + 1} / {total}
          </span>
          <div className="$2$3`;
if (footRegex.test(content)) {
  content = content.replace(footRegex, newFoot);
  console.log("✅ 3. Botão Pular e X/Y adicionados.");
} else { console.log("⚠️ 3. Rodapé não encontrado."); }

const final = isCRLF ? content.replace(/\n/g, '\r\n') : content;
fs.writeFileSync(path, final, 'utf8');
console.log("💾 Arquivo salvo com sucesso.");

import { readFileSync, writeFileSync } from 'fs';
const PATH = 'src/components/ProductTour.tsx';
const original = readFileSync(PATH, 'utf8');
const hasCRLF = original.includes('\r\n');
const content = original.replace(/\r\n/g, '\n');
let modified = content;

const galRegex = /(gallery:\s*\[)([\s\S]*?)(\n\s{2}\],\s*\n\s{2}case:)/;
const newGal = `\n    { target: '__welcome__', title: '🗂️ Memória Clínica Centralizada', content: 'Aqui fica o histórico completo de cada paciente. Acompanhe a evolução, reconsultas e protocolos em um só lugar.', placement: 'center' },\n    { target: 'tour-gallery-filters', title: '⚡ Triagem Rápida', content: 'Encontre casos urgentes ou recorrentes em segundos. Filtre por status para focar no que precisa de atenção agora.', placement: 'bottom', highlight: true },\n    { target: 'tour-gallery-grid', title: '🔍 Visão 360° do Paciente', content: 'Clique em qualquer card e acesse instantaneamente o laudo da IA, imagens, checklist pós-op e geração de PDF.', placement: 'bottom', highlight: true },\n    { target: 'tour-add-case', title: '📝 Registro Flexível', content: 'Adicione casos manuais ou provenientes de outras clínicas. A IA pode ser aplicada a qualquer momento depois.', placement: 'left', highlight: true },`;
if (!galRegex.test(modified)) { console.error('❌ Bloco gallery não encontrado.'); process.exit(1); }
modified = modified.replace(galRegex, `$1${newGal}$3`);
console.log('✅ 1. Galeria reescrita.');

const repRegex = /( {4}\{ target: 'tour-case-report'[\s\S]*?\},)\n/;
const newRep = `\n    { target: 'tour-report-customize', title: '🎨 Personalização de Marca', content: 'Configure a identidade visual da sua clínica (logo, cores, cabeçalho) para que todos os PDFs saiam profissionais e padronizados.', placement: 'right', highlight: true },`;
if (!repRegex.test(modified)) { console.error('❌ Passo tour-case-report não encontrado.'); process.exit(1); }
modified = modified.replace(repRegex, `$1${newRep}\n`);
console.log('✅ 2. Passo Personalização adicionado.');

// CORREÇÃO: Removido o $3 que causava aspas duplas ("">)
const uxRegex = /(<div className="px-5 pb-4 flex items-center justify-between">\s*\n\s*<div className=")(flex gap-1\.5)(">)/;
const newUx = `$1flex items-center gap-3">\n          <button onClick={onClose} className="text-xs font-medium text-slate-500 hover:text-red-600 transition-colors">Pular</button>\n          <span className="text-xs font-semibold text-slate-600">{stepIndex + 1} / {total}</span>\n          <div className="$2">`;
if (!uxRegex.test(modified)) { console.error('❌ Rodapé do Tooltip não encontrado.'); process.exit(1); }
modified = modified.replace(uxRegex, newUx);
console.log('✅ 3. Botão Pular e X/Y adicionados.');

const opens = (modified.match(/\{/g) || []).length;
const closes = (modified.match(/\}/g) || []).length;
if (opens !== closes) { console.error('❌ VALIDAÇÃO FALHOU: Chaves desbalanceadas.'); process.exit(1); }

const finalContent = hasCRLF ? modified.replace(/\n/g, '\r\n') : modified;
writeFileSync(PATH, finalContent, 'utf8');
console.log('\n🎉 Sucesso. Arquivo salvo.');

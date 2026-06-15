# fix_tour_complete_v2.py
# Versão corrigida que lida com variações de espaços em branco
import sys
import re

# ==========================================
# PARTE 1: ReportsPage.tsx - Adicionar data-tour
# ==========================================
reports_path = "src/pages/ReportsPage.tsx"

with open(reports_path, "rb") as f:
    reports_content = f.read()

# Padrão mais flexível (aceita espaço único ou duplo)
old_customization_card = rb'<Card\s+className="p-5 mb-4 border-l-4 border-l-\[#0056b3\]">'
new_customization_card = b'<Card data-tour="tour-report-customize" className="p-5 mb-4 border-l-4 border-l-[#0056b3]">'

if re.search(old_customization_card, reports_content):
    reports_content = re.sub(old_customization_card, new_customization_card, reports_content)
    with open(reports_path, "wb") as f:
        f.write(reports_content)
    print("✅ 1. ReportsPage: data-tour='tour-report-customize' adicionado.")
else:
    print("⚠️ 1. Card de Personalização não encontrado. Abortando.")
    sys.exit(1)

# ==========================================
# PARTE 2: ProductTour.tsx - Atualizações
# ==========================================
tour_path = "src/components/ProductTour.tsx"

with open(tour_path, "rb") as f:
    tour_content = f.read()

changes = []

# 2.1 GALERIA: Usar regex para lidar com espaços variáveis
old_gallery_pattern = rb"gallery:\s*\[\s*\{\s*target:\s*'__welcome__',\s*title:\s*'🗂️\s+Galeria de Casos',\s*content:\s*'Seu acervo clínico\..*?placement:\s*'left',\s*highlight:\s*true\s*\},\s*\],"

new_gallery = b"""gallery: [
    { target: '__welcome__', title: '🗂️ Memória Clínica Centralizada', content: 'Aqui fica o histórico completo de cada paciente. Acompanhe a evolução, reconsultas e protocolos em um só lugar.', placement: 'center' },
    { target: 'tour-gallery-filters', title: '⚡ Triagem Rápida', content: 'Encontre casos urgentes ou recorrentes em segundos. Filtre por status para focar no que precisa de atenção agora.', placement: 'bottom', highlight: true },
    { target: 'tour-gallery-grid', title: '🔍 Visão 360° do Paciente', content: 'Clique em qualquer card e acesse instantaneamente o laudo da IA, imagens, checklist pós-op e geração de PDF.', placement: 'bottom', highlight: true },
    { target: 'tour-add-case', title: '📝 Registro Flexível', content: 'Adicione casos manuais ou provenientes de outras clínicas. A IA pode ser aplicada a qualquer momento depois.', placement: 'left', highlight: true },
  ],"""

if re.search(old_gallery_pattern, tour_content, re.DOTALL):
    tour_content = re.sub(old_gallery_pattern, new_gallery, tour_content, flags=re.DOTALL)
    changes.append("✅ 2. Galeria: reescrita com foco em valor clínico.")
else:
    print("⚠️ 2. Padrão da Galeria não encontrado. Abortando.")
    sys.exit(1)

# 2.2 RELATÓRIOS: Adicionar passo de Personalização (padrão exato)
old_report = b"    { target: 'tour-case-report', title: '🔖 Laudo Clínico', content: 'Selecione um caso e gere o PDF completo (Guia para o Tutor) com a logo da sua clínica.', placement: 'bottom', highlight: true },\n"
new_report = b"""    { target: 'tour-case-report', title: '🔖 Laudo Clínico', content: 'Selecione um caso e gere o PDF completo (Guia para o Tutor) com a logo da sua clínica.', placement: 'bottom', highlight: true },
    { target: 'tour-report-customize', title: '🎨 Personalização de Marca', content: 'Configure a identidade visual da sua clínica (logo, cores, cabeçalho) para que todos os PDFs saiam profissionais e padronizados.', placement: 'right', highlight: true },
"""

if old_report in tour_content:
    tour_content = tour_content.replace(old_report, new_report)
    changes.append("✅ 3. Relatórios: adicionado passo 'Personalização de Marca'.")
else:
    print("⚠️ 3. Passo Laudo Clínico não encontrado. Abortando.")
    sys.exit(1)

# 2.3 UX: Botão Pular + Indicador X/Y (padrão exato)
old_footer = b"""      <div className="px-5 pb-4 flex items-center justify-between">
        <div className="flex gap-1.5">
          {Array.from({ length: total }).map((_, i) => ("""
new_footer = b"""      <div className="px-5 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="text-xs font-medium text-slate-500 hover:text-red-600 transition-colors"
          >
            Pular
          </button>
          <span className="text-xs font-semibold text-slate-600">
            {stepIndex + 1} / {total}
          </span>
          <div className="flex gap-1.5">
            {Array.from({ length: total }).map((_, i) => ("""

if old_footer in tour_content:
    tour_content = tour_content.replace(old_footer, new_footer)
    changes.append("✅ 4. UX: adicionado botão 'Pular' e indicador 'Passo X / Y'.")
else:
    print("⚠️ 4. Padrão do rodapé não encontrado. Abortando.")
    sys.exit(1)

# SALVAR
with open(tour_path, "wb") as f:
    f.write(tour_content)

print("\n🎉 Atualização completa concluída com sucesso!")
for c in changes:
    print(c)
print(f"📄 Arquivos modificados:")
print(f"   - {reports_path}")
print(f"   - {tour_path}")
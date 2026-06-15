# fix_tour_complete_v4.py
# Versão conservadora: usa substituição literal (sem regex) para evitar corrupção
import sys

# ==========================================
# PARTE 1: ReportsPage.tsx - Adicionar data-tour
# ==========================================
reports_path = "src/pages/ReportsPage.tsx"

with open(reports_path, "r", encoding="utf-8") as f:
    reports_content = f.read()

old_customization_card = '<Card className="p-5 mb-4 border-l-4 border-l-[#0056b3]">'
new_customization_card = '<Card data-tour="tour-report-customize" className="p-5 mb-4 border-l-4 border-l-[#0056b3]">'

if old_customization_card in reports_content:
    reports_content = reports_content.replace(old_customization_card, new_customization_card, 1)
    with open(reports_path, "w", encoding="utf-8") as f:
        f.write(reports_content)
    print("✅ 1. ReportsPage: data-tour='tour-report-customize' adicionado.")
else:
    print("⚠️ 1. Card de Personalização não encontrado. Abortando.")
    sys.exit(1)

# ==========================================
# PARTE 2: ProductTour.tsx - Atualizações
# ==========================================
tour_path = "src/components/ProductTour.tsx"

with open(tour_path, "r", encoding="utf-8") as f:
    tour_content = f.read()

# Validar integridade antes de modificar
original_braces = tour_content.count("{") + tour_content.count("}")
original_parens = tour_content.count("(") + tour_content.count(")")

changes = []

# 2.1 GALERIA: Substituição literal com espaço duplo (exato do arquivo)
old_gallery = """  gallery: [
    { target: '__welcome__', title: '🗂️  Galeria de Casos', content: 'Seu acervo clínico. Todos os casos aprovados e registrados estão aqui.', placement: 'center' },
    { target: 'tour-gallery-filters', title: '🔍 Busca e Filtros', content: 'Localize casos rapidamente pelo nome do paciente ou filtre por status.', placement: 'bottom', highlight: true },
    { target: 'tour-gallery-grid', title: '🐕 Seus Casos', content: 'Clique no card para abrir os detalhes do paciente, o laudo da IA e o protocolo.', placement: 'bottom', highlight: true },
    { target: 'tour-add-case', title: '➕ Novo Caso', content: 'Cadastre um paciente manualmente, sem precisar enviar uma imagem para análise.', placement: 'left', highlight: true },
  ],"""

new_gallery = """  gallery: [
    { target: '__welcome__', title: '🗂️ Memória Clínica Centralizada', content: 'Aqui fica o histórico completo de cada paciente. Acompanhe a evolução, reconsultas e protocolos em um só lugar.', placement: 'center' },
    { target: 'tour-gallery-filters', title: '⚡ Triagem Rápida', content: 'Encontre casos urgentes ou recorrentes em segundos. Filtre por status para focar no que precisa de atenção agora.', placement: 'bottom', highlight: true },
    { target: 'tour-gallery-grid', title: '🔍 Visão 360° do Paciente', content: 'Clique em qualquer card e acesse instantaneamente o laudo da IA, imagens, checklist pós-op e geração de PDF.', placement: 'bottom', highlight: true },
    { target: 'tour-add-case', title: '📝 Registro Flexível', content: 'Adicione casos manuais ou provenientes de outras clínicas. A IA pode ser aplicada a qualquer momento depois.', placement: 'left', highlight: true },
  ],"""

if old_gallery in tour_content:
    tour_content = tour_content.replace(old_gallery, new_gallery, 1)
    changes.append("✅ 2. Galeria: reescrita com foco em valor clínico.")
else:
    print("⚠️ 2. Padrão da Galeria não encontrado. Abortando.")
    sys.exit(1)

# 2.2 RELATÓRIOS: Adicionar passo de Personalização
old_report = "    { target: 'tour-case-report', title: '🔖 Laudo Clínico', content: 'Selecione um caso e gere o PDF completo (Guia para o Tutor) com a logo da sua clínica.', placement: 'bottom', highlight: true },\n"
new_report = """    { target: 'tour-case-report', title: '🔖 Laudo Clínico', content: 'Selecione um caso e gere o PDF completo (Guia para o Tutor) com a logo da sua clínica.', placement: 'bottom', highlight: true },
    { target: 'tour-report-customize', title: '🎨 Personalização de Marca', content: 'Configure a identidade visual da sua clínica (logo, cores, cabeçalho) para que todos os PDFs saiam profissionais e padronizados.', placement: 'right', highlight: true },
"""

if old_report in tour_content:
    tour_content = tour_content.replace(old_report, new_report, 1)
    changes.append("✅ 3. Relatórios: adicionado passo 'Personalização de Marca'.")
else:
    print("⚠️ 3. Passo Laudo Clínico não encontrado. Abortando.")
    sys.exit(1)

# 2.3 UX: Botão Pular + Indicador X/Y
old_footer = """      <div className="px-5 pb-4 flex items-center justify-between">
        <div className="flex gap-1.5">
          {Array.from({ length: total }).map((_, i) => ("""
new_footer = """      <div className="px-5 pb-4 flex items-center justify-between">
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
    tour_content = tour_content.replace(old_footer, new_footer, 1)
    changes.append("✅ 4. UX: adicionado botão 'Pular' e indicador 'Passo X / Y'.")
else:
    print("⚠️ 4. Padrão do rodapé não encontrado. Abortando.")
    sys.exit(1)

# ==========================================
# VALIDAÇÃO DE INTEGRIDADE
# ==========================================
new_braces = tour_content.count("{") + tour_content.count("}")
new_parens = tour_content.count("(") + tour_content.count(")")

if new_braces != original_braces:
    print(f"⚠️ VALIDAÇÃO FALHOU: Contagem de chaves mudou ({original_braces} -> {new_braces}). Abortando.")
    sys.exit(1)

if new_parens != original_parens:
    print(f"⚠️ VALIDAÇÃO FALHOU: Contagem de parênteses mudou ({original_parens} -> {new_parens}). Abortando.")
    sys.exit(1)

print("✅ Validação de integridade: chaves e parênteses balanceados.")

# SALVAR
with open(tour_path, "w", encoding="utf-8") as f:
    f.write(tour_content)

print("\n🎉 Atualização completa concluída com sucesso!")
for c in changes:
    print(c)
print(f"📄 Arquivos modificados:")
print(f"   - {reports_path}")
print(f"   - {tour_path}")
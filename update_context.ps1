# Atualização do contexto do projeto e reindexação MCP
$projectPath = "C:\Users\User\OneDrive\Documentos\OrtoBolt\ortobolt"
cd $projectPath

# 1. Atualiza cache/indexação local (exemplo de limpeza de artefatos)
Remove-Item -Path "dist", ".next" -Recurse -ErrorAction SilentlyContinue

# 2. Comando para forçar reindexação do MCP (Reinício via npx)
# A IA lê o diretório diretamente, então garantir que não há travamentos no filesystem é vital
Write-Host "Contexto atualizado para: $projectPath" -ForegroundColor Cyan


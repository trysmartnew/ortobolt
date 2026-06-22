# --- Configuração de Verificação ---
$projectPath = "C:\Users\User\OneDrive\Documentos\OrtoBolt\ortobolt"
$keysToVerify = @("GROQ_API_KEY", "GOOGLE_API_KEY", "OPENROUTER_API_KEY")
$requiredPaths = @("$projectPath\ai-router\src\index.ts", "$projectPath\project_map.json")

Write-Host "--- Iniciando Dry-Run (Verificação) ---" -ForegroundColor Yellow

# 1. Validação de Variáveis de Ambiente
$envValid = $true
foreach ($key in $keysToVerify) {
    # Correção: Acesso dinâmico via GetEnvironmentVariable
    if ([string]::IsNullOrWhiteSpace([System.Environment]::GetEnvironmentVariable($key))) {
        Write-Host "[ERRO] Variável $key não encontrada no ambiente." -ForegroundColor Red
        $envValid = $false
    } else {
        Write-Host "[OK] Variável $key detectada." -ForegroundColor Green
    }
}

# 2. Validação de Estrutura de Arquivos
$pathsValid = $true
foreach ($path in $requiredPaths) {
    if (-not (Test-Path $path)) {
        Write-Host "[ERRO] Caminho não encontrado: $path" -ForegroundColor Red
        $pathsValid = $false
    } else {
        Write-Host "[OK] Caminho verificado: $(Split-Path $path -Leaf)" -ForegroundColor Green
    }
}

# 3. Decisão de Execução
if ($envValid -and $pathsValid) {
    Write-Host "`n--- Verificação Concluída: Iniciando Execução Prática ---" -ForegroundColor Cyan
    
    # Atualiza Mapa (ignora erros de exclusão de arquivos se existirem)
    Get-ChildItem -Recurse -Exclude node_modules,.git,.next,dist | Select-Object FullName, LastWriteTime | ConvertTo-Json | Set-Content "project_map.json"
    
    # Executa o Agente
    npx ts-node ai-router/src/index.ts "Analise o project_map.json e gere um relatório de estrutura em Markdown" "project_map.json"
} else {
    Write-Host "`n[ABORTADO] Verificação falhou. Corrija o ambiente antes de prosseguir." -ForegroundColor Red
}
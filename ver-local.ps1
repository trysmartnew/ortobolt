Write-Host "`n🚀 Iniciando servidor Vite do OrtoBolt..." -ForegroundColor Cyan
Write-Host "📂 Diretório: $(Get-Location)" -ForegroundColor Yellow
Write-Host "🌐 URL: http://localhost:5173/" -ForegroundColor Green
Write-Host "⏹️  Para parar: Ctrl+C`n" -ForegroundColor Gray

if (-not (Test-Path "node_modules")) {
    Write-Host "⚠️  Instalando dependências..." -ForegroundColor Yellow
    npm install
}

npm run dev
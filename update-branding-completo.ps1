# ============================================================================
# ORTOBOLT - Atualização Completa de Branding
# Script para VS Code Terminal (Windows PowerShell)
# ============================================================================

# Configurações de cores
$ColorSuccess = "Green"
$ColorError = "Red"
$ColorInfo = "Cyan"
$ColorWarning = "Yellow"

function Write-Color {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

# ============================================================================
# 1. DEFINIR CAMINHOS
# ============================================================================
$SourceFolder = "C:\Users\User\OneDrive\Documentos\OrtoBolt"
$ProjectRoot = "C:\Users\User\OneDrive\Documentos\OrtoBolt\ortobolt"
$PublicFolder = "$ProjectRoot\public"

# Imagens de origem
$SourceLogoInicio = "$SourceFolder\logo-nova-inicio.png"
$SourceLogoPaginas = "$SourceFolder\logo-nova-paginas.png"
$SourceSocialPreview = "$SourceFolder\social-novo-preview-ortopedia.png"

# Destinos no projeto
$DestLogoInicio = "$PublicFolder\logo-inicio.png"
$DestLogoPaginas = "$PublicFolder\logo-paginas.png"
$DestOgImage = "$PublicFolder\og-image.png"

# Arquivos para atualização
$IndexHtml = "$ProjectRoot\index.html"
$HomePage = "$ProjectRoot\src\pages\HomePage.tsx"
$Sidebar = "$ProjectRoot\src\components\Sidebar.tsx"

# Novos metadados
$NewTitle = "OrtoBolt | Cirurgia veterinária mais precisa, rápida e segura"
$NewDescription = "A plataforma completa para o ortopedista veterinário: diagnóstico por imagem com IA, planejamento cirúrgico preciso e prontuário clínico integrado. Eleve o nível da sua prática cirúrgica."
$NewOgUrl = "https://ortobolt.vercel.app"
$NewOgImage = "https://ortobolt.vercel.app/og-image.png"

Write-Color "╔════════════════════════════════════════════════════════════╗" $ColorInfo
Write-Color "║     ORTOBOLT - Atualização Completa de Branding           ║" $ColorInfo
Write-Color "║     (Logos + Preview Social + Meta Tags)                  ║" $ColorInfo
Write-Color "╚════════════════════════════════════════════════════════════╝" $ColorInfo
Write-Host ""

# ============================================================================
# 2. VALIDAR ARQUIVOS DE ORIGEM
# ============================================================================
Write-Color "[1/6] Verificando arquivos de origem..." $ColorInfo

$filesOk = $true
$filesToCheck = @(
    @{Path=$SourceLogoInicio; Name="Logo Início"},
    @{Path=$SourceLogoPaginas; Name="Logo Páginas"},
    @{Path=$SourceSocialPreview; Name="Preview Social"}
)

foreach ($file in $filesToCheck) {
    if (-Not (Test-Path $file.Path)) {
        Write-Color "   ❌ ERRO: $($file.Name) não encontrado em: $($file.Path)" $ColorError
        $filesOk = $false
    } else {
        $fileSize = (Get-Item $file.Path).Length / 1KB
        Write-Color "   ✓ $($file.Name): $([Math]::Round($fileSize, 2)) KB" $ColorSuccess
    }
}

if (-not $filesOk) {
    Write-Host ""
    Write-Color "⚠️  Verifique se todas as imagens estão na pasta:" $ColorWarning
    Write-Host "   $SourceFolder"
    exit 1
}

# ============================================================================
# 3. VALIDAR RAIZ DO PROJETO
# ============================================================================
Write-Color "[2/6] Verificando estrutura do projeto..." $ColorInfo

if (-Not (Test-Path $ProjectRoot)) {
    Write-Color "   ❌ ERRO: Pasta do projeto não encontrada: $ProjectRoot" $ColorError
    exit 1
}

if (-Not (Test-Path $PublicFolder)) {
    New-Item -ItemType Directory -Path $PublicFolder -Force | Out-Null
    Write-Color "   ✓ Pasta 'public' criada" $ColorSuccess
} else {
    Write-Color "   ✓ Pasta 'public' encontrada" $ColorSuccess
}

if (-Not (Test-Path $IndexHtml)) {
    Write-Color "   ❌ ERRO: index.html não encontrado" $ColorError
    exit 1
}

# ============================================================================
# 4. COPIAR IMAGENS
# ============================================================================
Write-Color "[3/6] Copiando imagens para o projeto..." $ColorInfo

try {
    # Criar backups
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $backupFolder = "$PublicFolder\backups\$timestamp"
    New-Item -ItemType Directory -Path $backupFolder -Force | Out-Null
    
    # Backup das imagens antigas
    foreach ($oldFile in @($DestLogoInicio, $DestLogoPaginas, $DestOgImage)) {
        if (Test-Path $oldFile) {
            $backupName = Split-Path $oldFile -Leaf
            Copy-Item -Path $oldFile -Destination "$backupFolder\$backupName" -Force
            Write-Color "   ✓ Backup criado: $backupName" $ColorSuccess
        }
    }
    
    # Copiar novas imagens
    Copy-Item -Path $SourceLogoInicio -Destination $DestLogoInicio -Force
    Write-Color "   ✓ logo-inicio.png atualizado" $ColorSuccess
    
    Copy-Item -Path $SourceLogoPaginas -Destination $DestLogoPaginas -Force
    Write-Color "   ✓ logo-paginas.png atualizado" $ColorSuccess
    
    Copy-Item -Path $SourceSocialPreview -Destination $DestOgImage -Force
    Write-Color "   ✓ og-image.png atualizado" $ColorSuccess
}
catch {
    Write-Color "   ❌ ERRO ao copiar imagens: $_" $ColorError
    exit 1
}

# ============================================================================
# 5. ATUALIZAR META TAGS NO INDEX.HTML
# ============================================================================
Write-Color "[4/6] Atualizando meta tags no index.html..." $ColorInfo

try {
    $htmlContent = Get-Content -Path $IndexHtml -Raw -Encoding UTF8
    
    # Atualizar título principal
    $htmlContent = $htmlContent -replace 
        '<title>.*?</title>',
        "<title>$NewTitle</title>"
    
    # Atualizar meta description
    $htmlContent = $htmlContent -replace 
        '<meta name="description" content=".*?" />',
        "<meta name=`"description`" content=`"$NewDescription`" />"
    
    # Atualizar Open Graph tags
    $htmlContent = $htmlContent -replace 
        '<meta property="og:title" content=".*?" />',
        "<meta property=`"og:title`" content=`"$NewTitle`" />"
    
    $htmlContent = $htmlContent -replace 
        '<meta property="og:description" content=".*?" />',
        "<meta property=`"og:description`" content=`"$NewDescription`" />"
    
    $htmlContent = $htmlContent -replace 
        '<meta property="og:image" content=".*?" />',
        "<meta property=`"og:image`" content=`"$NewOgImage`" />"
    
    $htmlContent = $htmlContent -replace 
        '<meta property="og:url" content=".*?" />',
        "<meta property=`"og:url`" content=`"$NewOgUrl`" />"
    
    # Atualizar Twitter Card tags
    $htmlContent = $htmlContent -replace 
        '<meta name="twitter:title" content=".*?" />',
        "<meta name=`"twitter:title`" content=`"$NewTitle`" />"
    
    $htmlContent = $htmlContent -replace 
        '<meta name="twitter:description" content=".*?" />',
        "<meta name=`"twitter:description`" content=`"$NewDescription`" />"
    
    $htmlContent = $htmlContent -replace 
        '<meta name="twitter:image" content=".*?" />',
        "<meta name=`"twitter:image`" content=`"$NewOgImage`" />"
    
    # Salvar arquivo
    Set-Content -Path $IndexHtml -Value $htmlContent -Encoding UTF8 -NoNewline
    Write-Color "   ✓ Meta tags atualizadas com sucesso" $ColorSuccess
}
catch {
    Write-Color "   ❌ ERRO ao atualizar index.html: $_" $ColorError
    exit 1
}

# ============================================================================
# 6. ATUALIZAR COMPONENTES REACT
# ============================================================================
Write-Color "[5/6] Atualizando componentes React..." $ColorInfo

# Atualizar HomePage.tsx
if (Test-Path $HomePage) {
    try {
        $homeContent = Get-Content -Path $HomePage -Raw -Encoding UTF8
        
        # Atualizar logo no header (linha com className="h-8 w-auto object-contain")
        $homeContent = $homeContent -replace 
            'src="/logo\.png"',
            'src="/logo-inicio.png"'
        
        # Atualizar logo no footer
        $homeContent = $homeContent -replace 
            'alt="OrtoBolt"',
            'alt="OrtoBolt"'
        
        Set-Content -Path $HomePage -Value $homeContent -Encoding UTF8 -NoNewline
        Write-Color "   ✓ HomePage.tsx atualizado" $ColorSuccess
    }
    catch {
        Write-Color "   ⚠ Aviso: Não foi possível atualizar HomePage.tsx: $_" $ColorWarning
    }
}

# Atualizar Sidebar.tsx
if (Test-Path $Sidebar) {
    try {
        $sidebarContent = Get-Content -Path $Sidebar -Raw -Encoding UTF8
        
        # Atualizar logo da sidebar
        $sidebarContent = $sidebarContent -replace 
            'src="/logo\.png"',
            'src="/logo-paginas.png"'
        
        Set-Content -Path $Sidebar -Value $sidebarContent -Encoding UTF8 -NoNewline
        Write-Color "   ✓ Sidebar.tsx atualizado" $ColorSuccess
    }
    catch {
        Write-Color "   ⚠ Aviso: Não foi possível atualizar Sidebar.tsx: $_" $ColorWarning
    }
}

# ============================================================================
# 7. LIMPAR CACHE
# ============================================================================
Write-Color "[6/6] Limpando cache do Vite..." $ColorInfo

$CacheDirs = @(
    "$ProjectRoot\node_modules\.vite",
    "$ProjectRoot\dist",
    "$ProjectRoot\.vite"
)

foreach ($dir in $CacheDirs) {
    if (Test-Path $dir) {
        Remove-Item -Path $dir -Recurse -Force -ErrorAction SilentlyContinue
        Write-Color "   ✓ Cache limpo: $dir" $ColorSuccess
    }
}

# ============================================================================
# 8. RESUMO FINAL
# ============================================================================
Write-Host ""
Write-Color "╔════════════════════════════════════════════════════════════╗" $ColorSuccess
Write-Color "║              ✅ ATUALIZAÇÃO CONCLUÍDA                      ║" $ColorSuccess
Write-Color "╚════════════════════════════════════════════════════════════╝" $ColorSuccess

Write-Host ""
Write-Color "📋 Arquivos atualizados:" $ColorInfo
Write-Host "   • $DestLogoInicio"
Write-Host "   • $DestLogoPaginas"
Write-Host "   • $DestOgImage"
Write-Host "   • $IndexHtml"
Write-Host "   • $HomePage"
Write-Host "   • $Sidebar"

Write-Host ""
Write-Color "💾 Backups criados em:" $ColorInfo
Write-Host "   $backupFolder"

Write-Host ""
Write-Color "📱 Novo preview social:" $ColorInfo
Write-Host "   Título: $NewTitle"
Write-Host "   Descrição: $($NewDescription.Substring(0, [Math]::Min(100, $NewDescription.Length)))..."
Write-Host "   Imagem: $NewOgImage"

Write-Host ""
Write-Color "🚀 Próximos passos:" $ColorWarning
Write-Host "   1. No terminal do VS Code, execute:"
Write-Host "      npm run dev"
Write-Host ""
Write-Host "   2. Abra o navegador em modo anônimo (Ctrl+Shift+N)"
Write-Host "   3. Hard refresh: Ctrl+F5"
Write-Host ""
Write-Host "   4. Verifique:"
Write-Host "      • Tela de login: logo-inicio.png"
Write-Host "      • Após login: logo-paginas.png"
Write-Host "      • Meta tags: Inspecionar elemento > head"
Write-Host ""
Write-Host "   5. Para deploy no Vercel:"
Write-Host "      git add public/ src/ index.html"
Write-Host "      git commit -m 'feat: atualizar branding completo (logos + OG tags)'"
Write-Host "      git push"
Write-Host ""

Write-Color "🔍 Testar preview social em:" $ColorInfo
Write-Host "   • Facebook: https://developers.facebook.com/tools/debug/"
Write-Host "   • LinkedIn: https://www.linkedin.com/post-inspector/"
Write-Host "   • Twitter: https://cards-dev.twitter.com/validator"
Write-Host ""

Write-Color "════════════════════════════════════════════════════════════" $ColorInfo
Write-Color "OrtoBolt v1.0.0 · © 2025 OrtoBolt LTDA" $ColorInfo
Write-Color "════════════════════════════════════════════════════════════" $ColorInfo
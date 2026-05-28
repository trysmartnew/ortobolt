$env:PYTHONUTF8 = "1"
$md = "PROJETO_CONTEXTO.md"
if (Test-Path $md) { Copy-Item $md "$md.bak-$(Get-Date -f 'yyyyMMdd-HHmm')" -Force }

$R = Get-Location

function Count-Lines($p) { try { (Get-Content $p -Encoding utf8 -ErrorAction Stop).Count } catch { 0 } }
function Scan-Dir($d) {
    if (-not (Test-Path $d)) { return @() }
    Get-ChildItem $d -File | Where-Object { $_.Extension -in '.tsx','.ts' } |
    Sort-Object Name | ForEach-Object { [pscustomobject]@{ Name=$_.Name; Lines=(Count-Lines $_.FullName) } }
}
function Git($a) { try { git $a.Split(' ') 2>$null } catch { '?' } }

$pages = Scan-Dir "$R\src\pages"
$comps = Scan-Dir "$R\src\components"
$branch = Git "branch --show-current"
$remote = Git "remote get-url origin"
$rawCommits = git log "--pretty=format:%h|%s" -n 8 2>$null

$pkg = if (Test-Path "$R\package.json") { Get-Content "$R\package.json" -Raw | ConvertFrom-Json } else { $null }
$deps = @{}
if ($pkg) {
    $pkg.dependencies.PSObject.Properties    | ForEach-Object { $deps[$_.Name] = $_.Value }
    $pkg.devDependencies.PSObject.Properties | ForEach-Object { $deps[$_.Name] = $_.Value }
}
$kd = 'react','typescript','vite','@supabase/supabase-js','tailwindcss','recharts','lucide-react','jspdf','html2canvas'
$fd = $kd | Where-Object { $deps.ContainsKey($_) } | ForEach-Object { [pscustomobject]@{ Pkg=$_; Ver=$deps[$_] } }

$ev = @()
foreach ($ef in '.env.local','.env.example') {
    $ep = "$R\$ef"
    if (Test-Path $ep) {
        $ev = Get-Content $ep -Encoding utf8 | Where-Object { $_ -match '^\s*[^#].*=' } |
              ForEach-Object { ($_ -split '=')[0].Trim() }
        break
    }
}

$protocols = @()
$cp2 = "$R\src\pages\CasePage.tsx"
if (Test-Path $cp2) {
    $ct = Get-Content $cp2 -Raw -Encoding utf8
    [regex]::Matches($ct, "name:\s*'([^']+)'") | ForEach-Object {
        $v = $_.Groups[1].Value
        if ($v -match 'TPLO|FHO|TTA|LCP|Fratura|Protese|Artroplastia|Coluna') { $protocols += $v }
    }
}

$features = @()
$hp2 = "$R\src\pages\HomePage.tsx"
if (Test-Path $hp2) {
    $ht = Get-Content $hp2 -Raw -Encoding utf8
    [regex]::Matches($ht, "title:\s*'([^']+)'") | ForEach-Object {
        $v = $_.Groups[1].Value
        if ($v -match 'OrthoAI|Analise|Laudos|Colabora|Seguranca|Dashboard|Protocolos') { $features += $v }
    }
}

$now = Get-Date -Format 'dd/MM/yyyy HH:mm'
$L = [System.Collections.Generic.List[string]]::new()

$L.Add("# OrtoBolt - Contexto do Projeto"); $L.Add("")
$L.Add("> Ultima atualizacao: $now (auto-gerado)")
$L.Add("> Branch: $branch")
$L.Add("> Repositorio: $remote")
$L.Add("> Deploy: https://ortobolt.vercel.app")
$L.Add(""); $L.Add("---"); $L.Add("")
$L.Add("## Stack (lido de package.json)"); $L.Add("")
$L.Add("| Pacote | Versao |"); $L.Add("|--------|--------|")
$fd | ForEach-Object { $L.Add("| $($_.Pkg) | $($_.Ver) |") }
$L.Add(""); $L.Add("---"); $L.Add("")
$L.Add("## Paginas src/pages/"); $L.Add("")
$L.Add("| Arquivo | Linhas |"); $L.Add("|---------|--------|")
$pages | ForEach-Object { $L.Add("| $($_.Name) | $($_.Lines) |") }
$L.Add("| **TOTAL** | **$(($pages | Measure-Object Lines -Sum).Sum)** |")
$L.Add(""); $L.Add("## Componentes src/components/"); $L.Add("")
$L.Add("| Arquivo | Linhas |"); $L.Add("|---------|--------|")
$comps | ForEach-Object { $L.Add("| $($_.Name) | $($_.Lines) |") }
$L.Add("| **TOTAL** | **$(($comps | Measure-Object Lines -Sum).Sum)** |")
if ($protocols.Count) { $L.Add(""); $L.Add("## Protocolos (CasePage.tsx)"); $L.Add(""); $protocols | ForEach-Object { $L.Add("- $_") } }
if ($features.Count)  { $L.Add(""); $L.Add("## Features (HomePage.tsx)");  $L.Add(""); $features  | ForEach-Object { $L.Add("- $_") } }
if ($ev.Count)        { $L.Add(""); $L.Add("## Variaveis de Ambiente");     $L.Add(""); $ev        | ForEach-Object { $L.Add("- ``$_``") } }
$L.Add(""); $L.Add("---"); $L.Add("")
$L.Add("## Commits (ultimos 8)"); $L.Add("")
$L.Add("| Hash | Tipo | Mensagem |"); $L.Add("|------|------|----------|")
$rawCommits | Where-Object { $_ -match '\|' } | ForEach-Object {
    $h = ($_ -split '\|')[0].Trim(); $s = ($_ -split '\|',2)[1].Trim()
    $tp = @('feat','fix','perf','docs','chore','refactor') | Where-Object { $s.StartsWith($_) } | Select-Object -First 1
    if (-not $tp) { $tp = 'other' }
    $L.Add("| ``$h`` | $tp | $s |")
}
$L.Add(""); $L.Add("---"); $L.Add("")
$L.Add("## Supabase"); $L.Add("")
$L.Add("- Projeto: ortobolt-v2 | Ref: fhecacefkmnqtkdsldsy | Regiao: sa-east-1")
$L.Add("- RLS ativo | Storage: radiografias | Realtime: case_messages + presence")
$L.Add(""); $L.Add("## Seguranca e IA"); $L.Add("")
$L.Add("- Modelo: string via OpenRouter — proxy /api/ai.ts")
$L.Add("- CORS: ortobolt.vercel.app | ALLOWED_MODELS | anonymizeCaseContext()")
$L.Add("- Cache IA: Map TTL 5min max 50 entradas")
$L.Add("- Rate-limit login: 5 tentativas -> bloqueio 15min")

[IO.File]::WriteAllLines("$R\$md", $L, [Text.Encoding]::UTF8)
Write-Host "PROJETO_CONTEXTO.md atualizado com dados reais." -ForegroundColor Green

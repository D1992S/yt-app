# InsightEngine Desktop - Windows Setup Script
# Run with: powershell -ExecutionPolicy Bypass -File install_pnpm.ps1

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  InsightEngine Desktop - Windows Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check Node.js
Write-Host "[1/4] Checking Node.js..." -ForegroundColor Yellow
$nodeVersion = $null
try {
    $nodeVersion = (node --version 2>$null)
} catch {}

if (-not $nodeVersion) {
    Write-Host "  ERROR: Node.js is not installed." -ForegroundColor Red
    Write-Host "  Download from: https://nodejs.org/ (LTS version recommended, minimum v18)" -ForegroundColor Red
    Write-Host "  After installing Node.js, restart your terminal and run this script again." -ForegroundColor Red
    exit 1
}

$nodeVersionNum = [version]($nodeVersion -replace 'v','')
if ($nodeVersionNum.Major -lt 18) {
    Write-Host "  ERROR: Node.js $nodeVersion is too old. Minimum required: v18.0.0" -ForegroundColor Red
    Write-Host "  Download from: https://nodejs.org/" -ForegroundColor Red
    exit 1
}
Write-Host "  OK: Node.js $nodeVersion" -ForegroundColor Green

# 2. Check/Install pnpm
Write-Host "[2/4] Checking pnpm..." -ForegroundColor Yellow
$pnpmVersion = $null
try {
    $pnpmVersion = (pnpm --version 2>$null)
} catch {}

if (-not $pnpmVersion) {
    Write-Host "  Installing pnpm..." -ForegroundColor Yellow
    iwr https://get.pnpm.io/install.ps1 -useb | iex
    Write-Host "  pnpm installed. Refreshing PATH..." -ForegroundColor Green
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    try {
        $pnpmVersion = (pnpm --version 2>$null)
    } catch {
        Write-Host "  WARNING: pnpm was installed but may require a terminal restart." -ForegroundColor Yellow
        Write-Host "  Please close this terminal, open a new one, and run: pnpm install" -ForegroundColor Yellow
        exit 0
    }
}
Write-Host "  OK: pnpm v$pnpmVersion" -ForegroundColor Green

# 3. Check for C++ Build Tools (needed for better-sqlite3 native module)
Write-Host "[3/4] Checking C++ Build Tools..." -ForegroundColor Yellow
$hasBuildTools = $false
try {
    $vsWhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
    if (Test-Path $vsWhere) {
        $result = & $vsWhere -latest -requires Microsoft.VisualStudio.Workload.VCTools -property displayName 2>$null
        if ($result) { $hasBuildTools = $true }
    }
} catch {}

if (-not $hasBuildTools) {
    try {
        $msBuild = Get-Command msbuild -ErrorAction SilentlyContinue
        if ($msBuild) { $hasBuildTools = $true }
    } catch {}
}

if (-not $hasBuildTools) {
    Write-Host "  WARNING: Visual C++ Build Tools not detected." -ForegroundColor Yellow
    Write-Host "  The native module 'better-sqlite3' requires C++ build tools to compile." -ForegroundColor Yellow
    Write-Host "  Options:" -ForegroundColor Yellow
    Write-Host "    a) Install Visual Studio Build Tools:" -ForegroundColor White
    Write-Host "       https://visualstudio.microsoft.com/visual-cpp-build-tools/" -ForegroundColor White
    Write-Host "       Select 'Desktop development with C++' workload" -ForegroundColor White
    Write-Host "    b) Or run: npm install -g windows-build-tools" -ForegroundColor White
    Write-Host ""
    Write-Host "  Note: better-sqlite3 ships prebuilt binaries for common platforms." -ForegroundColor Yellow
    Write-Host "  If pnpm install succeeds without build tools, you can skip this step." -ForegroundColor Yellow
} else {
    Write-Host "  OK: C++ Build Tools detected" -ForegroundColor Green
}

# 4. Install dependencies
Write-Host "[4/4] Installing dependencies..." -ForegroundColor Yellow
Write-Host "  Running: pnpm install" -ForegroundColor White
pnpm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERROR: pnpm install failed." -ForegroundColor Red
    Write-Host "  If the error mentions 'better-sqlite3' or 'node-gyp':" -ForegroundColor Red
    Write-Host "  1. Install Visual C++ Build Tools (see step 3)" -ForegroundColor Red
    Write-Host "  2. Run: pnpm install again" -ForegroundColor Red
    exit 1
}
Write-Host "  OK: Dependencies installed" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Setup complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  Development:  pnpm --filter @insight/desktop dev" -ForegroundColor White
Write-Host "  Build:        pnpm --filter @insight/desktop build:win" -ForegroundColor White
Write-Host "  Portable:     pnpm --filter @insight/desktop build:portable" -ForegroundColor White
Write-Host ""

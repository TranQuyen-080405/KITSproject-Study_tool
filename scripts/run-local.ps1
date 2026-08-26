param([switch]$NoWait)

# KITS local - start all services hidden; logs in .run-logs\
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$LogDir = Join-Path $Root '.run-logs'
$PidFile = Join-Path $LogDir 'pids.txt'

if (-not (Test-Path (Join-Path $Root 'package.json'))) {
  Write-Host '[ERROR] Khong tim thay package.json'
  exit 1
}

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
if (Test-Path $PidFile) {
  Get-Content $PidFile | ForEach-Object {
    $parts = $_ -split ' ', 2
    if ($parts[0] -match '^\d+$') {
      cmd /c ('taskkill /PID ' + $parts[0] + ' /T /F >nul 2>&1')
    }
  }
}
Remove-Item -Force -ErrorAction SilentlyContinue $PidFile

Write-Host '============================================'
Write-Host ' KITS local (hidden)'
Write-Host (' ' + $Root)
Write-Host '============================================'
Write-Host ''

# Load .env into process env (skip blank / # comments)
$envFile = Join-Path $Root '.env'
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith('#')) { return }
    $i = $line.IndexOf('=')
    if ($i -lt 1) { return }
    $name = $line.Substring(0, $i).Trim()
    $value = $line.Substring($i + 1)
    Set-Item -Path ('Env:' + $name) -Value $value
  }
  Write-Host 'Loaded .env'
}

function Ensure-Env([string]$name, [string]$default) {
  $current = (Get-Item ('Env:' + $name) -ErrorAction SilentlyContinue).Value
  if (-not [string]::IsNullOrEmpty($current)) { return }
  Set-Item -Path ('Env:' + $name) -Value $default
}

Ensure-Env 'USER_SERVICE_URL' 'http://localhost:8001'
Ensure-Env 'CONTENT_SERVICE_URL' 'http://localhost:3001'
Ensure-Env 'ANALYTICS_SERVICE_URL' 'http://localhost:3003'
Ensure-Env 'AI_SERVICE_URL' 'http://localhost:3004'
Ensure-Env 'USER_DATABASE_URL' 'postgresql+psycopg://postgres:postgres@localhost:5432/user_service'
Ensure-Env 'CONTENT_DATABASE_URL' 'postgresql://postgres:postgres@localhost:5432/content_service'
Ensure-Env 'DATABASE_URL' 'postgresql+asyncpg://postgres:postgres@localhost:5432/ai_service'
Ensure-Env 'FRONTEND_URL' 'http://localhost:5173'
Ensure-Env 'FRONTEND_ORIGIN' 'http://localhost:5173,http://127.0.0.1:5173'
Ensure-Env 'USER_JWT_SECRET' 'local-development-secret-change-in-production'
if ([string]::IsNullOrEmpty($env:JWT_SECRET)) { $env:JWT_SECRET = $env:USER_JWT_SECRET }
Ensure-Env 'LLM_PROVIDER' 'openai'
Ensure-Env 'LLM_MODEL' 'qwen/qwen3.6-27b'
Ensure-Env 'LLM_BASE_URL' 'https://api.groq.com/openai/v1'

function Get-ServicePythonExe([string]$serviceDir) {
  $venvEnv = Join-Path $serviceDir 'venv.env'
  if (-not (Test-Path $venvEnv)) { return 'python' }
  foreach ($line in Get-Content $venvEnv) {
    $t = $line.Trim()
    if (-not $t -or $t.StartsWith('#') -or -not $t.Contains('=')) { continue }
    $parts = $t.Split('=', 2)
    if ($parts[0].Trim() -eq 'PYTHON_EXE') { return $parts[1].Trim() }
  }
  return 'python'
}

function Ensure-PythonVenv([string]$serviceDir, [string]$label) {
  $venvDir = Join-Path $serviceDir '.venv'
  $venvPy = Join-Path $venvDir 'Scripts\python.exe'
  $req = Join-Path $serviceDir 'requirements.txt'
  $pythonExe = Get-ServicePythonExe $serviceDir
  $minMinor = 0
  if (Test-Path (Join-Path $serviceDir 'venv.env')) { $minMinor = 11 }

  if (-not (Test-Path $req)) {
    Write-Host ('[ERROR] Khong tim thay requirements.txt: ' + $req)
    exit 1
  }

  $needCreate = -not (Test-Path $venvPy)
  if (-not $needCreate -and $minMinor -gt 0) {
    $minor = [int](& $venvPy -c 'import sys; print(sys.version_info.minor)')
    if ($minor -lt $minMinor) {
      Write-Host ('  [' + $label + '] .venv Python 3.' + $minor + ' - rebuild voi ' + $pythonExe + '...')
      Remove-Item -Recurse -Force $venvDir
      $needCreate = $true
    }
  }

  if ($needCreate) {
    Write-Host ('  [' + $label + '] Tao .venv (' + $pythonExe + ')...')
    cmd /c ($pythonExe + ' -m venv "' + $venvDir + '"')
    if ($LASTEXITCODE -ne 0) {
      Write-Host ('[ERROR] venv that bai - kiem tra PYTHON_EXE trong ' + (Join-Path $serviceDir 'venv.env'))
      exit 1
    }
    Write-Host ('  [' + $label + '] pip install -r requirements.txt...')
    & $venvPy -m pip install --upgrade pip *> $null
    & $venvPy -m pip install -r $req
    if ($LASTEXITCODE -ne 0) {
      Write-Host '[ERROR] pip install that bai - xem log tren'
      exit 1
    }
    Write-Host ('  [' + $label + '] .venv san sang')
    return
  }
  & $venvPy -m uvicorn --version *> $null
  if ($LASTEXITCODE -ne 0) {
    Write-Host ('  [' + $label + '] .venv co nhung thieu package - pip install...')
    & $venvPy -m pip install -r $req
    if ($LASTEXITCODE -ne 0) { exit 1 }
  }
}

function Ensure-ContentDb() {
  $contentDir = Join-Path $Root 'apps\content-service'
  Write-Host '  [content-service] prisma migrate deploy...'
  Push-Location $contentDir
  try {
    $env:CONTENT_DATABASE_URL = $env:CONTENT_DATABASE_URL
    cmd /c 'corepack pnpm db:deploy'
    if ($LASTEXITCODE -ne 0) {
      Write-Host '[ERROR] content db:deploy that bai'
      exit 1
    }
    Write-Host '  [content-service] seed sample lesson...'
    cmd /c 'corepack pnpm seed:test'
    if ($LASTEXITCODE -ne 0) {
      Write-Host '[ERROR] content seed that bai'
      exit 1
    }
  } finally {
    Pop-Location
  }
}

function Stop-ListenPort([int]$Port) {
  $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  foreach ($connection in $connections) {
    $processId = $connection.OwningProcess
    if ($processId -and $processId -ne 0) {
      cmd /c ("taskkill /PID " + $processId + " /T /F >nul 2>&1")
    }
  }
}

function Start-Hidden([string]$name, [string]$workdir, [string]$command) {
  $out = Join-Path $LogDir ($name + '.out.log')
  $err = Join-Path $LogDir ($name + '.err.log')
  Remove-Item -Force -ErrorAction SilentlyContinue $out, $err
  $arg = $command + ' > "' + $out + '" 2> "' + $err + '"'
  $p = Start-Process -FilePath 'cmd.exe' -WorkingDirectory $workdir -WindowStyle Hidden -PassThru -ArgumentList @('/d', '/c', $arg)
  Add-Content -Path $PidFile -Value ($p.Id.ToString() + ' ' + $name)
  Write-Host ('  started ' + $name + ' pid=' + $p.Id)
}

function Stop-StartedServices() {
  if (-not (Test-Path $PidFile)) { return }
  Get-Content $PidFile | ForEach-Object {
    $parts = $_ -split ' ', 2
    cmd /c ('taskkill /PID ' + $parts[0] + ' /T /F >nul 2>&1')
  }
}

function Wait-Health([string]$name, [string]$url, [int]$attempts = 30) {
  for ($i = 0; $i -lt $attempts; $i++) {
    try {
      $response = Invoke-WebRequest -UseBasicParsing $url -TimeoutSec 2
      if ($response.StatusCode -eq 200) {
        Write-Host ('      OK ' + $name)
        return $true
      }
    } catch {}
    Start-Sleep -Milliseconds 500
  }

  Write-Host ('[ERROR] ' + $name + ' khong san sang: ' + $url)
  $err = Join-Path $LogDir ($name + '.err.log')
  if (Test-Path $err) {
    Get-Content $err | Select-Object -Last 20
  }
  return $false
}

$userDir = Join-Path $Root 'apps\user-service'
$aiDir = Join-Path $Root 'apps\ai-service'
$gatewayDir = Join-Path $Root 'apps\api-gateway'
$contentDir = Join-Path $Root 'apps\content-service'
$analyticsDir = Join-Path $Root 'apps\analytics-service'

Write-Host '[1/5] Python venv (tu tao + pip install lan dau)...'
Ensure-PythonVenv $userDir 'user-service'
Ensure-PythonVenv $aiDir 'ai-service'

Write-Host '[2/5] Content DB (migrate + seed)...'
Ensure-ContentDb

Write-Host '[3/5] Start services (hidden, no Docker)...'
Write-Host '      Postgres local: localhost:5432 (user_service / content_service / ai_service)'
Write-Host '      Giai phong port cu (5173, 3000, 3001, 3003, 8001, 3004)...'
foreach ($port in @(5173, 3000, 3001, 3003, 8001, 3004)) {
  Stop-ListenPort $port
}

Start-Hidden 'web' $Root 'corepack pnpm run:web'

$env:PORT = '3000'
Start-Hidden 'gateway' $gatewayDir 'corepack pnpm exec tsx src/index.ts'

$env:PORT = '3001'
Start-Hidden 'content' $contentDir 'corepack pnpm start'

$env:PORT = '3003'
Start-Hidden 'analytics' $analyticsDir 'corepack pnpm start'

$env:SECURE_COOKIES = 'false'
$env:SMTP_HOST = 'localhost'
$env:SMTP_PORT = '1025'
$env:SMTP_USE_TLS = 'false'
$env:SMTP_FROM = 'kits@local.test'
$env:PYTHONPATH = '.'
Start-Hidden 'user' $userDir '.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8001'

Start-Hidden 'ai' $aiDir '.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 3004'

Write-Host '[4/5] Health check + seed test/test1234...'
$healthChecks = @(
  @('web', 'http://127.0.0.1:5173'),
  @('gateway', 'http://127.0.0.1:3000/health'),
  @('content', 'http://127.0.0.1:3001/health'),
  @('analytics', 'http://127.0.0.1:3003/health'),
  @('user', 'http://127.0.0.1:8001/health'),
  @('ai', 'http://127.0.0.1:3004/health')
)
$allHealthy = $true
foreach ($check in $healthChecks) {
  if (-not (Wait-Health $check[0] $check[1])) { $allHealthy = $false }
}
if (-not $allHealthy) {
  Write-Host '[ERROR] Mot hoac nhieu service khoi dong that bai. Da dung cac service vua start.'
  Stop-StartedServices
  exit 1
}

try {
  $contentCheck = Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:3000/api/v1/content/lessons' -TimeoutSec 5
  if ($contentCheck.StatusCode -ne 200) { throw 'Content API khong tra 200' }
  Write-Host '      OK gateway -> content -> PostgreSQL'
} catch {
  Write-Host ('[ERROR] Gateway/Content/DB check that bai: ' + $_.Exception.Message)
  Stop-StartedServices
  exit 1
}

$seedLog = Join-Path $LogDir 'seed-user.log'
$env:PYTHONPATH = $userDir
$py = Join-Path $userDir '.venv\Scripts\python.exe'
Push-Location $userDir
try {
  & $py 'scripts\seed_test_user.py' *> $seedLog
  $seedExit = $LASTEXITCODE
} finally {
  Pop-Location
}
if ($seedExit -ne 0) {
  Write-Host ('[ERROR] Seed user that bai - xem ' + $seedLog)
  Get-Content $seedLog
  Stop-StartedServices
  exit 1
} else {
  Write-Host '      Seed OK: username=test password=test1234'
  Get-Content $seedLog
}

Write-Host '[5/5] Done.'
Write-Host ''
Write-Host '  Web:  http://localhost:5173'
Write-Host '  Login: test / test1234'
Write-Host ('  Logs: ' + $LogDir + '\')
Write-Host ''
if ($NoWait) {
  Write-Host 'NoWait: services tiep tuc chay nen script ket thuc.'
  exit 0
}
Write-Host 'Nhan phim bat ky de STOP tat ca service...'
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')

Write-Host 'Stopping...'
if (Test-Path $PidFile) {
  Get-Content $PidFile | ForEach-Object {
    $parts = $_ -split ' ', 2
    cmd /c ('taskkill /PID ' + $parts[0] + ' /T /F >nul 2>&1')
    Write-Host ('  stopped ' + $parts[1] + ' pid=' + $parts[0])
  }
}
Write-Host 'Stopped.'

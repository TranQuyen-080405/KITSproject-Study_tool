param(
    [ValidateSet('check', 'backend', 'android', 'start', 'web', 'stop')]
    [string]$Mode = 'check'
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot

# Configure this process only; do not change Windows-wide settings.
if (-not $env:ANDROID_HOME -and (Test-Path "$env:LOCALAPPDATA/Android/Sdk")) {
    $env:ANDROID_HOME = "$env:LOCALAPPDATA/Android/Sdk"
}
if ($env:ANDROID_HOME) {
    $env:Path = "$env:ANDROID_HOME/platform-tools;$env:ANDROID_HOME/emulator;$env:Path"
}
function Need-Command([string]$Command, [string]$HelpText) {
    if (-not (Get-Command $Command -ErrorAction SilentlyContinue)) { throw "$Command is missing. $HelpText" }
}

switch ($Mode) {
    'check' {
        Write-Host 'Haru Android setup check' -ForegroundColor Cyan
        foreach ($name in @('node', 'corepack', 'docker', 'java', 'adb', 'emulator')) {
            $found = Get-Command $name -ErrorAction SilentlyContinue
            if ($found) { Write-Host "[OK] $name : $($found.Source)" -ForegroundColor Green }
            else { Write-Host "[MISSING] $name" -ForegroundColor Yellow }
        }
        if (Get-Command java -ErrorAction SilentlyContinue) {
            $javaVersion = & java --version 2>$null | Select-Object -First 1
            if ($javaVersion -notmatch '^(?:openjdk|java)\s+17(?:\.|\s|$)') {
                Write-Host "[CHECK] Found $javaVersion. Use JDK 17 for the Android build." -ForegroundColor Yellow
            }
        }
        if ($env:ANDROID_HOME) { Write-Host "Android SDK: $env:ANDROID_HOME" }
        else { Write-Host 'Install Android Studio and its SDK. See apps/mobile/README.md.' }
        Write-Host 'Use JDK 17. Start Docker Desktop and an Android virtual device before building.'
        Write-Host 'Next: corepack pnpm mobile:backend, then corepack pnpm mobile:android'
    }
    'backend' {
        Need-Command 'docker' 'Install and start Docker Desktop with Linux containers.'
        & docker compose -f docker-compose.mobile.yml up -d --build
        if ($LASTEXITCODE -ne 0) { throw 'The mobile backend did not start. Check Docker Desktop and the output above.' }
        & docker compose -f docker-compose.mobile.yml ps
        Write-Host 'API: http://localhost:3000/health | Test email inbox: http://localhost:8025'
    }
    'stop' {
        Need-Command 'docker' 'Install Docker Desktop.'
        & docker compose -f docker-compose.mobile.yml down
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
        Write-Host 'Mobile backend stopped. Database volumes are preserved.'
    }
    'android' {
        Need-Command 'corepack' 'Install Node.js 22 LTS and enable Corepack.'
        Need-Command 'java' 'Install JDK 17 and configure JAVA_HOME.'
        Need-Command 'adb' 'Install Android Studio, SDK Platform-Tools, and set ANDROID_HOME.'
        & corepack pnpm --filter '@korean-learning/mobile' android
        exit $LASTEXITCODE
    }
    'start' {
        & corepack pnpm --filter '@korean-learning/mobile' start --dev-client
        exit $LASTEXITCODE
    }
    'web' {
        # Browser runs on the laptop, so it uses localhost rather than 10.0.2.2.
        $env:EXPO_PUBLIC_API_URL = 'http://localhost:3000'
        & corepack pnpm --filter '@korean-learning/mobile' web --port 8081
        exit $LASTEXITCODE
    }
}

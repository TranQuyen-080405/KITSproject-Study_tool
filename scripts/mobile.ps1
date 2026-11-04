param(
    [ValidateSet('check', 'backend', 'sync', 'android', 'dev', 'open', 'stop')]
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
function Resolve-Jdk21 {
    $javaExe = if ($env:JAVA_HOME) { Join-Path $env:JAVA_HOME 'bin\java.exe' } else { $null }
    if ($javaExe -and (Test-Path -LiteralPath $javaExe)) { return }
    $roots = @(
        'C:\Program Files\Eclipse Adoptium',
        'C:\Program Files\Java',
        'C:\Program Files\Microsoft',
        'C:\Program Files\Android\Android Studio\jbr'
    )
    foreach ($root in $roots) {
        if (-not (Test-Path -LiteralPath $root)) { continue }
        $hit = Get-ChildItem -LiteralPath $root -Recurse -Filter 'java.exe' -ErrorAction SilentlyContinue |
            Where-Object { $_.FullName -match '\\bin\\java\.exe$' -and $_.FullName -match 'jdk-?21|jbr' } |
            Select-Object -First 1
        if ($hit) {
            $env:JAVA_HOME = Split-Path -Parent (Split-Path -Parent $hit.FullName)
            return
        }
    }
    throw "JDK 21 was not found. JAVA_HOME is '$env:JAVA_HOME', and that folder is missing. Install Temurin 21 and point JAVA_HOME at its jdk-21 folder."
}
function Need-Command([string]$Command, [string]$HelpText) {
    if (-not (Get-Command $Command -ErrorAction SilentlyContinue)) { throw "$Command is missing. $HelpText" }
}
function Sync-Capacitor([switch]$LiveReload) {
    $env:VITE_API_URL = if ($env:VITE_API_URL) { $env:VITE_API_URL } else { 'https://kitsproject-study-tool.onrender.com' }
    $env:MOBILE_ALLOW_CLEARTEXT = 'true'
    if ($LiveReload) {
        $env:CAP_SERVER_URL = if ($env:CAP_SERVER_URL) { $env:CAP_SERVER_URL } else { 'http://10.0.2.2:5173' }
        & corepack pnpm --filter '@korean-learning/web' build
        if ($LASTEXITCODE -ne 0) { throw 'Web build failed.' }
        & corepack pnpm --filter '@korean-learning/mobile' exec cap sync android
    } else {
        Remove-Item Env:CAP_SERVER_URL -ErrorAction SilentlyContinue
        & corepack pnpm --filter '@korean-learning/mobile' sync
    }
    if ($LASTEXITCODE -ne 0) { throw 'Capacitor sync failed.' }
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
            if ($javaVersion -notmatch '^(?:openjdk|java)\s+21(?:\.|\s|$)') {
                Write-Host "[CHECK] Found $javaVersion. Use JDK 21 for the Android build." -ForegroundColor Yellow
            }
        }
        if ($env:ANDROID_HOME) { Write-Host "Android SDK: $env:ANDROID_HOME" }
        else { Write-Host 'Install Android Studio and its SDK. See apps/mobile/README.md.' }
        Write-Host 'Use JDK 21. Start Docker Desktop and an Android virtual device before building.'
        Write-Host 'Next: corepack pnpm mobile:backend, then corepack pnpm mobile:android'
    }
    'backend' {
        Need-Command 'docker' 'Install and start Docker Desktop with Linux containers.'
        & docker compose up -d --build
        if ($LASTEXITCODE -ne 0) { throw 'The mobile backend did not start. Check Docker Desktop and the output above.' }
        & docker compose ps
        Write-Host 'Full API: http://localhost:3000/health | Test email inbox: http://localhost:8025'
    }
    'stop' {
        Need-Command 'docker' 'Install Docker Desktop.'
        & docker compose down
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
        Write-Host 'Mobile backend stopped. Database volumes are preserved.'
    }
    'sync' {
        Need-Command 'corepack' 'Install Node.js 22 LTS and enable Corepack.'
        Sync-Capacitor
    }
    'android' {
        Need-Command 'corepack' 'Install Node.js 22 LTS and enable Corepack.'
        Need-Command 'adb' 'Install Android Studio, SDK Platform-Tools, and set ANDROID_HOME.'
        Resolve-Jdk21
        Sync-Capacitor
        $androidDir = Join-Path $projectRoot 'apps\mobile\android'
        Push-Location $androidDir
        try {
            & .\gradlew.bat assembleDebug
            if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
        } finally {
            Pop-Location
        }
        $apk = Join-Path $androidDir 'app\build\outputs\apk\debug\app-debug.apk'
        Write-Host "APK: $apk"
        $connected = & adb devices | Select-String -Pattern "`tdevice$"
        if ($connected) {
            & adb install -r $apk
            exit $LASTEXITCODE
        }
        Write-Host 'No phone or emulator is connected. Copy the APK onto the phone and install it.'
    }
    'dev' {
        Need-Command 'corepack' 'Install Node.js 22 LTS and enable Corepack.'
        Need-Command 'adb' 'Start an Android emulator before live reload.'
        Sync-Capacitor -LiveReload
        Write-Host 'Capacitor will load Vite from 10.0.2.2:5173. API calls go to the Render gateway.'
        & corepack pnpm --filter '@korean-learning/mobile' exec cap run android
        exit $LASTEXITCODE
    }
    'open' {
        & corepack pnpm --filter '@korean-learning/mobile' open:android
        exit $LASTEXITCODE
    }
}

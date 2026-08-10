# Starts Content Service, API Gateway, and Web together for local development.
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Set-Location (Join-Path $PSScriptRoot "..")
corepack pnpm run run:all

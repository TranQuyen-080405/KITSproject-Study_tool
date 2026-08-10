@echo off
REM Starts Content Service, API Gateway, and Web together for local development.
cd /d "%~dp0.."
corepack pnpm run run:all

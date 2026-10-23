@echo off
echo Starting The Fashion Store (local)...
start "API" /min cmd /c "cd /d "%~dp0client" && npm run dev:api"
timeout /t 3 /nobreak >nul
start "Client" /min cmd /c "cd /d "%~dp0client" && npm run dev"
timeout /t 5 /nobreak >nul
start http://localhost:3000

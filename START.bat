@echo off
echo Starting Clothing Store Manager...

echo Starting API server...
start "API Server" /min cmd /c "cd /d "%~dp0server" && node index.js"

timeout /t 3 /nobreak >nul

echo Starting client...
start "Client" /min cmd /c "cd /d "%~dp0client" && node_modules\.bin\vite.cmd"

timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo  Clothing Store Manager is running!
echo  Open: http://localhost:3000
echo ========================================
start http://localhost:3000

@echo off
REM Restarts ONLY the backend server (applies any new database migrations).
REM Website and mobile (Expo) servers keep running untouched.
echo Stopping the backend (port 4000)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :4000 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1

start "MagariHub Backend" cmd /k "cd /d %~dp0backend && npm install --no-audit --no-fund && npx prisma migrate dev --name auto_update --skip-seed && npm run dev"

echo Backend restarting in a new window. This window can be closed.
timeout /t 4 >nul

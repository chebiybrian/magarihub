@echo off
REM Restarts backend + website WITHOUT touching the database.
REM Use this after code changes that add new packages (keeps your accounts and posts).
echo Stopping running servers...
taskkill /f /im node.exe >nul 2>&1

echo Starting backend (installs any new packages first)...
start "MagariHub Backend" cmd /k "cd /d %~dp0backend && npm install --no-audit --no-fund && npx prisma db push && npm run dev"

timeout /t 8 /nobreak >nul

echo Starting website...
start "MagariHub Website" cmd /k "cd /d %~dp0web && npm install --no-audit --no-fund && npm run dev"

echo Done - two new windows opened. This one can be closed.
pause

@echo off
REM One-click website start. Run AFTER the backend is running.
cd /d "%~dp0"
echo Installing packages (first run only)...
if not exist node_modules call npm install --no-audit --no-fund
echo Starting website at http://localhost:5173 ...
call npm run dev
pause

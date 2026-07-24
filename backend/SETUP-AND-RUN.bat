@echo off
REM One-click FIRST-TIME backend setup: installs packages, creates the database,
REM loads Kenya sample data, and starts the API server.
REM !! WARNING: this RESETS the database (wipes accounts/posts, reloads sample data).
REM !! For normal restarts use RESTART-SERVERS.bat in the main folder instead.
cd /d "%~dp0"
echo ============================================
echo  MagariHub backend setup
echo  Folder: %CD%
echo ============================================

if not exist .env copy .env.example .env

echo.
echo [1/4] Installing packages (first run takes a few minutes)...
call npm install --no-audit --no-fund || goto :error

echo.
echo [2/4] Creating the database...
call npx prisma migrate dev --name init || goto :error

echo.
echo [3/4] Loading Kenya sample data...
call npm run db:seed || goto :error

echo.
echo [4/4] Starting the API server at http://localhost:4000
echo      (Keep this window open. Press Ctrl+C to stop.)
call npm run dev
goto :end

:error
echo.
echo *** Something failed above. Take a photo/screenshot of this window
echo *** and paste the error to Claude.
pause

:end
pause

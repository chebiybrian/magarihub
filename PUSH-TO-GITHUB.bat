@echo off
REM Pushes MagariHub to your GitHub repo so Render can deploy it.
REM On the first push a browser window opens to sign in to GitHub - that's normal.
cd /d "%~dp0"

set "GIT=git"
where git >nul 2>&1
if errorlevel 1 (
  echo Git is not installed. Installing Git for Windows...
  winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements
  set "GIT=C:\Program Files\Git\bin\git.exe"
)

echo.
echo Preparing repository...
"%GIT%" init
"%GIT%" add -A
"%GIT%" -c user.email="chebiybrian@gmail.com" -c user.name="Brian K Chebiy" commit -m "MagariHub - initial deploy"
"%GIT%" branch -M main
"%GIT%" remote remove origin 2>nul

REM ===== The repo URL gets filled in here automatically =====
"%GIT%" remote add origin https://github.com/chebiybrian/magarihub.git

echo.
echo Pushing to GitHub (sign in via the browser window if it appears)...
"%GIT%" push -u origin main

echo.
echo Done. If you see no errors above, your code is on GitHub.
pause

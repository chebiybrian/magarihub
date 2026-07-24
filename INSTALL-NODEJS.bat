@echo off
REM Installs Node.js LTS from the official source using Windows' built-in winget.
echo Installing Node.js LTS (official nodejs.org build via winget)...
echo A Windows permission popup may appear - click Yes.
echo.
winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
echo.
echo Done. Close this window, then run backend\SETUP-AND-RUN.bat
pause

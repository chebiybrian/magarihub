@echo off
REM One-click mobile app start (needs the backend running).
REM BEFORE FIRST RUN: edit src\api\client.js and set API_URL to your PC's IP
REM (run `ipconfig` to find it, e.g. http://192.168.1.23:4000)
cd /d "%~dp0"
call npm install --no-audit --no-fund
echo Starting Expo... scan the QR code with the Expo Go app on your phone.
call npx expo start
pause

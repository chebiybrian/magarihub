@echo off
REM Deploys the website to Vercel (free hosting).
REM Step 1 sends a verification email to your Gmail - CLICK THE LINK in that email.
REM Step 2 uploads and deploys the site, then prints your live URL.
cd /d "%~dp0web"

echo ============================================
echo  MagariHub - Deploy website to Vercel
echo ============================================
echo.
echo [1/2] Logging in to Vercel as chebiybrian@gmail.com
echo       CHECK YOUR GMAIL and click the verification link...
call npx --yes vercel@latest login chebiybrian@gmail.com

echo.
echo [2/2] Deploying to production...
call npx --yes vercel@latest --prod --yes

echo.
echo Done! The URL above is your live site.
pause

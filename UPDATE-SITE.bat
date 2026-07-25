@echo off
REM Pushes your latest changes to GitHub. Vercel then auto-builds and deploys them.
REM Double-click this whenever you want your changes to go live.
cd /d "%~dp0"

set "GIT=git"
where git >nul 2>&1 || set "GIT=C:\Program Files\Git\bin\git.exe"

echo Staging changes...
"%GIT%" add -A

echo Committing...
"%GIT%" -c user.email="chebiybrian@gmail.com" -c user.name="Brian K Chebiy" commit -m "Update site %DATE% %TIME%"

echo Pushing to GitHub...
"%GIT%" push

echo.
echo Done. Vercel will auto-deploy in a few seconds.
echo Watch it at: https://vercel.com/chebiybrian-2648s-projects/magarihub/deployments
pause

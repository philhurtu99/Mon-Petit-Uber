@echo off
setlocal enabledelayedexpansion

echo ==============================
echo Backend - installation
echo ==============================

cd backend || (echo Impossible d'acceder au dossier backend & pause & exit /b 1)
call npm install

cd ..

echo ==============================
echo Prisma - generation du client
echo ==============================

cd backend
call npx prisma generate
IF %ERRORLEVEL% NEQ 0 (
    echo Erreur prisma generate
    pause
    exit /b 1
)

echo ==============================
echo Prisma - migration
echo ==============================

call npx prisma migrate dev --name "initial"
IF %ERRORLEVEL% NEQ 0 (
    echo Erreur migration Prisma
    pause
    exit /b 1
)

echo ==============================
echo Prisma - seed
echo ==============================

call npx prisma db seed
IF %ERRORLEVEL% NEQ 0 (
    echo Erreur seed Prisma
    pause
    exit /b 1
)
cd ..

echo ==============================
echo Frontend - installation
echo ==============================

cd frontend || (echo Impossible d'acceder au dossier frontend & pause & exit /b 1)
call npm install

cd ..

echo ==============================
echo Setup termine avec succes !
echo ==============================
echo Appuyez sur une touche pour quitter...
pause >nul

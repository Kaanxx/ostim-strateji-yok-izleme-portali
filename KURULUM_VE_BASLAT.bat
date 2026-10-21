@echo off
chcp 65001 >nul
title OSTİM Teknik Üniversitesi — Strateji ve YÖK İzleme Portalı

echo ========================================================================
echo  🏛️  OSTİM TEKNİK ÜNİVERSİTESİ — STRATEJİ VE YÖK İZLEME PORTALI
echo  🚀  Tek Tıkla Kurulum ve Başlatma Aracı (Windows)
echo ========================================================================
echo.

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [HATA] Bilgisayarınızda Node.js kurulu değil veya PATH içerisinde bulunamadı!
    echo Lütfen https://nodejs.org adresinden Node.js LTS sürümünü indirip kurun.
    echo.
    pause
    exit /b 1
)

for /f "delims=" %%v in ('node -v') do set NODE_VER=%%v
echo [BİLGİ] Node.js Sürümü: %NODE_VER%
echo [BİLGİ] Sistem başlatılıyor, lütfen bekleyin...
echo.

cd /d "%~dp0"
node start-all.js

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [HATA] Sistem çalışırken bir hata oluştu (Hata Kodu: %ERRORLEVEL%).
    pause
    exit /b %ERRORLEVEL%
)

pause

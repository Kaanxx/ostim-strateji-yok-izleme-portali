@echo off
chcp 65001 >nul
title OSTİM Teknik Üniversitesi — Docker Compose Başlatıcı

echo ========================================================================
echo  🏛️  OSTİM TEKNİK ÜNİVERSİTESİ — STRATEJİ VE YÖK İZLEME PORTALI
echo  🐳  Docker Compose ile Tek Tıkla Başlatma Aracı
echo ========================================================================
echo.

where docker >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [HATA] Docker bulunamadı! Lütfen Docker Desktop uygulamasının kurulu ve açık olduğundan emin olun.
    echo Docker kullanmadan doğrudan çalıştırmak için KURULUM_VE_BASLAT.bat dosyasını çalıştırabilirsiniz.
    echo.
    pause
    exit /b 1
)

cd /d "%~dp0"
echo [1/3] Docker konteynerleri (mongodb, backend, frontend) derleniyor ve başlatılıyor...
docker compose up -d --build
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [HATA] Docker Compose başlatılamadı. Docker Desktop'ın çalışır durumda olduğunu kontrol edin.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/3] Servislerin hazır olması bekleniyor (5 saniye)...
timeout /t 5 /nobreak >nul

echo.
echo [3/3] Konteyner Durumu:
docker compose ps

echo.
echo ========================================================================
echo  🎉 SİSTEM DOCKER ÜZERİNDE AKTİF!
echo  🌐 Web Arayüzü : http://localhost:3000
echo  ⚙️  Backend API : http://localhost:5000
echo ========================================================================
echo.

start "" "http://localhost:3000"
pause

#!/usr/bin/env node
/**
 * OSTİM Teknik Üniversitesi — Strateji ve YÖK İzleme Portalı
 * Tek Komutla Anahtar Teslim Başlatıcı (Turnkey Launcher)
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT_DIR = __dirname;
const BACKEND_DIR = path.join(ROOT_DIR, 'backend');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');
const BACKEND_NODE_MODULES = path.join(BACKEND_DIR, 'node_modules');
const FRONTEND_BUILD_INDEX = path.join(FRONTEND_DIR, 'build', 'index.html');

const BACKEND_PORT = process.env.BACKEND_PORT || 5000;
const FRONTEND_PORT = process.env.PORT || 3000;

const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

console.log('========================================================================');
console.log(' 🏛️  OSTİM TEKNİK ÜNİVERSİTESİ — STRATEJİ VE YÖK İZLEME PORTALI');
console.log(' 🚀  Anahtar Teslim Sistem Başlatıcı (Turnkey Launcher)');
console.log('========================================================================\n');

function ensureDependenciesAndBuild() {
  if (!fs.existsSync(BACKEND_NODE_MODULES)) {
    console.log('📦 [1/2] Backend bağımlılıkları bulunamadı, otomatik kuruluyor (backend/npm install)...');
    execSync(`${npmCmd} install`, { cwd: BACKEND_DIR, stdio: 'inherit' });
    console.log('✅ Backend bağımlılıkları başarıyla kuruldu.\n');
  } else {
    console.log('✅ [1/2] Backend bağımlılıkları hazır.');
  }

  if (!fs.existsSync(FRONTEND_BUILD_INDEX)) {
    console.log('🏗️  [2/2] Frontend derlemesi (frontend/build) bulunamadı, kuruluyor ve derleniyor...');
    execSync(`${npmCmd} install`, { cwd: FRONTEND_DIR, stdio: 'inherit' });
    execSync(`${npmCmd} run build`, { cwd: FRONTEND_DIR, stdio: 'inherit' });
    console.log('✅ Frontend üretim derlemesi (production build) hazır.\n');
  } else {
    console.log('✅ [2/2] Hazır Frontend üretim derlemesi (frontend/build) bulundu.\n');
  }
}

function prefixStream(stream, prefix, target) {
  let buffer = '';
  stream.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop();
    for (const line of lines) {
      if (line.trim().length > 0) {
        target.write(`${prefix} ${line}\n`);
      }
    }
  });
  stream.on('end', () => {
    if (buffer.trim().length > 0) {
      target.write(`${prefix} ${buffer}\n`);
    }
  });
}

function checkBackendHealth() {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${BACKEND_PORT}/health`, (res) => {
      resolve(res.statusCode === 200);
      res.resume();
    });
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function openBrowser(url) {
  try {
    if (process.platform === 'win32') {
      spawn('cmd.exe', ['/c', 'start', '""', url], { detached: true, stdio: 'ignore' }).unref();
    } else if (process.platform === 'darwin') {
      spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
    } else {
      spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
    }
  } catch (err) {
    // Ignore browser launch errors on headless environments
  }
}

function printWelcomeBanner() {
  console.log('\n========================================================================');
  console.log(' 🎉 SİSTEM AKTİF VE KULLANIMA HAZIR!');
  console.log('========================================================================');
  console.log(` 🌐 Web Arayüzü (Frontend) : http://localhost:${FRONTEND_PORT}`);
  console.log(` ⚙️  REST API (Backend)     : http://localhost:${BACKEND_PORT}`);
  console.log(` 🩺 Sistem Sağlık Kontrolü : http://localhost:${BACKEND_PORT}/health`);
  console.log('------------------------------------------------------------------------');
  console.log(' 🔐 HAZIR DEMO KULLANICI HESAPLARI (Giriş Bilgileri):');
  console.log('------------------------------------------------------------------------');
  console.log(' 1. Sistem Yöneticisi (ADMIN - Tüm Birimler ve Tablo/Kullanıcı Yönetimi)');
  console.log('    • E-posta : admin@ostimteknik.edu.tr');
  console.log('    • Şifre   : Admin123!');
  console.log('');
  console.log(' 2. Mühendislik Fakültesi Dekanı (REVIEWER - Fakülte ve Alt Bölümler Onay)');
  console.log('    • E-posta : dekan.muhendislik@ostimteknik.edu.tr');
  console.log('    • Şifre   : Dekan123!');
  console.log('');
  console.log(' 3. Bilgisayar Mühendisliği Sorumlusu (DEPT_USER - Kendi Bölümü)');
  console.log('    • E-posta : ceng@ostimteknik.edu.tr');
  console.log('    • Şifre   : Ceng123!');
  console.log('');
  console.log(' 4. Yazılım Mühendisliği Sorumlusu (DEPT_USER - Kendi Bölümü)');
  console.log('    • E-posta : seng@ostimteknik.edu.tr');
  console.log('    • Şifre   : Seng123!');
  console.log('');
  console.log(' 5. Mühendislik Koordinatörü (DEPT_USER - Çapraz Yetkili: CENG + SENG)');
  console.log('    • E-posta : muhendislik.koordinator@ostimteknik.edu.tr');
  console.log('    • Şifre   : Koord123!');
  console.log('');
  console.log(' 6. Strateji Geliştirme Daire Başkanlığı (REVIEWER - Üniversite Geneli İzleme)');
  console.log('    • E-posta : strateji@ostimteknik.edu.tr');
  console.log('    • Şifre   : Strateji123!');
  console.log('========================================================================');
  console.log(' 💡 Durdurmak için bu pencerede Ctrl + C tuşlarına basabilirsiniz.');
  console.log('========================================================================\n');
}

async function main() {
  try {
    ensureDependenciesAndBuild();
  } catch (err) {
    console.error('❌ Kurulum sırasında hata oluştu:', err.message);
    process.exit(1);
  }

  console.log('🚀 Backend (Port 5000) ve Frontend (Port 3000) sunucuları başlatılıyor...\n');

  const backendProc = spawn(process.execPath, ['index.js'], {
    cwd: BACKEND_DIR,
    env: { ...process.env, PORT: String(BACKEND_PORT) },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const frontendProc = spawn(process.execPath, ['server.js'], {
    cwd: FRONTEND_DIR,
    env: {
      ...process.env,
      PORT: String(FRONTEND_PORT),
      BACKEND_HOST: '127.0.0.1',
      BACKEND_PORT: String(BACKEND_PORT)
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  prefixStream(backendProc.stdout, '[BACKEND ]', process.stdout);
  prefixStream(backendProc.stderr, '[BACKEND ]', process.stderr);
  prefixStream(frontendProc.stdout, '[FRONTEND]', process.stdout);
  prefixStream(frontendProc.stderr, '[FRONTEND]', process.stderr);

  let shuttingDown = false;
  function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n🛑 Sistem kapatılıyor (${signal})...`);
    try {
      backendProc.kill('SIGTERM');
    } catch (_) {}
    try {
      frontendProc.kill('SIGTERM');
    } catch (_) {}
    setTimeout(() => process.exit(0), 1000);
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  backendProc.on('exit', (code) => {
    if (!shuttingDown && code !== 0) {
      console.error(`❌ Backend sunucusu beklenmedik şekilde kapandı (Kod: ${code}).`);
      shutdown('BACKEND_EXIT');
    }
  });

  frontendProc.on('exit', (code) => {
    if (!shuttingDown && code !== 0) {
      console.error(`❌ Frontend sunucusu beklenmedik şekilde kapandı (Kod: ${code}).`);
      shutdown('FRONTEND_EXIT');
    }
  });

  // Poll http://localhost:5000/health until healthy (up to 90 seconds for first-time seed/embedded DB startup)
  const maxAttempts = 90;
  for (let i = 0; i < maxAttempts; i++) {
    const healthy = await checkBackendHealth();
    if (healthy) {
      printWelcomeBanner();
      openBrowser(`http://localhost:${FRONTEND_PORT}`);
      return;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.warn('⚠️  Backend sağlık kontrolü zaman aşımına uğradı, ancak sunucular çalışmaya devam ediyor.');
  printWelcomeBanner();
}

main();

#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "❌ [HATA] Node.js bulunamadı! Lütfen https://nodejs.org adresinden Node.js LTS sürümünü kurun."
  exit 1
fi

echo "🏛️  OSTİM Teknik Üniversitesi — Strateji ve YÖK İzleme Portalı başlatılıyor..."
node start-all.js

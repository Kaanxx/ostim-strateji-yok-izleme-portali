import React, { useState, useMemo } from 'react';
import {
  Save,
  AlertTriangle,
  CheckCircle2,
  Info,
  Zap,
  DollarSign,
  Flame,
  Recycle,
  HelpCircle,
  Cpu,
  Search,
  RefreshCw,
  FileText
} from 'lucide-react';
import {
  calculateEnerjiClient,
  calculateFinansClient,
  calculateKarbonClient,
  calculateAtikClient,
  calculateSoruSetiClient,
  FINANS_GREY_EXCLUDED_ROWS,
  SORU_SETI_BOUNDS,
  formatTurkishNumber,
  safeNumber
} from '../utils/formulaEngine';

export default function FixedMatrixView({
  template,
  rows,
  onChangeRows,
  onSaveAll,
  isSaving,
  isReadOnly,
  onServerCalculate
}) {
  const [soruSetiTab, setSoruSetiTab] = useState('sorular'); // 'sorular' | 'aciklama'
  const [dijitalDimFilter, setDijitalDimFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [cellErrors, setCellErrors] = useState({});

  const code = template?.code || '';

  // Live reactive client calculations
  const calcState = useMemo(() => {
    if (code === 'ENERJI') return calculateEnerjiClient(rows);
    if (code === 'FINANS') return calculateFinansClient(rows);
    if (code === 'KARBON_AYAKIZI') return calculateKarbonClient(rows);
    if (code === 'ATIK') return calculateAtikClient(rows);
    if (code === 'SORU_SETI') return calculateSoruSetiClient(rows);
    return { rows, totals: {}, warnings: [] };
  }, [code, rows]);

  const displayRows = calcState.rows || rows;
  const totals = calcState.totals || {};

  const handleCellChange = (rowNumber, fieldKey, rawValue, colDef = {}) => {
    if (isReadOnly) return;

    const errKey = `${rowNumber}_${fieldKey}`;
    let newErr = null;

    // Validate Finans negative value rule (Only row 32 Mali Yıl Sonu Kasası allows negative)
    if (code === 'FINANS' && fieldKey === 'tutar' && rawValue !== '' && rawValue !== '-') {
      const num = Number(rawValue);
      if (!isNaN(num) && num < 0 && rowNumber !== 32 && rowNumber !== 34) {
        newErr = 'Yalnızca Satır 32 (Mali Yıl Sonu Kasası) negatif değer alabilir.';
      }
    }

    // Validate SoruSeti per-row bounds
    if (code === 'SORU_SETI' && fieldKey === 'cevap' && rawValue !== '') {
      const bounds = SORU_SETI_BOUNDS[rowNumber - 1] || { min: 0, max: 1000000000 };
      const num = Number(rawValue);
      if (isNaN(num) || !Number.isInteger(num) || num < bounds.min || num > bounds.max) {
        newErr = `Değer ${bounds.min} ile ${bounds.max.toLocaleString('tr-TR')} arasında tam sayı olmalıdır.`;
      }
    }

    // Validate generic min/max bounds
    if (!newErr && (colDef.type === 'integer' || colDef.type === 'decimal') && rawValue !== '' && rawValue !== '-') {
      const num = Number(rawValue);
      if (!isNaN(num)) {
        if (colDef.min !== undefined && num < colDef.min && !(code === 'FINANS' && rowNumber === 32)) {
          newErr = `En az ${colDef.min} olmalıdır.`;
        }
        if (colDef.max !== undefined && num > colDef.max) {
          newErr = `En fazla ${colDef.max} olabilir.`;
        }
      }
    }

    setCellErrors((prev) => {
      const next = { ...prev };
      if (newErr) next[errKey] = newErr;
      else delete next[errKey];
      return next;
    });

    const updated = displayRows.map((r) => {
      if (r.rowNumber === rowNumber) {
        return {
          ...r,
          data: {
            ...(r.data || {}),
            [fieldKey]: rawValue
          }
        };
      }
      return r;
    });

    // Recompute client formulas immediately
    let recomputed = updated;
    if (code === 'ENERJI') recomputed = calculateEnerjiClient(updated).rows;
    else if (code === 'FINANS') recomputed = calculateFinansClient(updated).rows;
    else if (code === 'KARBON_AYAKIZI') recomputed = calculateKarbonClient(updated).rows;
    else if (code === 'ATIK') recomputed = calculateAtikClient(updated).rows;
    else if (code === 'SORU_SETI') recomputed = calculateSoruSetiClient(updated).rows;

    onChangeRows(recomputed);
  };

  // Filtered rows for Dijital Olgunluk or search
  const filteredRows = useMemo(() => {
    return displayRows.filter((r) => {
      const d = r.data || {};
      if (code === 'DIJITAL_OLGUNLUK' && dijitalDimFilter !== 'ALL') {
        const dim = String(d.dimension || '');
        if (!dim.startsWith(dijitalDimFilter)) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const text = `${r.rowNumber} ${d.label || ''} ${d.kalem || ''} ${d.soru || ''} ${d.question || ''} ${d.birim || ''} ${d.dimension || ''}`.toLowerCase();
        return text.includes(q);
      }
      return true;
    });
  }, [displayRows, code, dijitalDimFilter, searchQuery]);

  // Quick-fill helper for Dijital Olgunluk 106 rows
  const handleQuickFillDijital = () => {
    if (isReadOnly) return;
    const filled = displayRows.map((r) => {
      const d = { ...(r.data || {}) };
      return {
        ...r,
        data: {
          ...d,
          questionId: d.questionId || r.rowNumber,
          dimension: d.dimension || '1.1 Öğrenci',
          question: d.question || d.label || d.soru || '',
          applicationName: d.applicationName || 'OSTİM Dijital Kampüs / ÜBYS',
          approvalRole: d.approvalRole || 'Daire Başkanı',
          dataSource: d.dataSource || 'ÜBYS Veritabanı',
          accessType: d.accessType || 'İnternet',
          accessLevel: d.accessLevel || 'Kullanıcı Adı Alan Herkes',
          annualUserCount: d.annualUserCount ?? 4500,
          annualUniqueUserCount: d.annualUniqueUserCount ?? 3200,
          performanceMetric: d.performanceMetric || 'Yıllık aktif kullanım oranı %92',
          strategicGoalNo: d.strategicGoalNo || 'A1.H2',
          strategicGoalDesc: d.strategicGoalDesc || 'Dijital dönüşüm ve kurumsal otomasyon',
          dataHistoryYears: d.dataHistoryYears ?? 5,
          maturityLevel: d.maturityLevel || 'Bütünleşik Uygulamalar'
        }
      };
    });
    onChangeRows(filled);
  };

  return (
    <div className="space-y-4">
      {/* ======================================================== */}
      {/* 1. DEDICATED LIVE FORMULA BANNER BY TEMPLATE CODE        */}
      {/* ======================================================== */}

      {code === 'ENERJI' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
                <Zap size={20} />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase">
                  Canlı Enerji ve Su Dengesi Hesaplama Motoru (28 Sabit Satır)
                </h4>
                <p className="text-xs text-slate-500">
                  Satır 8 (Birim Tüketim Toplamı = SUM 1..7) ile Satır 16 (Faaliyet Tüketim Toplamı = SUM 9..15) otomatik karşılaştırılır.
                </p>
              </div>
            </div>

            <div
              className={`px-4 py-2 rounded-xl border text-xs font-black flex items-center gap-2 ${
                totals.isEqual
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-red-50 border-red-300 text-red-800'
              }`}
            >
              {totals.isEqual ? (
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle size={16} className="text-red-600 shrink-0" />
              )}
              <span>{totals.status}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200">
              <span className="text-[10px] font-black uppercase text-blue-700 block">
                1. Birim Bazlı Tüketim (Satır 8: Toplam)
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xs font-bold text-slate-600">Elektrik:</span>
                <span className="text-base font-black text-slate-900">
                  {formatTurkishNumber(totals.toplamElektrik, 2)} kW-saat
                </span>
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-xs font-bold text-slate-600">Su:</span>
                <span className="text-base font-black text-slate-900">
                  {formatTurkishNumber(totals.toplamSu, 2)} m³
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200">
              <span className="text-[10px] font-black uppercase text-indigo-700 block">
                2. Faaliyet Bazlı Tüketim (Satır 16: Toplam2)
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xs font-bold text-slate-600">Elektrik:</span>
                <span className="text-base font-black text-slate-900">
                  {formatTurkishNumber(totals.toplam2Elektrik, 2)} kW-saat
                </span>
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-xs font-bold text-slate-600">Su:</span>
                <span className="text-base font-black text-slate-900">
                  {formatTurkishNumber(totals.toplam2Su, 2)} m³
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
              <span className="text-[10px] font-black uppercase text-emerald-700 block">
                3. Temin Kaynakları Toplamı (Satır 17..28)
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xs font-bold text-slate-600">Elektrik Temin:</span>
                <span className="text-base font-black text-slate-900">
                  {formatTurkishNumber(totals.supplyElektrik, 2)} kW-saat
                </span>
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-xs font-bold text-slate-600">Su Temin:</span>
                <span className="text-base font-black text-slate-900">
                  {formatTurkishNumber(totals.supplySu, 2)} m³
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {code === 'FINANS' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                <DollarSign size={20} />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase">
                  Canlı Finansal Denge ve Kasa Kontrol Motoru (34 Sabit Satır)
                </h4>
                <p className="text-xs text-slate-500">
                  Gri bilgi satırları (13, 14, 15 ve 33) toplama dahil edilmez. Satır 32 (Mali Yıl Sonu Kasası) negatif değer alabilir.
                </p>
              </div>
            </div>

            <div
              className={`px-4 py-2 rounded-xl border text-xs font-black flex items-center gap-2 ${
                totals.isBalanced
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-red-50 border-red-300 text-red-800'
              }`}
            >
              {totals.isBalanced ? (
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle size={16} className="text-red-600 shrink-0" />
              )}
              <span>DURUM: {totals.status}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
              <span className="text-[10px] font-black uppercase text-emerald-700 block">
                Toplam Gelir (Satır 16 = SUM 1..12)
              </span>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {formatTurkishNumber(totals.toplamGelir, 2)} ₺
              </p>
              <span className="text-[11px] text-slate-500">
                Satır 13, 14, 15 bilgi amaçlıdır (Hariç)
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200">
              <span className="text-[10px] font-black uppercase text-blue-700 block">
                Toplam Gider (Satır 34 = SUM 17..32)
              </span>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {formatTurkishNumber(totals.toplamGider, 2)} ₺
              </p>
              <span className="text-[11px] text-slate-500">
                Satır 32 Kasa (+/-) dahil, Satır 33 hariç
              </span>
            </div>

            <div
              className={`p-4 rounded-2xl border ${
                totals.isBalanced
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-red-50 border-red-300'
              }`}
            >
              <span
                className={`text-[10px] font-black uppercase block ${
                  totals.isBalanced ? 'text-slate-600' : 'text-red-700'
                }`}
              >
                Kasa Farkı (Toplam Gelir - Toplam Gider)
              </span>
              <p
                className={`text-2xl font-black mt-1 ${
                  totals.isBalanced ? 'text-emerald-700' : 'text-red-700'
                }`}
              >
                {formatTurkishNumber(totals.kasaFarki, 2)} ₺
              </p>
              <span className="text-[11px] font-bold text-slate-600">
                {totals.status}
              </span>
            </div>
          </div>
        </div>
      )}

      {code === 'KARBON_AYAKIZI' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-sm">
                <Flame size={20} />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase">
                  Kurumsal Karbon Ayak İzi Hesaplama Motoru (YÖK Emisyon Katsayıları)
                </h4>
                <p className="text-xs text-slate-500">
                  Formül: <code className="bg-slate-100 px-1.5 py-0.5 rounded font-bold text-slate-700">2 × Doğalgaz(m³) + 2460 × Kömür(ton) + 11.5 × Dizel(lt) + 9.5 × Benzin(lt) + 3150 × FuelOil(ton)</code>
                </p>
              </div>
            </div>

            <div className="px-4 py-2.5 rounded-2xl bg-slate-900 text-white text-right">
              <span className="text-[10px] font-bold uppercase text-orange-400 block">
                Toplam Kurumsal Emisyon
              </span>
              <span className="text-lg font-black">
                {formatTurkishNumber(totals.totalEmissions, 2)} kg CO₂e
              </span>
              <span className="text-xs text-slate-300 ml-2">
                ({formatTurkishNumber(totals.totalTonnesCO2e, 3)} ton CO₂e)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 block">Toplam Doğalgaz (×2)</span>
              <span className="text-sm font-black text-slate-900">{formatTurkishNumber(totals.sumDogalgaz)} m³</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 block">Toplam Kömür (×2460)</span>
              <span className="text-sm font-black text-slate-900">{formatTurkishNumber(totals.sumKomur)} ton</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 block">Toplam Dizel (×11.5)</span>
              <span className="text-sm font-black text-slate-900">{formatTurkishNumber(totals.sumDizel)} lt</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 block">Toplam Benzin (×9.5)</span>
              <span className="text-sm font-black text-slate-900">{formatTurkishNumber(totals.sumBenzin)} lt</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 block">Toplam Fuel Oil (×3150)</span>
              <span className="text-sm font-black text-slate-900">{formatTurkishNumber(totals.sumFuelOil)} ton</span>
            </div>
          </div>
        </div>
      )}

      {code === 'ATIK' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-sm">
              <Recycle size={20} />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900 uppercase">
                Atıklar ve Geri Dönüşüm Matrisi (6 Kurumsal Birim × 10 Kategori)
              </h4>
              <p className="text-xs text-slate-500">
                5 Atık Türü (Organik, Tıbbi, İnorganik, Elektronik, Diğer) ve 5 Geri Dönüşüm Türü (Plastik, Cam, Kağıt, Evsel, Diğer).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="px-4 py-2 rounded-xl bg-amber-50 border border-amber-200">
              <span className="text-[10px] font-bold uppercase text-amber-800 block">Toplam Atık</span>
              <span className="text-base font-black text-amber-900">
                {formatTurkishNumber(totals.totalAtik, 3)} ton
              </span>
            </div>
            <div className="px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="text-[10px] font-bold uppercase text-emerald-800 block">Toplam Geri Dönüşüm</span>
              <span className="text-base font-black text-emerald-900">
                {formatTurkishNumber(totals.totalGeriDonusum, 3)} ton
              </span>
            </div>
          </div>
        </div>
      )}

      {code === 'SORU_SETI' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-sm">
                <HelpCircle size={20} />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase">
                  YÖK Soru Seti Göstergeleri (22 Sabit Gösterge & Koşullu Açıklama Kontrolü)
                </h4>
                <p className="text-xs text-slate-500">
                  Sıra 9 (Dumansız Hava Sahası Oranı) ve Sıra 10 (Yeşil Alan Oranı) için 89 üzeri değer girildiğinde kanıt açıklaması zorunludur.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setSoruSetiTab('sorular')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${
                  soruSetiTab === 'sorular'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                1. Soru Seti Tablosu (22)
              </button>
              <button
                type="button"
                onClick={() => setSoruSetiTab('aciklama')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-black uppercase transition-all flex items-center gap-1.5 ${
                  soruSetiTab === 'aciklama'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText size={13} />
                2. Açıklama Sayfası
                {calcState.warnings?.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-red-600 text-white rounded-full text-[10px]">
                    {calcState.warnings.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {calcState.warnings?.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-1">
              {calcState.warnings.map((w, i) => (
                <div key={i} className="flex items-center gap-2 font-bold">
                  <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                  <span>
                    Satır {w.rowNumber} ({w.label}): {w.message}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {code === 'DIJITAL_OLGUNLUK' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                <Cpu size={20} />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase">
                  Yükseköğretimde Dijital Olgunluk Anketi (5 Boyut • 106 Değerlendirme Sorusu)
                </h4>
                <p className="text-xs text-slate-500">
                  Her soru için Uygulama İsmi, Onaylayan Rol, Erişim Tipi, Erişim Seviyesi ve Olgunluk Seviyesi (Referans Değerler) seçilmelidir.
                </p>
              </div>
            </div>

            {!isReadOnly && (
              <button
                type="button"
                onClick={handleQuickFillDijital}
                className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 text-xs font-black uppercase transition-all"
              >
                Örnek Kurumsal Verilerle Hızlı Doldur (106 Soru)
              </button>
            )}
          </div>

          {/* 5 Dimension Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {[
              { id: 'ALL', label: 'Tümü (106)' },
              { id: '1.', label: '1. Birey (9)' },
              { id: '2.', label: '2. Yönetsel Süreçler (36)' },
              { id: '3.', label: '3. Eğitim ve Öğretim (20)' },
              { id: '4.', label: '4. Araştırma ve Geliştirme (13)' },
              { id: '5.', label: '5. Altyapı (28)' }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDijitalDimFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  dijitalDimFilter === tab.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. TOOLBAR: SEARCH + SAVE BUTTON                         */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative w-full sm:w-80">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Sabit satırlarda veya sorularda ara..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-medium outline-none focus:border-blue-600"
            />
          </div>

          <div className="flex items-center gap-2.5">
            {onServerCalculate && (
              <button
                type="button"
                onClick={() => onServerCalculate(displayRows)}
                className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw size={14} />
                Formülleri Doğrula
              </button>
            )}

            {!isReadOnly && (
              <button
                type="button"
                disabled={isSaving || Object.keys(cellErrors).length > 0}
                onClick={() => onSaveAll(displayRows)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-black uppercase flex items-center gap-2 shadow-md shadow-blue-600/20 transition-all"
              >
                <Save size={15} />
                {isSaving ? 'Kaydediliyor...' : 'Matris Verilerini Kaydet'}
              </button>
            )}
          </div>
        </div>

        {/* Dedicated Açıklama Tab View for SORU_SETI */}
        {code === 'SORU_SETI' && soruSetiTab === 'aciklama' ? (
          <div className="p-6 space-y-4">
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-start gap-3 text-xs text-blue-900">
              <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-black uppercase">
                  Soru Seti &ldquo;Açıklama&rdquo; Sayfası (YÖK Şablonu 2. Çalışma Sayfası Karşılığı)
                </p>
                <p className="mt-1">
                  Özellikle <strong>9. Sıra (Dumansız Hava Sahası Oranı)</strong> ve{' '}
                  <strong>10. Sıra (Yeşil Alan Oranı)</strong> göstergelerinde %89 üzeri değer beyan edildiğinde,
                  bu oranın nasıl hesaplandığını ve kontrol edilebileceğini aşağıda detaylıca açıklayınız.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {displayRows.map((r) => {
                const d = r.data || {};
                const isRow9or10 = r.rowNumber === 9 || r.rowNumber === 10;
                const val = safeNumber(d.cevap, null);
                const needsExp = isRow9or10 && val !== null && val > 89;

                return (
                  <div
                    key={r.rowNumber}
                    className={`p-4 rounded-2xl border transition-all ${
                      needsExp
                        ? 'bg-amber-50/70 border-amber-300'
                        : 'bg-slate-50/60 border-slate-200'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-black text-slate-800">
                        Sıra {r.rowNumber}: {d.soru || d.label}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700">
                          Girilen Cevap: {d.cevap !== undefined && d.cevap !== '' ? d.cevap : '(Boş)'}
                        </span>
                        {needsExp && (
                          <span className="px-2.5 py-0.5 rounded-lg bg-red-600 text-white text-[10px] font-black uppercase">
                            Zorunlu Açıklama (&gt;%89)
                          </span>
                        )}
                      </div>
                    </div>
                    <textarea
                      rows={2}
                      disabled={isReadOnly}
                      value={d.aciklama || ''}
                      onChange={(e) => handleCellChange(r.rowNumber, 'aciklama', e.target.value)}
                      placeholder={`${r.rowNumber}. gösterge için kanıt ve doğrulama açıklaması giriniz...`}
                      className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium outline-none focus:border-blue-600"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Standard Fixed-Row Matrix Table */
          <div className="overflow-x-auto max-h-[68vh] custom-scrollbar">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 sticky top-0 z-20 shadow-sm">
                <tr>
                  {(template.columns || []).map((col) => (
                    <th
                      key={col.key}
                      className="p-3 border-b border-r border-slate-200 font-black uppercase text-[11px] whitespace-nowrap"
                    >
                      <div className="flex items-center gap-1">
                        <span>{col.label}</span>
                        {col.required && <span className="text-red-500">*</span>}
                      </div>
                    </th>
                  ))}
                  {code === 'SORU_SETI' && (
                    <th className="p-3 border-b border-slate-200 font-black uppercase text-[11px] whitespace-nowrap">
                      Kabul Aralığı
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const rNum = row.rowNumber;
                  const d = row.data || {};
                  const fixedDef =
                    (template.fixedRows || []).find((f) => f.rowIndex === rNum) || {};

                  const isSummaryRow =
                    d.isSummary ||
                    fixedDef.isSummary ||
                    d.isReadonly ||
                    fixedDef.isReadonly ||
                    (code === 'ENERJI' && (rNum === 8 || rNum === 16)) ||
                    (code === 'FINANS' && (rNum === 16 || rNum === 34));

                  const isGreyExcludedFinans =
                    code === 'FINANS' && FINANS_GREY_EXCLUDED_ROWS.includes(rNum);

                  const isNegativeAllowedFinans = code === 'FINANS' && rNum === 32;

                  return (
                    <tr
                      key={rNum}
                      className={`border-b border-slate-200 transition-colors ${
                        isSummaryRow
                          ? 'bg-blue-50/90 font-black text-slate-900'
                          : isGreyExcludedFinans
                          ? 'bg-slate-200/75 text-slate-600'
                          : 'hover:bg-blue-50/30'
                      }`}
                    >
                      {(template.columns || []).map((col) => {
                        const cKey = col.key;
                        const errKey = `${rNum}_${cKey}`;
                        const errMsg = cellErrors[errKey];

                        // Determine if this specific column in the fixed row is an immutable row identifier/label
                        const isFixedIdentityCol =
                          cKey === 'siraNo' ||
                          cKey === 'questionId' ||
                          cKey === 'tur' ||
                          cKey === 'label' ||
                          cKey === 'kalem' ||
                          cKey === 'birim' ||
                          cKey === 'birimler' ||
                          cKey === 'soru' ||
                          cKey === 'dimension' ||
                          cKey === 'question';

                        const isFormulaCol = col.type === 'formula';

                        // Resolve display value for fixed identity columns
                        let cellVal = d[cKey];
                        if (cellVal === undefined || cellVal === null || cellVal === '') {
                          if (cKey === 'siraNo' || cKey === 'questionId') cellVal = rNum;
                          else if (cKey === 'tur') cellVal = fixedDef.tur || d.tur || '';
                          else if (
                            cKey === 'label' ||
                            cKey === 'kalem' ||
                            cKey === 'birim' ||
                            cKey === 'birimler' ||
                            cKey === 'soru' ||
                            cKey === 'question'
                          ) {
                            cellVal = fixedDef.label || d.label || '';
                          } else if (cKey === 'dimension') {
                            cellVal = fixedDef.customRules?.dimension || d.dimension || '';
                          }
                        }

                        if (isFixedIdentityCol) {
                          return (
                            <td
                              key={cKey}
                              className="p-2.5 border-r border-slate-200 font-semibold text-slate-800 min-w-[120px]"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span>{cellVal}</span>
                                {isSummaryRow && (cKey === 'label' || cKey === 'kalem') && (
                                  <span className="px-2 py-0.5 rounded bg-blue-600 text-white text-[10px] font-black uppercase shrink-0">
                                    OTOMATİK TOPLAM
                                  </span>
                                )}
                                {isGreyExcludedFinans && cKey === 'kalem' && (
                                  <span className="px-2 py-0.5 rounded bg-slate-500 text-white text-[10px] font-bold shrink-0">
                                    Toplama Dahil Değil (Bilgi)
                                  </span>
                                )}
                                {isNegativeAllowedFinans && cKey === 'kalem' && (
                                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold shrink-0">
                                    Negatif (-) Girilebilir
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        }

                        if (isSummaryRow || isFormulaCol) {
                          // Render calculated cell
                          let formattedFormula = cellVal;
                          if (code === 'FINANS' && cKey === 'kasaFarki') {
                            formattedFormula =
                              rNum === 34
                                ? `${formatTurkishNumber(d.kasaFarki, 2)} ₺ (${d.status || ''})`
                                : '-';
                          } else if (typeof cellVal === 'number') {
                            formattedFormula = formatTurkishNumber(cellVal, 2);
                          }

                          return (
                            <td
                              key={cKey}
                              className={`p-2.5 border-r border-slate-200 font-black ${
                                code === 'SORU_SETI' && d.requiresExplanation
                                  ? 'text-red-600 bg-amber-50'
                                  : 'text-blue-900 bg-slate-100/80'
                              }`}
                            >
                              {formattedFormula ?? '-'}
                            </td>
                          );
                        }

                        // Editable cell inside Fixed Matrix
                        return (
                          <td
                            key={cKey}
                            className="p-1.5 border-r border-slate-200 min-w-[150px] align-top"
                          >
                            {col.type === 'select' ? (
                              <select
                                disabled={isReadOnly}
                                value={cellVal ?? ''}
                                onChange={(e) =>
                                  handleCellChange(rNum, cKey, e.target.value, col)
                                }
                                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-600 disabled:bg-slate-100"
                              >
                                <option value="">Seçiniz...</option>
                                {(col.options || []).map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type={
                                  col.type === 'integer' || col.type === 'decimal'
                                    ? 'number'
                                    : 'text'
                                }
                                step={col.type === 'decimal' ? 'any' : '1'}
                                disabled={isReadOnly}
                                value={cellVal ?? ''}
                                onChange={(e) =>
                                  handleCellChange(rNum, cKey, e.target.value, col)
                                }
                                placeholder={
                                  code === 'SORU_SETI' && cKey === 'aciklama' && d.requiresExplanation
                                    ? 'Zorunlu açıklama (>%89)...'
                                    : 'Değer giriniz...'
                                }
                                className={`w-full rounded-lg border px-2.5 py-1.5 text-xs font-bold outline-none transition-all disabled:bg-slate-100 ${
                                  errMsg ||
                                  (code === 'SORU_SETI' &&
                                    cKey === 'aciklama' &&
                                    d.requiresExplanation &&
                                    !cellVal)
                                    ? 'border-red-500 bg-red-50/40 text-red-900'
                                    : 'border-slate-300 bg-white focus:border-blue-600'
                                }`}
                              />
                            )}
                            {errMsg && (
                              <p className="text-[10px] font-bold text-red-600 mt-0.5 leading-tight">
                                {errMsg}
                              </p>
                            )}
                          </td>
                        );
                      })}

                      {code === 'SORU_SETI' && (
                        <td className="p-2.5 text-[11px] font-mono text-slate-500 whitespace-nowrap">
                          {SORU_SETI_BOUNDS[rNum - 1]
                            ? `${SORU_SETI_BOUNDS[rNum - 1].min} – ${SORU_SETI_BOUNDS[
                                rNum - 1
                              ].max.toLocaleString('tr-TR')}`
                            : '0+'}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

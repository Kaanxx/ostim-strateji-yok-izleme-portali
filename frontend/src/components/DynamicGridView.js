import React, { useState, useMemo } from 'react';
import {
  Plus,
  Save,
  Trash2,
  Search,
  Edit3,
  AlertTriangle,
  CheckCircle2,
  Code2,
  ShieldAlert,
  Clock,
  Calculator,
  X,
  Sparkles
} from 'lucide-react';
import MultiSelectTagPicker from './MultiSelectTagPicker';
import {
  enrichMemnuniyetRow,
  enrichProjelerRow,
  validateDuration,
  validateKVKKDisabledMember,
  formatTurkishNumber
} from '../utils/formulaEngine';

export default function DynamicGridView({
  template,
  rows,
  onChangeRows,
  onSaveAll,
  onDeleteRow,
  isSaving,
  isReadOnly
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingModalIndex, setEditingModalIndex] = useState(null);

  const code = template?.code || '';
  const columns = useMemo(
    () => [...(template?.columns || [])].sort((a, b) => (a.order || 0) - (b.order || 0)),
    [template]
  );

  const isMacroTemplate =
    template?.excelTemplatePath?.endsWith('.xlsm') ||
    code === 'MYO_UYGULAMALI_EGITIM' ||
    code === 'PROJELER';

  // Enrich rows with live client-side formulas (MemnuniyetAnketi, Projeler)
  const enrichedRows = useMemo(() => {
    return (rows || []).map((r, idx) => {
      let d = { ...(r.data || {}) };
      if (code === 'MEMNUNIYET_ANKETI') {
        d = enrichMemnuniyetRow(d);
      } else if (code === 'PROJELER') {
        d = enrichProjelerRow(d);
      }
      return {
        ...r,
        rowNumber: r.rowNumber !== undefined ? r.rowNumber : idx + 1,
        data: d
      };
    });
  }, [rows, code]);

  // Row-level validation warnings/errors (KVKK, Duration, Projeler Budget, Memnuniyet Scale)
  const rowDiagnostics = useMemo(() => {
    const diag = {};
    enrichedRows.forEach((r, idx) => {
      const d = r.data || {};
      const issues = [];

      if (code === 'OGRENCI_TOPLULUKLARI' && d.engelliUyeSayisi !== undefined && d.engelliUyeSayisi !== '') {
        const kvkk = validateKVKKDisabledMember(d.engelliUyeSayisi);
        if (!kvkk.isValid) {
          issues.push({ type: 'ERROR', field: 'engelliUyeSayisi', message: kvkk.message });
        }
      }

      if (code === 'EGITICILERIN_EGITIMI' && d.egitiminSuresi !== undefined && d.egitiminSuresi !== '') {
        const dur = validateDuration(d.egitiminSuresi);
        if (!dur.isValid) {
          issues.push({ type: 'ERROR', field: 'egitiminSuresi', message: dur.message });
        }
      }

      if (code === 'MEMNUNIYET_ANKETI' && d.ortalamaAnketPuani !== undefined && d.ortalamaAnketPuani !== '') {
        const s = Number(d.ortalamaAnketPuani);
        const sc = Number(d.olcumSkalasi);
        if (!isNaN(s) && !isNaN(sc) && sc > 0 && s > sc) {
          issues.push({
            type: 'ERROR',
            field: 'ortalamaAnketPuani',
            message: `Ortalama puan (${s}) seçilen ölçüm skalasını (${sc}) aşamaz.`
          });
        }
      }

      if (code === 'PROJELER' && d.butceDurumu === 'Bütçeleri Kontrol Et') {
        issues.push({
          type: 'WARNING',
          field: 'butcesiTl',
          message: `Toplam Bütçe (${formatTurkishNumber(d.butcesiTl)} TL) ile 9 kaynak kırılım toplamı (${formatTurkishNumber(d.breakdownSum)} TL) eşit değil.`
        });
      }

      if (issues.length > 0) {
        diag[idx] = issues;
      }
    });
    return diag;
  }, [enrichedRows, code]);

  const hasBlockingErrors = useMemo(() => {
    return Object.values(rowDiagnostics).some((list) =>
      list.some((item) => item.type === 'ERROR')
    );
  }, [rowDiagnostics]);

  const handleCellUpdate = (rowIndex, fieldKey, newValue) => {
    if (isReadOnly) return;
    const next = enrichedRows.map((r, idx) => {
      if (idx !== rowIndex) return r;
      let updatedData = {
        ...(r.data || {}),
        [fieldKey]: newValue
      };
      if (code === 'MEMNUNIYET_ANKETI') {
        updatedData = enrichMemnuniyetRow(updatedData);
      } else if (code === 'PROJELER') {
        updatedData = enrichProjelerRow(updatedData);
      }
      return {
        ...r,
        data: updatedData
      };
    });
    onChangeRows(next);
  };

  const handleAddRow = () => {
    if (isReadOnly) return;
    const nextRowNum = enrichedRows.length + 1;
    const initialData = {};
    columns.forEach((col) => {
      if (col.key === 'siraNo' || col.key === 'no') {
        initialData[col.key] = nextRowNum;
      } else {
        initialData[col.key] = '';
      }
    });
    onChangeRows([
      ...enrichedRows,
      {
        _tempId: `new_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        rowNumber: nextRowNum,
        data: initialData
      }
    ]);
  };

  const handleAddSampleRow = () => {
    if (isReadOnly) return;
    const nextRowNum = enrichedRows.length + 1;
    const sample = {};
    columns.forEach((col) => {
      if (col.key === 'siraNo' || col.key === 'no') sample[col.key] = nextRowNum;
      else if (col.type === 'multiselect' && col.options?.length > 0) {
        sample[col.key] = col.options.slice(0, 2).join(',');
      } else if (col.type === 'select' && col.options?.length > 0) {
        sample[col.key] = col.options[0];
      } else if (col.type === 'date') {
        sample[col.key] = '2026-05-15';
      } else if (col.type === 'url') {
        sample[col.key] = 'https://ostimteknik.edu.tr/kalite-bidr';
      } else if (col.key === 'egitiminSuresi') {
        sample[col.key] = '4 Saat';
      } else if (col.key === 'engelliUyeSayisi') {
        sample[col.key] = 3;
      } else if (col.key === 'yoksisBirimId') {
        sample[col.key] = 208415;
      } else if (col.key === 'ilkTesekkulYili' || col.key === 'ilkAcildigiYil' || col.key === 'raporYili') {
        sample[col.key] = 2024;
      } else if (col.type === 'integer') {
        sample[col.key] = col.min && col.min > 0 ? col.min : 10;
      } else if (col.type === 'decimal') {
        sample[col.key] = col.min && col.min > 0 ? col.min : 25;
      } else if (col.type !== 'formula') {
        sample[col.key] = `Örnek ${col.label} ${nextRowNum}`;
      }
    });

    if (code === 'MEMNUNIYET_ANKETI') {
      sample.olcumSkalasi = '5';
      sample.ortalamaAnketPuani = 4.2;
      Object.assign(sample, enrichMemnuniyetRow(sample));
    } else if (code === 'PROJELER') {
      sample.butcesiTl = 500000;
      sample.tubitak = 300000;
      sample.merkeziYatirimButcesi = 200000;
      sample.donerSermaye = 0;
      sample.digerKurumIci = 0;
      sample.ulusalKamu = 0;
      sample.ulusalSektorel = 0;
      sample.ulusalStk = 0;
      sample.uluslararasiFonlar = 0;
      sample.uluslararasiSektorel = 0;
      Object.assign(sample, enrichProjelerRow(sample));
    }

    onChangeRows([
      ...enrichedRows,
      {
        _tempId: `sample_${Date.now()}`,
        rowNumber: nextRowNum,
        data: sample
      }
    ]);
  };

  const filteredWithIndex = useMemo(() => {
    return enrichedRows
      .map((row, originalIndex) => ({ row, originalIndex }))
      .filter(({ row }) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        return Object.values(row.data || {}).some((val) =>
          String(val ?? '')
            .toLowerCase()
            .includes(q)
        );
      });
  }, [enrichedRows, searchQuery]);

  const renderFieldInput = (col, rowData, originalIndex, inModal = false) => {
    const val = rowData[col.key];

    if (col.type === 'formula') {
      const isProjelerStatus = code === 'PROJELER' && col.key === 'butceDurumu';
      return (
        <div
          className={`px-3 py-2 rounded-xl text-xs font-black border flex items-center justify-between ${
            isProjelerStatus
              ? val === 'Bütçe Tamam'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : val === 'Bütçeleri Kontrol Et'
                ? 'bg-red-50 border-red-300 text-red-800'
                : 'bg-slate-100 border-slate-200 text-slate-500'
              : 'bg-blue-50/70 border-blue-200 text-blue-900'
          }`}
        >
          <span>{val !== undefined && val !== '' && val !== null ? String(val) : 'Otomatik Hesaplanır'}</span>
          {isProjelerStatus && rowData.breakdownSum !== undefined && (
            <span className="text-[10px] font-bold opacity-75 ml-2">
              (Dağılım: {formatTurkishNumber(rowData.breakdownSum)} TL)
            </span>
          )}
        </div>
      );
    }

    if (col.type === 'multiselect') {
      return (
        <MultiSelectTagPicker
          value={val || ''}
          options={col.options || []}
          disabled={isReadOnly}
          compact={!inModal}
          onChange={(newCommaVal) => handleCellUpdate(originalIndex, col.key, newCommaVal)}
        />
      );
    }

    if (col.type === 'select') {
      return (
        <select
          disabled={isReadOnly}
          value={val ?? ''}
          onChange={(e) => handleCellUpdate(originalIndex, col.key, e.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-600 disabled:bg-slate-100"
        >
          <option value="">Seçiniz...</option>
          {(col.options || []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }

    // Special helper for EgiticilerinEgitimi duration column
    if (code === 'EGITICILERIN_EGITIMI' && col.key === 'egitiminSuresi') {
      const check = val ? validateDuration(val) : { isValid: true };
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <input
              type="text"
              disabled={isReadOnly}
              value={val ?? ''}
              onChange={(e) => handleCellUpdate(originalIndex, col.key, e.target.value)}
              placeholder="Örn: 4 Saat, 2 Gün, 1 Hafta"
              className={`w-full rounded-xl border px-2.5 py-1.5 text-xs font-bold outline-none ${
                !check.isValid
                  ? 'border-red-500 bg-red-50 text-red-900'
                  : 'border-slate-300 bg-white focus:border-blue-600'
              }`}
            />
          </div>
          {!isReadOnly && (
            <div className="flex items-center gap-1 text-[10px]">
              {['Saat', 'Gün', 'Hafta'].map((unit) => (
                <button
                  key={unit}
                  type="button"
                  onClick={() => {
                    const numMatch = String(val || '').match(/\d+/);
                    const num = numMatch ? numMatch[0] : '4';
                    handleCellUpdate(originalIndex, col.key, `${num} ${unit}`);
                  }}
                  className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-700 font-bold"
                >
                  +{unit}
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Special helper for OgrenciTopluluklari KVKK disabled member count
    if (code === 'OGRENCI_TOPLULUKLARI' && col.key === 'engelliUyeSayisi') {
      const kvkk = validateKVKKDisabledMember(val);
      return (
        <div className="space-y-1">
          <input
            type="number"
            min="0"
            step="1"
            disabled={isReadOnly}
            value={val ?? ''}
            onChange={(e) => handleCellUpdate(originalIndex, col.key, e.target.value)}
            placeholder="0 veya >= 3 (KVKK)"
            className={`w-full rounded-xl border px-2.5 py-1.5 text-xs font-bold outline-none ${
              !kvkk.isValid
                ? 'border-red-500 bg-red-50 text-red-900'
                : 'border-slate-300 bg-white focus:border-blue-600'
            }`}
          />
          {!kvkk.isValid && (
            <p className="text-[10px] font-bold text-red-600 leading-tight">
              KVKK: 1 veya 2 girilemez! (0 veya &ge;3 giriniz)
            </p>
          )}
        </div>
      );
    }

    return (
      <input
        type={
          col.type === 'integer' || col.type === 'decimal'
            ? 'number'
            : col.type === 'date'
            ? 'date'
            : 'text'
        }
        step={col.type === 'decimal' ? 'any' : '1'}
        min={col.min !== undefined ? col.min : undefined}
        max={col.max !== undefined ? col.max : undefined}
        disabled={isReadOnly}
        value={val ?? ''}
        onChange={(e) => handleCellUpdate(originalIndex, col.key, e.target.value)}
        placeholder={col.placeholder || `${col.label}...`}
        className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-600 disabled:bg-slate-100"
      />
    );
  };

  return (
    <div className="space-y-4">
      {/* ======================================================== */}
      {/* 1. TEMPLATE-SPECIFIC MACRO / FORMULA BANNERS             */}
      {/* ======================================================== */}
      {isMacroTemplate && (
        <div className="bg-indigo-950 text-white rounded-2xl p-4 shadow-md flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
              <Code2 size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-indigo-200">
                  VBA Makrolu Şablon Karşılığı ({template.excelTemplatePath || '.xlsm'})
                </h4>
                <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 text-[10px] font-black uppercase">
                  Çoklu Seçim &amp; 1:1 vbaProject.bin Korumalı
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {code === 'MYO_UYGULAMALI_EGITIM'
                  ? 'İşletmede Eğitim Sektörü (Sütun W) ve Staj Sektörü (Sütun AI) alanlarında 27 resmi sektörden tekرارsız çoklu seçim (virgülle ayrılmış) yapılabilir.'
                  : 'Proje Teması (8 Tema) ve Proje Ortakları (4 Ortak) çoklu seçim alanları ile Proje Bütçesi = 9 Kaynak Kırılım Toplamı kontrolü canlı çalışır.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {code === 'MEMNUNIYET_ANKETI' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center gap-3 text-xs">
          <Calculator size={20} className="text-blue-600 shrink-0" />
          <div>
            <p className="font-black text-slate-900 uppercase">
              Otomatik Normalize Anket Puanı Motoru (100&apos;lük Sistem)
            </p>
            <p className="text-slate-600">
              Ölçüm Skalası <strong>5</strong> ise <code>Ortalama Puan &times; 20</code>,{' '}
              <strong>10</strong> ise <code>Ortalama Puan &times; 10</code>,{' '}
              <strong>100</strong> ise <code>Ortalama Puan &times; 1</code> olarak otomatik hesaplanır.
            </p>
          </div>
        </div>
      )}

      {code === 'EGITICILERIN_EGITIMI' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center gap-3 text-xs">
          <Clock size={20} className="text-amber-600 shrink-0" />
          <div>
            <p className="font-black text-slate-900 uppercase">
              Eğitimin Süresi Format Kuralı
            </p>
            <p className="text-slate-600">
              Eğitim süresi alanı YÖK format kuralı gereği <code>&lt;Sayı&gt; Saat|Gün|Hafta</code> biçiminde olmalıdır (Örnek: <strong>4 Saat</strong>, <strong>2 Gün</strong>, <strong>1 Hafta</strong>).
            </p>
          </div>
        </div>
      )}

      {code === 'OGRENCI_TOPLULUKLARI' && (
        <div className="bg-amber-50 rounded-2xl border border-amber-300 p-4 shadow-sm flex items-center gap-3 text-xs text-amber-950">
          <ShieldAlert size={22} className="text-amber-600 shrink-0" />
          <div>
            <p className="font-black uppercase">
              KVKK Kişisel Verilerin Korunması ve Anonimleştirme Kuralı
            </p>
            <p className="mt-0.5">
              <strong>Engelli Üye Sayısı</strong> 3&apos;ten az (<strong>1</strong> veya <strong>2</strong>) olması halinde ilgili kulüp için bu değer paylaşılamaz. Lütfen <strong>0</strong> bırakınız veya <strong>3 ve üzeri</strong> bir değer giriniz.
            </p>
          </div>
        </div>
      )}

      {/* Validation Alert List */}
      {Object.keys(rowDiagnostics).length > 0 && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-black text-red-800 uppercase">
            <AlertTriangle size={16} />
            <span>Tabloda Dikkat Edilmesi Gereken Doğrulama Uyarıları Bulunuyor:</span>
          </div>
          {Object.entries(rowDiagnostics).map(([rIdx, list]) =>
            list.map((issue, i) => (
              <p
                key={`${rIdx}_${i}`}
                className={`text-xs font-semibold pl-6 ${
                  issue.type === 'ERROR' ? 'text-red-700' : 'text-amber-800'
                }`}
              >
                &bull; <strong>Satır #{Number(rIdx) + 1}:</strong> {issue.message}
              </p>
            ))
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. GRID TOOLBAR                                          */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-3 flex-1 min-w-[240px]">
            <div className="relative w-full max-w-xs">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tablo kayıtlarında ara..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-medium outline-none focus:border-blue-600"
              />
            </div>
            <span className="text-xs font-bold text-slate-500 whitespace-nowrap">
              Toplam <strong>{enrichedRows.length}</strong> Kayıt • <strong>{columns.length}</strong> Sütun
            </span>
          </div>

          {!isReadOnly && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleAddSampleRow}
                className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center gap-1.5 transition-all"
                title="Test için kurallara uygun örnek satır ekler"
              >
                <Sparkles size={14} />
                Örnek Satır Ekle
              </button>

              <button
                type="button"
                onClick={handleAddRow}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-black uppercase flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Plus size={15} />
                Yeni Satır Ekle
              </button>

              <button
                type="button"
                disabled={isSaving || hasBlockingErrors}
                onClick={() => onSaveAll(enrichedRows)}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-black uppercase flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/20"
              >
                <Save size={15} />
                {isSaving ? 'Kaydediliyor...' : 'Veritabanına Kaydet'}
              </button>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* 3. DATA TABLE                                            */}
        {/* ======================================================== */}
        {enrichedRows.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-sm font-bold text-slate-600">
              Bu dönem ve birim için henüz kayıt girilmemiştir.
            </p>
            {!isReadOnly && (
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase inline-flex items-center gap-2"
                >
                  <Plus size={15} />
                  İlk Satırı Ekle
                </button>
                <button
                  type="button"
                  onClick={handleAddSampleRow}
                  className="px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold inline-flex items-center gap-2"
                >
                  <Sparkles size={15} />
                  Örnek Veri İle Başla
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[65vh] custom-scrollbar pb-16">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 sticky top-0 z-20 shadow-sm">
                <tr>
                  <th className="p-3 border-b border-r border-slate-200 font-black uppercase text-[11px] w-12 text-center sticky left-0 bg-slate-100 z-30">
                    #
                  </th>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={`p-3 border-b border-r border-slate-200 font-black uppercase text-[11px] whitespace-nowrap ${
                        col.type === 'multiselect' ? 'min-w-[280px] bg-indigo-50/60 text-indigo-950' : 'min-w-[180px]'
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <span>{col.label}</span>
                        {col.required && <span className="text-red-500">*</span>}
                        {col.type === 'multiselect' && (
                          <span className="ml-1 px-1.5 py-0.2 bg-indigo-600 text-white rounded text-[9px]">
                            ÇOKLU SEÇİM
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="p-3 border-b border-slate-200 font-black uppercase text-[11px] text-center whitespace-nowrap sticky right-0 bg-slate-100 z-30">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredWithIndex.map(({ row, originalIndex }) => {
                  const rowData = row.data || {};
                  return (
                    <tr
                      key={row._id || row.id || row._tempId || originalIndex}
                      className="border-b border-slate-200 hover:bg-blue-50/20 transition-colors"
                    >
                      <td className="p-2.5 border-r border-slate-200 text-center font-black text-slate-500 sticky left-0 bg-white z-10">
                        {originalIndex + 1}
                      </td>
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className="p-2 border-r border-slate-200 align-top"
                        >
                          {renderFieldInput(col, rowData, originalIndex, false)}
                        </td>
                      ))}
                      <td className="p-2 text-center whitespace-nowrap sticky right-0 bg-white z-10 border-l border-slate-200">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingModalIndex(originalIndex)}
                            title="Form Görünümünde Detaylı Düzenle"
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Edit3 size={15} />
                          </button>
                          {!isReadOnly && (
                            <button
                              type="button"
                              onClick={() => onDeleteRow(row, originalIndex)}
                              title="Satırı Sil"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 4. DETAILED ROW EDIT MODAL (FOR WIDE 37-40 COL TABLES)   */}
      {/* ======================================================== */}
      {editingModalIndex !== null && enrichedRows[editingModalIndex] && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-black uppercase">
                  Satır #{editingModalIndex + 1} Detaylı Form Görünümü ({template.title})
                </h3>
                <p className="text-xs text-slate-300">
                  Tüm {columns.length} sütunu tek ekranda inceleyip düzenleyebilirsiniz.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingModalIndex(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-xl"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 custom-scrollbar">
              {columns.map((col) => (
                <div
                  key={col.key}
                  className={col.type === 'multiselect' ? 'md:col-span-2' : ''}
                >
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {col.label}{' '}
                    {col.required && <span className="text-red-500">*</span>}
                  </label>
                  {renderFieldInput(
                    col,
                    enrichedRows[editingModalIndex].data || {},
                    editingModalIndex,
                    true
                  )}
                </div>
              ))}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setEditingModalIndex(null)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase flex items-center gap-1.5"
              >
                <CheckCircle2 size={15} />
                Tamam (Tabloya Dön)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

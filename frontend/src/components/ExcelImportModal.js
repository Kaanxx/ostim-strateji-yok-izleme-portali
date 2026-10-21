import React, { useState } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Download,
  RefreshCw
} from 'lucide-react';
import { excelApi, templateApi } from '../services/api';

export default function ExcelImportModal({
  isOpen,
  onClose,
  template,
  departmentId,
  departmentName,
  period,
  onImportSuccess
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !template) return null;

  const isMacroTemplate =
    template.excelTemplatePath?.endsWith('.xlsm') ||
    template.code === 'MYO_UYGULAMALI_EGITIM' ||
    template.code === 'PROJELER';

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setValidationResult(null);
      setErrorMsg('');
    }
  };

  const handleValidateOnly = async () => {
    if (!selectedFile) {
      setErrorMsg('Lütfen önce bir Excel (.xlsx veya .xlsm) dosyası seçiniz.');
      return;
    }
    setIsUploading(true);
    setErrorMsg('');
    try {
      const res = await excelApi.importExcel(
        template.code,
        selectedFile,
        departmentId,
        period,
        false
      );
      setValidationResult({ ...res, mode: 'preview' });
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message || err.message || 'Dosya doğrulama sırasında hata oluştu.'
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleCommitImport = async () => {
    if (!selectedFile) {
      setErrorMsg('Lütfen önce bir Excel (.xlsx veya .xlsm) dosyası seçiniz.');
      return;
    }
    setIsUploading(true);
    setErrorMsg('');
    try {
      const res = await excelApi.importExcel(
        template.code,
        selectedFile,
        departmentId,
        period,
        true
      );
      setValidationResult({ ...res, mode: 'commit' });
      if (res.success && res.valid && onImportSuccess) {
        onImportSuccess(res);
      }
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message || err.message || 'İçe aktarma sırasında hata oluştu.'
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadBlank = async () => {
    try {
      await templateApi.downloadBlankExcel(template.code);
    } catch (err) {
      setErrorMsg('Boş şablon indirilemedi.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center">
              <Upload size={20} />
            </div>
            <div>
              <h3 className="text-base font-black uppercase tracking-tight">
                Excel&apos;den Doğrulamalı Veri Yükle (1:1 İçe Aktarım)
              </h3>
              <p className="text-xs text-slate-300">
                {template.title} ({template.code}) • {departmentName || 'Seçili Birim'} • {period}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {/* Info banner */}
          <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-start justify-between gap-4">
            <div className="text-xs text-blue-900 space-y-1">
              <p className="font-bold">
                Resmi YÖK Şablonu ({isMacroTemplate ? '.xlsm Makrolu' : '.xlsx'}) veya Standart Tablo Desteği
              </p>
              <p className="text-blue-700 leading-relaxed">
                Yüklediğiniz dosya şablonun veri başlangıç satırından ({template.dataStartRow || 1}. satır)
                itibaren taranır; veri tipleri, alt/üst sınırlar, açılır liste (Referans Değerler) eşleşmeleri ve
                KVKK/formül kuralları otomatik doğrulanır.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadBlank}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-blue-300 text-blue-700 text-xs font-bold hover:bg-blue-600 hover:text-white transition-colors shadow-sm"
            >
              <Download size={14} />
              Boş Şablon İndir
            </button>
          </div>

          {/* File Dropzone */}
          <label className="block border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer transition-all bg-slate-50/60 hover:bg-blue-50/30">
            <input
              type="file"
              accept=".xlsx,.xlsm"
              onChange={handleFileChange}
              className="hidden"
            />
            <FileSpreadsheet size={36} className="mx-auto text-blue-600 mb-2" />
            {selectedFile ? (
              <div>
                <p className="text-sm font-black text-slate-900">{selectedFile.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {(selectedFile.size / 1024).toFixed(1)} KB • Değiştirmek için tıklayın
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-bold text-slate-700">
                  Excel dosyasını (.xlsx veya .xlsm) seçmek için tıklayın
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Maksimum dosya boyutu: 50 MB
                </p>
              </div>
            )}
          </label>

          {errorMsg && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-center gap-3 text-xs font-bold text-red-700">
              <AlertCircle size={18} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Validation Report */}
          {validationResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    Taranan Satır
                  </span>
                  <span className="text-2xl font-black text-slate-900">
                    {validationResult.totalRows ?? 0}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] font-bold uppercase text-emerald-700 block">
                    Geçerli Satır
                  </span>
                  <span className="text-2xl font-black text-emerald-700">
                    {validationResult.validRows ?? 0}
                  </span>
                </div>
                <div
                  className={`p-3.5 rounded-2xl border ${
                    (validationResult.errors?.length || 0) > 0
                      ? 'bg-red-50 border-red-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <span
                    className={`text-[10px] font-bold uppercase block ${
                      (validationResult.errors?.length || 0) > 0
                        ? 'text-red-700'
                        : 'text-slate-500'
                    }`}
                  >
                    Hata Sayısı
                  </span>
                  <span
                    className={`text-2xl font-black ${
                      (validationResult.errors?.length || 0) > 0
                        ? 'text-red-700'
                        : 'text-slate-700'
                    }`}
                  >
                    {validationResult.errors?.length || 0}
                  </span>
                </div>
              </div>

              {validationResult.valid ? (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 flex items-center gap-3 text-emerald-900">
                  <CheckCircle2 size={22} className="text-emerald-600 shrink-0" />
                  <div className="text-xs">
                    {validationResult.mode === 'commit' ? (
                      <>
                        <p className="font-black text-sm">
                          İçe Aktarım Başarıyla Tamamlandı!
                        </p>
                        <p className="mt-0.5">
                          Toplam <strong>{validationResult.importedCount}</strong> satır
                          doğrulanarak veritabanına kaydedildi.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="font-black text-sm">
                          Tüm Satırlar YÖK Şablon Kurallarına Uygun!
                        </p>
                        <p className="mt-0.5">
                          &quot;Doğrula ve Veritabanına Aktar&quot; butonuna basarak{' '}
                          <strong>{validationResult.validRows}</strong> satırı kaydedebilirsiniz.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 flex items-center gap-2.5 text-amber-900 text-xs font-bold">
                    <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                    <span>
                      Dosyada şablon kurallarına uymayan hücreler tespit edildi. Lütfen aşağıdaki
                      hataları düzelterek tekrar yükleyiniz:
                    </span>
                  </div>

                  <div className="max-h-60 overflow-y-auto rounded-2xl border border-red-200 bg-white custom-scrollbar">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-red-50 text-red-900 sticky top-0">
                        <tr>
                          <th className="p-2.5 border-b border-red-200 font-black">Satır</th>
                          <th className="p-2.5 border-b border-red-200 font-black">Alan / Kolon</th>
                          <th className="p-2.5 border-b border-red-200 font-black">Hatalı Değer</th>
                          <th className="p-2.5 border-b border-red-200 font-black">Hata Açıklaması</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(validationResult.errors || []).map((err, idx) => (
                          <tr key={idx} className="border-b border-slate-100 hover:bg-red-50/40">
                            <td className="p-2.5 font-black text-slate-700 whitespace-nowrap">
                              Satır {err.excelRow || err.row || '-'}
                            </td>
                            <td className="p-2.5 font-semibold text-slate-800">
                              {err.label || err.field || err.column || '-'}
                            </td>
                            <td className="p-2.5 font-mono text-red-600">
                              {err.value !== undefined && err.value !== null
                                ? String(err.value)
                                : '(Boş)'}
                            </td>
                            <td className="p-2.5 text-slate-700">{err.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors"
          >
            Kapat
          </button>
          <button
            type="button"
            disabled={!selectedFile || isUploading}
            onClick={handleValidateOnly}
            className="px-4 py-2.5 rounded-xl bg-amber-500 text-white text-xs font-black uppercase hover:bg-amber-600 disabled:opacity-50 transition-all flex items-center gap-1.5"
          >
            {isUploading ? <RefreshCw size={14} className="animate-spin" /> : null}
            Ön Kontrol (Doğrula)
          </button>
          <button
            type="button"
            disabled={!selectedFile || isUploading}
            onClick={handleCommitImport}
            className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-black uppercase hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-lg shadow-blue-600/20"
          >
            {isUploading ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
            Doğrula ve Veritabanına Aktar
          </button>
        </div>
      </div>
    </div>
  );
}

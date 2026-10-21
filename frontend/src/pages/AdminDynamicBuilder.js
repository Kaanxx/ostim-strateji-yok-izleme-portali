import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Save,
  Upload,
  Layers,
  Edit3,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ArrowRight
} from 'lucide-react';
import { templateApi } from '../services/api';

const COLUMN_TYPES = [
  { value: 'text', label: 'Metin (Text)' },
  { value: 'integer', label: 'Tam Sayı (Integer)' },
  { value: 'decimal', label: 'Ondalıklı Sayı (Decimal)' },
  { value: 'date', label: 'Tarih (Date)' },
  { value: 'select', label: 'Tekli Seçim Açılır Liste (Select)' },
  { value: 'multiselect', label: 'Çoklu Seçim Etiket (Multi-Select VBA)' },
  { value: 'url', label: 'Web Bağlantısı (URL)' },
  { value: 'formula', label: 'Otomatik Formül (Formula)' }
];

function slugifyKey(str) {
  const trMap = {
    ç: 'c', Ç: 'c', ğ: 'g', Ğ: 'g', ı: 'i', İ: 'i',
    ö: 'o', Ö: 'o', ş: 's', Ş: 's', ü: 'u', Ü: 'u'
  };
  const cleaned = String(str || '')
    .split('')
    .map((c) => trMap[c] || c)
    .join('')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim();
  if (!cleaned) return `alan_${Math.floor(Math.random() * 1000)}`;
  const words = cleaned.split(/\s+/);
  return words
    .map((w, i) =>
      i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    )
    .join('');
}

export default function AdminDynamicBuilder({
  templates = [],
  onRefreshTemplates,
  onSelectTemplateToView
}) {
  const [editingCode, setEditingCode] = useState(null);
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Özel Dinamik Şablonlar');
  const [type, setType] = useState('DYNAMIC');
  const [description, setDescription] = useState('');
  const [dataStartRow, setDataStartRow] = useState(2);
  const [columns, setColumns] = useState([
    { key: 'siraNo', label: 'Sıra No', type: 'integer', required: true, min: 1, max: '', optionsText: '' },
    { key: 'faaliyetAdi', label: 'Faaliyet / Kayıt Adı', type: 'text', required: true, min: '', max: '', optionsText: '' }
  ]);
  const [statusMsg, setStatusMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const resetForm = () => {
    setEditingCode(null);
    setCode('');
    setTitle('');
    setCategory('Özel Dinamik Şablonlar');
    setType('DYNAMIC');
    setDescription('');
    setDataStartRow(2);
    setColumns([
      { key: 'siraNo', label: 'Sıra No', type: 'integer', required: true, min: 1, max: '', optionsText: '' },
      { key: 'faaliyetAdi', label: 'Faaliyet / Kayıt Adı', type: 'text', required: true, min: '', max: '', optionsText: '' }
    ]);
    setStatusMsg(null);
    setErrorMsg(null);
  };

  const handleLoadForEdit = (tpl) => {
    setEditingCode(tpl.code);
    setCode(tpl.code);
    setTitle(tpl.title);
    setCategory(tpl.category || 'Özel Dinamik Şablonlar');
    setType(tpl.type || 'DYNAMIC');
    setDescription(tpl.description || '');
    setDataStartRow(tpl.dataStartRow || 2);
    setColumns(
      (tpl.columns || []).map((c) => ({
        key: c.key,
        label: c.label,
        type: c.type || 'text',
        required: !!c.required,
        min: c.min !== undefined && c.min !== null ? c.min : '',
        max: c.max !== undefined && c.max !== null ? c.max : '',
        optionsText: Array.isArray(c.options) ? c.options.join(', ') : ''
      }))
    );
    setStatusMsg(null);
    setErrorMsg(null);
  };

  const handleAddColumn = () => {
    const idx = columns.length + 1;
    setColumns([
      ...columns,
      {
        key: `sutun${idx}`,
        label: `Yeni Sütun ${idx}`,
        type: 'text',
        required: false,
        min: '',
        max: '',
        optionsText: ''
      }
    ]);
  };

  const handleRemoveColumn = (idx) => {
    if (columns.length <= 1) return;
    setColumns(columns.filter((_, i) => i !== idx));
  };

  const handleColChange = (idx, field, val) => {
    setColumns((prev) =>
      prev.map((col, i) => {
        if (i !== idx) return col;
        const updated = { ...col, [field]: val };
        if (field === 'label' && (!col.key || col.key.startsWith('sutun'))) {
          updated.key = slugifyKey(val);
        }
        return updated;
      })
    );
  };

  const handleExtractFromExcel = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const res = await templateApi.extractFromExcel(file);
      const draft = res.data;
      if (draft) {
        if (!code && draft.suggestedCode) setCode(draft.suggestedCode);
        if (!title && draft.suggestedTitle) setTitle(draft.suggestedTitle);
        if (draft.dataStartRow) setDataStartRow(draft.dataStartRow);
        if (Array.isArray(draft.columns) && draft.columns.length > 0) {
          setColumns(
            draft.columns.map((c) => ({
              key: c.key || slugifyKey(c.label),
              label: c.label || c.key,
              type: c.type || 'text',
              required: !!c.required,
              min: c.min ?? '',
              max: c.max ?? '',
              optionsText: Array.isArray(c.options) ? c.options.join(', ') : ''
            }))
          );
        }
        setStatusMsg(
          `Excel dosyasından (${file.name}) toplam ${draft.columns?.length || 0} sütun otomatik algılandı!`
        );
      }
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message || err.message || 'Excel şeması çıkarılamadı.'
      );
    }
  };

  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);

    const cleanCode = code
      .toUpperCase()
      .replace(/[^A-Z0-9_]/g, '_')
      .trim();

    if (!cleanCode || !title.trim()) {
      setErrorMsg('Şablon kodu ve tablo başlığı zorunludur.');
      return;
    }

    const formattedColumns = columns.map((c, idx) => {
      const colObj = {
        key: (c.key || slugifyKey(c.label)).trim(),
        label: c.label.trim(),
        type: c.type,
        required: !!c.required,
        order: idx + 1
      };
      if (c.min !== '' && c.min !== null && c.min !== undefined) {
        colObj.min = Number(c.min);
      }
      if (c.max !== '' && c.max !== null && c.max !== undefined) {
        colObj.max = Number(c.max);
      }
      if ((c.type === 'select' || c.type === 'multiselect') && c.optionsText) {
        colObj.options = c.optionsText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }
      return colObj;
    });

    setIsSaving(true);
    try {
      const payload = {
        code: cleanCode,
        title: title.trim(),
        category: category.trim() || 'Özel Dinamik Şablonlar',
        type,
        description: description.trim(),
        dataStartRow: Number(dataStartRow) || 2,
        columns: formattedColumns
      };

      if (editingCode) {
        await templateApi.updateTemplate(editingCode, payload);
        setStatusMsg(`"${title}" (${editingCode}) şablonu başarıyla güncellendi!`);
      } else {
        await templateApi.createTemplate(payload);
        setStatusMsg(`"${title}" (${cleanCode}) dinamik tablosu başarıyla oluşturuldu!`);
      }

      if (onRefreshTemplates) {
        await onRefreshTemplates();
      }
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message || err.message || 'Şablon kaydedilirken hata oluştu.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTemplate = async (tplCode) => {
    if (!window.confirm(`${tplCode} kodlu özel şablonu devre dışı bırakmak istediğinize emin misiniz?`)) {
      return;
    }
    try {
      await templateApi.deleteTemplate(tplCode);
      setStatusMsg(`${tplCode} şablonu kaldırıldı.`);
      if (onRefreshTemplates) await onRefreshTemplates();
      if (editingCode === tplCode) resetForm();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Şablon silinemedi.');
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-md">
            <Layers size={24} />
          </div>
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight">
              Dinamik Tablo ve Şablon Oluşturucu (Admin Builder)
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Yeni veri izleme tabloları tanımlayın, örnek Excel yükleyerek sütunları otomatik çıkarın veya mevcut şablonlara yeni sütunlar/kurallar ekleyin.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <label className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase cursor-pointer flex items-center gap-2 transition-all shadow-sm">
            <Upload size={15} />
            Örnek Excel&apos;den Sütunları Çıkar
            <input
              type="file"
              accept=".xlsx,.xlsm"
              onChange={handleExtractFromExcel}
              className="hidden"
            />
          </label>
          {editingCode && (
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold"
            >
              + Yeni Şablon Formu
            </button>
          )}
        </div>
      </div>

      {statusMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2.5">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-300 text-red-800 text-xs font-bold flex items-center gap-2.5">
          <AlertCircle size={18} className="text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Builder Form */}
      <form
        onSubmit={handleSaveTemplate}
        className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h3 className="text-sm font-black uppercase text-slate-900">
            {editingCode
              ? `Şablon Düzenle: ${title} (${editingCode})`
              : 'Yeni Dinamik Veri Tablosu Oluştur'}
          </h3>
          <span className="text-xs font-bold text-blue-600">
            {columns.length} Sütun Tanımlı
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">
              Şablon Kodu (Benzersiz) *
            </label>
            <input
              type="text"
              disabled={!!editingCode}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Örn: ARGE_YAYINLAR_2026"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-black uppercase text-slate-800 outline-none focus:border-blue-600 disabled:bg-slate-100"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-bold text-slate-600 block mb-1">
              Tablo Başlığı *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!editingCode && !code) {
                  setCode(
                    slugifyKey(e.target.value)
                      .toUpperCase()
                      .replace(/[^A-Z0-9]/g, '_')
                  );
                }
              }}
              placeholder="Örn: Uluslararası Ar-Ge Yayınları İzleme Tablosu"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-600"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">
              Menü Kategorisi *
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Özel Dinamik Şablonlar"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-600"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="text-xs font-bold text-slate-600 block mb-1">
              Tablo Açıklaması / Yönergesi
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Veri giriş sorumluları için açıklama..."
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">
              Tablo Tipi
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-600"
            >
              <option value="DYNAMIC">Dinamik Satırlı Tablo (DYNAMIC)</option>
              <option value="FIXED">Sabit Satırlı Matris (FIXED)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">
              Excel Veri Başlangıç Satırı
            </label>
            <input
              type="number"
              min="1"
              value={dataStartRow}
              onChange={(e) => setDataStartRow(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-600"
            />
          </div>
        </div>

        {/* Columns Editor */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase text-slate-700">
              Tablo Sütunları ve Doğrulama Kuralları
            </h4>
            <button
              type="button"
              onClick={handleAddColumn}
              className="px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white text-xs font-black uppercase flex items-center gap-1.5 transition-all"
            >
              <Plus size={14} />
              Yeni Sütun Ekle
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="p-2.5 border-b border-slate-200 font-black w-10">#</th>
                  <th className="p-2.5 border-b border-slate-200 font-black">Sütun Başlığı (Label) *</th>
                  <th className="p-2.5 border-b border-slate-200 font-black">Alan Anahtarı (Key) *</th>
                  <th className="p-2.5 border-b border-slate-200 font-black">Veri Tipi *</th>
                  <th className="p-2.5 border-b border-slate-200 font-black text-center">Zorunlu</th>
                  <th className="p-2.5 border-b border-slate-200 font-black w-24">Min</th>
                  <th className="p-2.5 border-b border-slate-200 font-black w-24">Max</th>
                  <th className="p-2.5 border-b border-slate-200 font-black min-w-[220px]">
                    Seçenekler (Virgülle Ayrılmış)
                  </th>
                  <th className="p-2.5 border-b border-slate-200 font-black text-center w-12">Sil</th>
                </tr>
              </thead>
              <tbody>
                {columns.map((col, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/80">
                    <td className="p-2 text-center font-bold text-slate-400">{idx + 1}</td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={col.label}
                        onChange={(e) => handleColChange(idx, 'label', e.target.value)}
                        placeholder="Sütun adı..."
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-bold"
                        required
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={col.key}
                        onChange={(e) => handleColChange(idx, 'key', e.target.value)}
                        placeholder="alanAnahtari"
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-mono"
                        required
                      />
                    </td>
                    <td className="p-2">
                      <select
                        value={col.type}
                        onChange={(e) => handleColChange(idx, 'type', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-semibold"
                      >
                        {COLUMN_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2 text-center">
                      <input
                        type="checkbox"
                        checked={!!col.required}
                        onChange={(e) => handleColChange(idx, 'required', e.target.checked)}
                        className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                      />
                    </td>
                    <td className="p-2">
                      {(col.type === 'integer' || col.type === 'decimal') && (
                        <input
                          type="number"
                          value={col.min}
                          onChange={(e) => handleColChange(idx, 'min', e.target.value)}
                          placeholder="Min"
                          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                        />
                      )}
                    </td>
                    <td className="p-2">
                      {(col.type === 'integer' || col.type === 'decimal') && (
                        <input
                          type="number"
                          value={col.max}
                          onChange={(e) => handleColChange(idx, 'max', e.target.value)}
                          placeholder="Max"
                          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                        />
                      )}
                    </td>
                    <td className="p-2">
                      {(col.type === 'select' || col.type === 'multiselect') && (
                        <input
                          type="text"
                          value={col.optionsText}
                          onChange={(e) => handleColChange(idx, 'optionsText', e.target.value)}
                          placeholder="Seçenek 1, Seçenek 2, Seçenek 3"
                          className="w-full rounded-lg border border-blue-300 bg-blue-50/30 px-2.5 py-1.5 text-xs font-medium"
                        />
                      )}
                    </td>
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveColumn(idx)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all"
          >
            <Save size={16} />
            {isSaving
              ? 'Kaydediliyor...'
              : editingCode
              ? 'Şablon Değişikliklerini Kaydet'
              : 'Yeni Dinamik Şablonu Oluştur'}
          </button>
        </div>
      </form>

      {/* Existing Templates Catalog */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-black uppercase text-slate-900">
          Kayıtlı Veri Şablonları Kataloğu ({templates.length} Tablo)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {templates.map((tpl) => (
            <div
              key={tpl.code}
              className="p-4 rounded-2xl border border-slate-200 hover:border-blue-400 transition-all flex flex-col justify-between gap-3 bg-slate-50/40"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-mono text-[10px] font-bold">
                    {tpl.code}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      tpl.isOfficialYOK
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}
                  >
                    {tpl.isOfficialYOK ? 'Resmi YÖK' : 'Kurumsal / Özel'} • {tpl.type}
                  </span>
                </div>
                <h4 className="text-xs font-black text-slate-900">{tpl.title}</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {tpl.category} • {tpl.columns?.length || 0} Sütun
                </p>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/80">
                <button
                  type="button"
                  onClick={() => handleLoadForEdit(tpl)}
                  className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                >
                  <Edit3 size={13} />
                  Şemayı Düzenle
                </button>
                <div className="flex items-center gap-2">
                  {!tpl.isOfficialYOK && (
                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(tpl.code)}
                      className="text-xs font-bold text-red-600 hover:underline"
                    >
                      Sil
                    </button>
                  )}
                  {onSelectTemplateToView && (
                    <button
                      type="button"
                      onClick={() => onSelectTemplateToView(tpl.code)}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[10px] font-bold flex items-center gap-1 hover:bg-blue-600 transition-colors"
                    >
                      Tabloyu Aç <ArrowRight size={11} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

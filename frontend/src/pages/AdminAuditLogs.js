import React, { useState, useEffect } from 'react';
import { Activity, Search, RefreshCw } from 'lucide-react';
import { auditApi } from '../services/api';

export default function AdminAuditLogs({ templates = [] }) {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [actionFilter, setActionFilter] = useState('');
  const [templateFilter, setTemplateFilter] = useState('');
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await auditApi.getLogs({
        limit: 50,
        action: actionFilter || undefined,
        templateCode: templateFilter || undefined,
        search: search.trim() || undefined
      });
      setLogs(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      // Ignore error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, templateFilter]);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center">
            <Activity size={24} />
          </div>
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight">
              Sistem Denetim Kayıtları (Audit Trail)
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Veri girişleri, güncellemeler, 1:1 Excel içe/dışa aktarımları, onay durum geçişleri ve yetki değişiklikleri.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchLogs}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-2"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          Yenile ({total})
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
              placeholder="Kullanıcı e-postası, ad soyad veya tablo koduna göre ara..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs font-medium outline-none focus:border-blue-600"
            />
          </div>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold"
          >
            <option value="">Tüm İşlem Türleri</option>
            <option value="LOGIN">Giriş (LOGIN)</option>
            <option value="CREATE">Kayıt Ekleme (CREATE)</option>
            <option value="UPDATE">Güncelleme (UPDATE)</option>
            <option value="DELETE">Silme (DELETE)</option>
            <option value="SUBMIT">Onaya Gönderim (SUBMIT)</option>
            <option value="APPROVE">Onaylama (APPROVE)</option>
            <option value="REVISE">Revizyon Talebi (REVISE)</option>
            <option value="IMPORT">Excel İçe Aktar (IMPORT)</option>
            <option value="EXPORT">Excel Dışa Aktar (EXPORT)</option>
            <option value="PERMISSION_CHANGE">Yetki Değişikliği (PERMISSION_CHANGE)</option>
          </select>

          <select
            value={templateFilter}
            onChange={(e) => setTemplateFilter(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold"
          >
            <option value="">Tüm Şablonlar</option>
            {templates.map((t) => (
              <option key={t.code} value={t.code}>
                {t.code} - {t.title}
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 max-h-[65vh] custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-100 text-slate-700 sticky top-0">
              <tr>
                <th className="p-3 border-b border-slate-200 font-black">Tarih / Saat</th>
                <th className="p-3 border-b border-slate-200 font-black">Kullanıcı</th>
                <th className="p-3 border-b border-slate-200 font-black">Eylem</th>
                <th className="p-3 border-b border-slate-200 font-black">Hedef Türü</th>
                <th className="p-3 border-b border-slate-200 font-black">Şablon</th>
                <th className="p-3 border-b border-slate-200 font-black">Birim</th>
                <th className="p-3 border-b border-slate-200 font-black">Detay</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                    Eşleşen denetim kaydı bulunamadı.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3 whitespace-nowrap font-mono text-[11px] text-slate-500">
                      {log.timestamp
                        ? new Date(log.timestamp).toLocaleString('tr-TR')
                        : '-'}
                    </td>
                    <td className="p-3 font-bold text-slate-800">
                      {log.userName || log.userEmail || log.userId?.email || 'Sistem'}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-black text-[10px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-slate-600">{log.entityType}</td>
                    <td className="p-3 font-mono font-bold text-indigo-700">
                      {log.templateCode || '-'}
                    </td>
                    <td className="p-3 text-slate-600">
                      {log.departmentId?.name || log.period || '-'}
                    </td>
                    <td className="p-3 font-mono text-[11px] text-slate-500 max-w-xs truncate">
                      {log.changes ? JSON.stringify(log.changes) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  ArrowRight
} from 'lucide-react';
import { periodApi, workflowApi } from '../services/api';

export default function AdminWorkflowPeriods({
  periods = [],
  activePeriod,
  templates = [],
  departments = [],
  onRefreshPeriods,
  onNavigateToTable
}) {
  const [deadlines, setDeadlines] = useState([]);
  const [workflowSummary, setWorkflowSummary] = useState({
    total: 0,
    draft: 0,
    submitted: 0,
    approved: 0,
    revisionRequested: 0
  });
  const [pendingReviews, setPendingReviews] = useState([]);
  const [statusMsg, setStatusMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Create Period Form
  const [newPeriodForm, setNewPeriodForm] = useState({
    name: '2026-2027',
    startDate: '2026-09-01',
    endDate: '2027-08-31',
    defaultDeadline: '2027-06-30',
    description: '2026-2027 Akademik Yılı İzleme Dönemi'
  });

  // Set Deadline Form
  const [deadlineForm, setDeadlineForm] = useState({
    templateCode: 'ENERJI',
    departmentId: '',
    deadline: '2026-12-31',
    remarks: ''
  });

  const loadPeriodDetails = async (targetPeriod) => {
    if (!targetPeriod) return;
    try {
      const [dlRes, wfRes] = await Promise.all([
        periodApi.getDeadlines(targetPeriod),
        workflowApi.getSummary(targetPeriod)
      ]);
      setDeadlines(dlRes.data || []);
      if (wfRes.summary) setWorkflowSummary(wfRes.summary);
      setPendingReviews(wfRes.pendingReviews || []);
    } catch (err) {
      // Ignore non-fatal load error
    }
  };

  useEffect(() => {
    loadPeriodDetails(activePeriod);
  }, [activePeriod]);

  const handleSetActivePeriod = async (id) => {
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      await periodApi.setActivePeriod(id);
      setStatusMsg('Aktif raporlama dönemi değiştirildi.');
      if (onRefreshPeriods) await onRefreshPeriods();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Dönem güncellenemedi.');
    }
  };

  const handleCreatePeriod = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      await periodApi.createPeriod(newPeriodForm);
      setStatusMsg(`"${newPeriodForm.name}" dönemi başarıyla eklendi.`);
      if (onRefreshPeriods) await onRefreshPeriods();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Dönem oluşturulamadı.');
    }
  };

  const handleSaveDeadline = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      await periodApi.setDeadline(activePeriod, {
        templateCode: deadlineForm.templateCode,
        departmentId: deadlineForm.departmentId || null,
        deadline: deadlineForm.deadline,
        remarks: deadlineForm.remarks
      });
      setStatusMsg(`${deadlineForm.templateCode} tablosu için son teslim tarihi kaydedildi.`);
      await loadPeriodDetails(activePeriod);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Teslim tarihi kaydedilemedi.');
    }
  };

  const handleDeleteDeadline = async (id) => {
    try {
      await periodApi.deleteDeadline(activePeriod, id);
      await loadPeriodDetails(activePeriod);
    } catch (err) {
      setErrorMsg('Son tarih silinemedi.');
    }
  };

  const handleQuickReview = async (revItem, action) => {
    let note = 'Onaylandı.';
    if (action === 'REVISE') {
      note = window.prompt('Lütfen revizyon gerekçesini giriniz (en az 3 karakter):', 'Verilerde eksik/hatalı alanlar mevcuttur, lütfen kontrol ediniz.');
      if (!note || note.trim().length < 3) return;
    }
    try {
      await workflowApi.review(
        revItem.templateCode,
        revItem.departmentId,
        revItem.period,
        action,
        note
      );
      setStatusMsg(`${revItem.templateCode} (${revItem.departmentName}) tablosu için ${action} işlemi uygulandı.`);
      await loadPeriodDetails(activePeriod);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Onay işlemi başarısız.');
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center">
            <Calendar size={24} />
          </div>
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight">
              Dönem, Son Tarih ve Onay İş Akışı Merkezi
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Akademik raporlama dönemlerini ({activePeriod}), tablo bazlı teslim tarihlerini ve birimlerden gelen onay taleplerini yönetin.
            </p>
          </div>
        </div>
      </div>

      {statusMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-300 text-red-800 text-xs font-bold flex items-center gap-2">
          <AlertTriangle size={18} className="text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Workflow Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-black uppercase text-slate-400 block">
            Taslak Tablolar (DRAFT)
          </span>
          <span className="text-3xl font-black text-slate-800 mt-1 block">
            {workflowSummary.draft}
          </span>
        </div>
        <div className="bg-amber-50 p-5 rounded-3xl border border-amber-200 shadow-sm">
          <span className="text-[10px] font-black uppercase text-amber-700 block">
            Onay Bekleyen (SUBMITTED)
          </span>
          <span className="text-3xl font-black text-amber-800 mt-1 block">
            {workflowSummary.submitted}
          </span>
        </div>
        <div className="bg-emerald-50 p-5 rounded-3xl border border-emerald-200 shadow-sm">
          <span className="text-[10px] font-black uppercase text-emerald-700 block">
            Onaylanan (APPROVED)
          </span>
          <span className="text-3xl font-black text-emerald-800 mt-1 block">
            {workflowSummary.approved}
          </span>
        </div>
        <div className="bg-rose-50 p-5 rounded-3xl border border-rose-200 shadow-sm">
          <span className="text-[10px] font-black uppercase text-rose-700 block">
            Revizyon İstenen (REVISION)
          </span>
          <span className="text-3xl font-black text-rose-800 mt-1 block">
            {workflowSummary.revisionRequested}
          </span>
        </div>
      </div>

      {/* Pending Reviews Table */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-black uppercase text-slate-900">
          Onay Bekleyen Birim Tabloları ({pendingReviews.length})
        </h3>
        {pendingReviews.length === 0 ? (
          <p className="text-xs text-slate-400 italic">
            Şu anda onay bekleyen (SUBMITTED) tablo bulunmamaktadır.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="p-3 border-b border-slate-200 font-black">Tablo Kodu</th>
                  <th className="p-3 border-b border-slate-200 font-black">Birim</th>
                  <th className="p-3 border-b border-slate-200 font-black">Dönem</th>
                  <th className="p-3 border-b border-slate-200 font-black">Gönderen</th>
                  <th className="p-3 border-b border-slate-200 font-black">Gönderim Zamanı</th>
                  <th className="p-3 border-b border-slate-200 font-black text-right">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {pendingReviews.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3 font-black text-blue-700">{item.templateCode}</td>
                    <td className="p-3 font-bold text-slate-800">{item.departmentName}</td>
                    <td className="p-3 font-semibold text-slate-600">{item.period}</td>
                    <td className="p-3 text-slate-600">{item.submittedByName || '-'}</td>
                    <td className="p-3 text-slate-500">
                      {item.submittedAt
                        ? new Date(item.submittedAt).toLocaleString('tr-TR')
                        : '-'}
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => handleQuickReview(item, 'APPROVE')}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[10px]"
                      >
                        Onayla
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickReview(item, 'REVISE')}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black uppercase text-[10px]"
                      >
                        Revizyon İste
                      </button>
                      {onNavigateToTable && (
                        <button
                          type="button"
                          onClick={() =>
                            onNavigateToTable(item.templateCode, item.departmentId)
                          }
                          className="px-3 py-1.5 rounded-xl bg-slate-900 text-white font-bold text-[10px] inline-flex items-center gap-1"
                        >
                          İncele <ArrowRight size={11} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Two Column Grid: Period Management & Per-Table Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Periods */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-black uppercase text-slate-900">
            Akademik Raporlama Dönemleri
          </h3>

          <div className="space-y-2">
            {periods.map((p) => (
              <div
                key={p._id || p.name}
                className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                  p.isActive
                    ? 'bg-blue-50 border-blue-300'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div>
                  <span className="text-xs font-black text-slate-900">{p.name}</span>
                  {p.isActive && (
                    <span className="ml-2 px-2 py-0.5 rounded bg-blue-600 text-white text-[10px] font-black uppercase">
                      AKTİF DÖNEM
                    </span>
                  )}
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Varsayılan Son Tarih:{' '}
                    {p.defaultDeadline
                      ? new Date(p.defaultDeadline).toLocaleDateString('tr-TR')
                      : '-'}
                  </p>
                </div>
                {!p.isActive && p._id && (
                  <button
                    type="button"
                    onClick={() => handleSetActivePeriod(p._id)}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-blue-600 text-white text-xs font-bold transition-colors"
                  >
                    Aktif Yap
                  </button>
                )}
              </div>
            ))}
          </div>

          <form
            onSubmit={handleCreatePeriod}
            className="pt-4 border-t border-slate-100 space-y-3"
          >
            <h4 className="text-xs font-black uppercase text-slate-700">
              Yeni Raporlama Dönemi Ekle
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Dönem Adı *
                </label>
                <input
                  type="text"
                  value={newPeriodForm.name}
                  onChange={(e) =>
                    setNewPeriodForm({ ...newPeriodForm, name: e.target.value })
                  }
                  placeholder="2026-2027"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Varsayılan Son Teslim *
                </label>
                <input
                  type="date"
                  value={newPeriodForm.defaultDeadline}
                  onChange={(e) =>
                    setNewPeriodForm({
                      ...newPeriodForm,
                      defaultDeadline: e.target.value
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Başlangıç Tarihi *
                </label>
                <input
                  type="date"
                  value={newPeriodForm.startDate}
                  onChange={(e) =>
                    setNewPeriodForm({ ...newPeriodForm, startDate: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Bitiş Tarihi *
                </label>
                <input
                  type="date"
                  value={newPeriodForm.endDate}
                  onChange={(e) =>
                    setNewPeriodForm({ ...newPeriodForm, endDate: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase flex items-center gap-1.5"
            >
              <Plus size={14} /> Dönem Oluştur
            </button>
          </form>
        </div>

        {/* 2. Per-Table Deadlines */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-black uppercase text-slate-900 flex items-center gap-2">
            <Clock size={16} className="text-amber-600" />
            Tablo ve Birim Bazlı Özel Son Teslim Tarihleri ({activePeriod})
          </h3>

          <form onSubmit={handleSaveDeadline} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Tablo Şablonu *
                </label>
                <select
                  value={deadlineForm.templateCode}
                  onChange={(e) =>
                    setDeadlineForm({ ...deadlineForm, templateCode: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold"
                >
                  {templates.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.code} - {t.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Birim (Boş = Tüm Birimler)
                </label>
                <select
                  value={deadlineForm.departmentId}
                  onChange={(e) =>
                    setDeadlineForm({ ...deadlineForm, departmentId: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold"
                >
                  <option value="">Tüm Üniversite Birimleri</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Son Teslim Tarihi *
                </label>
                <input
                  type="date"
                  value={deadlineForm.deadline}
                  onChange={(e) =>
                    setDeadlineForm({ ...deadlineForm, deadline: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Açıklama / Not
                </label>
                <input
                  type="text"
                  value={deadlineForm.remarks}
                  onChange={(e) =>
                    setDeadlineForm({ ...deadlineForm, remarks: e.target.value })
                  }
                  placeholder="Ek süre / YÖK teslim tarihi"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                />
              </div>
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black uppercase flex items-center gap-1.5"
            >
              <Plus size={14} /> Özel Son Tarih Ata
            </button>
          </form>

          <div className="space-y-2 pt-2">
            {deadlines.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                Bu dönem için tanımlanmış özel tablo son tarihi yok (dönem varsayılanı geçerlidir).
              </p>
            ) : (
              deadlines.map((dl) => (
                <div
                  key={dl._id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-black text-slate-900">{dl.templateCode}</span>
                    <span className="text-slate-500 ml-2">
                      ({dl.departmentId?.name || 'Tüm Birimler'})
                    </span>
                    <span className="ml-2 font-bold text-amber-700">
                      &rarr; {new Date(dl.deadline).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteDeadline(dl._id)}
                    className="text-slate-400 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

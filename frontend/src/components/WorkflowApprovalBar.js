import React, { useState } from 'react';
import {
  Send,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Lock,
  Unlock,
  Download,
  Upload,
  FileSpreadsheet,
  History,
  X,
  MessageSquare
} from 'lucide-react';

const STATUS_META = {
  DRAFT: {
    label: 'TASLAK',
    bg: 'bg-slate-100 text-slate-700 border-slate-300',
    dot: 'bg-slate-500'
  },
  SUBMITTED: {
    label: 'ONAYA GÖNDERİLDİ',
    bg: 'bg-amber-50 text-amber-800 border-amber-300',
    dot: 'bg-amber-500'
  },
  APPROVED: {
    label: 'ONAYLANDI (KİLİTLİ)',
    bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    dot: 'bg-emerald-600'
  },
  REVISION_REQUESTED: {
    label: 'REVİZYON İSTENİYOR',
    bg: 'bg-rose-50 text-rose-800 border-rose-300',
    dot: 'bg-rose-600'
  }
};

export default function WorkflowApprovalBar({
  template,
  workflow,
  deadline,
  user,
  permissions,
  onSubmitWorkflow,
  onReviewWorkflow,
  onExportTemplate,
  onExportClean,
  onDownloadBlank,
  onOpenImportModal
}) {
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewAction, setReviewAction] = useState('APPROVE');
  const [reviewNote, setReviewNote] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const status = workflow?.status || 'DRAFT';
  const meta = STATUS_META[status] || STATUS_META.DRAFT;

  const isMacro =
    template?.excelTemplatePath?.endsWith('.xlsm') ||
    template?.code === 'MYO_UYGULAMALI_EGITIM' ||
    template?.code === 'PROJELER';

  const effectiveDeadlineDate = deadline?.deadline || workflow?.deadline;
  const isDeadlinePassed =
    deadline?.isOpen === false || workflow?.isDeadlinePassed === true;

  const canSubmit =
    (status === 'DRAFT' || status === 'REVISION_REQUESTED') &&
    (user?.role === 'ADMIN' || permissions?.canCreate || permissions?.canUpdate) &&
    (!isDeadlinePassed || user?.role === 'ADMIN');

  const canApprove =
    user?.role === 'ADMIN' ||
    user?.role === 'REVIEWER' ||
    permissions?.canApprove;

  const handleTriggerSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmitWorkflow();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReview = async (e) => {
    e.preventDefault();
    if (reviewAction === 'REVISE' && (!reviewNote || reviewNote.trim().length < 3)) {
      setReviewError('Revizyon talebi için en az 3 karakterlik açıklama girilmesi zorunludur.');
      return;
    }
    setReviewError('');
    setIsSubmitting(true);
    try {
      await onReviewWorkflow(reviewAction, reviewNote);
      setShowReviewModal(false);
      setReviewNote('');
    } catch (err) {
      setReviewError(err.response?.data?.message || err.message || 'İşlem başarısız');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Status Badge + Deadline + Lock status */}
        <div className="flex flex-wrap items-center gap-2.5">
          <span
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black border ${meta.bg}`}
          >
            <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
            DURUM: {meta.label}
          </span>

          {status === 'APPROVED' || status === 'SUBMITTED' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">
              <Lock size={13} className="text-slate-600" />
              Veri Girişi Kilitli
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold">
              <Unlock size={13} />
              Düzenlenebilir
            </span>
          )}

          {effectiveDeadlineDate && (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border ${
                isDeadlinePassed
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              <Clock size={13} />
              Son Tarih:{' '}
              {new Date(effectiveDeadlineDate).toLocaleDateString('tr-TR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              })}
              {isDeadlinePassed && ' (SÜRE DOLDU)'}
            </span>
          )}

          {workflow?.history?.length > 0 && (
            <button
              type="button"
              onClick={() => setShowHistoryModal(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
            >
              <History size={13} />
              Onay Geçmişi ({workflow.history.length})
            </button>
          )}
        </div>

        {/* Right: Excel 1:1 Export / Import & Workflow Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 1:1 Official Template Export */}
          {(user?.role === 'ADMIN' || permissions?.canExport !== false) && (
            <>
              <button
                type="button"
                onClick={onExportTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-tight transition-all shadow-sm"
                title="Orijinal YÖK formüllerini, Referans Değerler sayfalarını ve VBA makrolarını koruyarak indir"
              >
                <Download size={14} />
                1:1 YÖK Şablonu İndir ({isMacro ? '.xlsm' : '.xlsx'})
              </button>

              <button
                type="button"
                onClick={onExportClean}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-all"
              >
                <FileSpreadsheet size={14} />
                Standart Excel
              </button>

              <button
                type="button"
                onClick={onDownloadBlank}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
              >
                Boş Şablon
              </button>
            </>
          )}

          {/* Validated Excel Import */}
          {(user?.role === 'ADMIN' || permissions?.canImport) &&
            (status === 'DRAFT' || status === 'REVISION_REQUESTED' || user?.role === 'ADMIN') && (
              <button
                type="button"
                onClick={onOpenImportModal}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 text-xs font-black uppercase transition-all"
              >
                <Upload size={14} />
                Excel&apos;den Yükle
              </button>
            )}

          {/* Submit for Approval */}
          {canSubmit && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleTriggerSubmit}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black uppercase transition-all shadow-sm"
            >
              <Send size={14} />
              Onaya Gönder
            </button>
          )}

          {/* Reviewer / Admin Approval Modal Trigger */}
          {canApprove && (
            <button
              type="button"
              onClick={() => {
                setReviewAction(status === 'APPROVED' ? 'REOPEN' : 'APPROVE');
                setShowReviewModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase transition-all shadow-sm"
            >
              <CheckCircle2 size={14} />
              Onay / Revizyon İşlemi
            </button>
          )}
        </div>
      </div>

      {/* Reviewer Feedback / Revision Notes Banner */}
      {workflow?.reviewNotes && (
        <div
          className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
            status === 'REVISION_REQUESTED'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-blue-50 border-blue-200 text-blue-900'
          }`}
        >
          <MessageSquare size={16} className="shrink-0 mt-0.5" />
          <div>
            <span className="font-black uppercase mr-1.5">
              {status === 'REVISION_REQUESTED'
                ? 'Revizyon Gerekçesi / Yönetici Notu:'
                : 'İnceleme / Onay Notu:'}
            </span>
            <span className="font-medium">{workflow.reviewNotes}</span>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 uppercase">
                Tablo İnceleme ve Onay Kararı
              </h3>
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmReview} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500 block">
                  İşlem Seçiniz
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewAction('APPROVE')}
                    className={`p-3 rounded-xl border text-xs font-black uppercase flex items-center justify-center gap-1.5 transition-all ${
                      reviewAction === 'APPROVE'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50'
                    }`}
                  >
                    <CheckCircle2 size={15} />
                    Onayla (Kilitle)
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewAction('REVISE')}
                    className={`p-3 rounded-xl border text-xs font-black uppercase flex items-center justify-center gap-1.5 transition-all ${
                      reviewAction === 'REVISE'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-md'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-rose-50'
                    }`}
                  >
                    <AlertTriangle size={15} />
                    Revizyon İste
                  </button>
                </div>
                {user?.role === 'ADMIN' && status === 'APPROVED' && (
                  <button
                    type="button"
                    onClick={() => setReviewAction('REOPEN')}
                    className={`w-full p-2.5 rounded-xl border text-xs font-black uppercase flex items-center justify-center gap-1.5 transition-all ${
                      reviewAction === 'REOPEN'
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <Unlock size={14} />
                    Onay Kilidini Aç (Yeniden Düzenlemeye Aç)
                  </button>
                )}
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-500 block mb-1">
                  İnceleme / Revizyon Notu{' '}
                  {reviewAction === 'REVISE' && <span className="text-red-600">* (Zorunlu)</span>}
                </label>
                <textarea
                  rows={3}
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder={
                    reviewAction === 'REVISE'
                      ? 'Lütfen düzeltilmesi gereken satırları ve revizyon nedenini açıklayınız...'
                      : 'İsteğe bağlı onay notu...'
                  }
                  className="w-full rounded-xl border border-slate-300 p-3 text-xs font-medium outline-none focus:border-blue-600"
                />
              </div>

              {reviewError && (
                <p className="text-xs font-bold text-red-600 bg-red-50 p-2.5 rounded-xl">
                  {reviewError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase"
                >
                  Kararı Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 uppercase">
                İş Akışı ve Onay Geçmişi
              </h3>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto space-y-2.5 flex-1 pr-1 custom-scrollbar">
              {(workflow?.history || []).map((item, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between font-bold text-slate-800">
                    <span>
                      {item.fromStatus} &rarr; {item.toStatus} ({item.action})
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {item.timestamp
                        ? new Date(item.timestamp).toLocaleString('tr-TR')
                        : ''}
                    </span>
                  </div>
                  <p className="text-slate-600">
                    <strong>İşlemi Yapan:</strong> {item.performedByName || item.performedByEmail || 'Kullanıcı'}
                  </p>
                  {item.notes && (
                    <p className="text-slate-700 italic bg-white p-2 rounded-lg border border-slate-100">
                      &ldquo;{item.notes}&rdquo;
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

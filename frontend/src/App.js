import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  LayoutDashboard,
  X,
  LogOut,
  FileSpreadsheet,
  Settings,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Building2,
  Calendar,
  Shield,
  Layers,
  Activity,
  CheckCircle2,
  AlertCircle,
  Search,
  Sparkles,
  Lock,
  Menu
} from 'lucide-react';
import otuLogo from './assets/otun-logo.png';
import {
  authApi,
  departmentApi,
  periodApi,
  templateApi,
  recordApi,
  excelApi,
  workflowApi
} from './services/api';
import WorkflowApprovalBar from './components/WorkflowApprovalBar';
import FixedMatrixView from './components/FixedMatrixView';
import DynamicGridView from './components/DynamicGridView';
import ExcelImportModal from './components/ExcelImportModal';
import AdminDynamicBuilder from './pages/AdminDynamicBuilder';
import AdminUsersRBAC from './pages/AdminUsersRBAC';
import AdminWorkflowPeriods from './pages/AdminWorkflowPeriods';
import AdminAuditLogs from './pages/AdminAuditLogs';

const DEMO_ACCOUNTS = [
  {
    label: 'Sistem Yöneticisi (Admin)',
    email: 'admin@ostimteknik.edu.tr',
    password: 'Admin123!',
    badge: 'ADMIN • Tüm Yetkiler'
  },
  {
    label: 'Mühendislik Fakültesi Dekanı',
    email: 'dekan.muhendislik@ostimteknik.edu.tr',
    password: 'Dekan123!',
    badge: 'REVIEWER • Fakülte Onay'
  },
  {
    label: 'Bilgisayar Müh. Sorumlusu',
    email: 'ceng@ostimteknik.edu.tr',
    password: 'Ceng123!',
    badge: 'DEPT_USER • Bilgisayar Müh.'
  },
  {
    label: 'Yazılım Müh. Sorumlusu',
    email: 'seng@ostimteknik.edu.tr',
    password: 'Seng123!',
    badge: 'DEPT_USER • Yazılım Müh.'
  },
  {
    label: 'Mühendislik Koordinatörü',
    email: 'muhendislik.koordinator@ostimteknik.edu.tr',
    password: 'Koord123!',
    badge: 'CUSTOM • Bilgisayar + Yazılım Müh.'
  },
  {
    label: 'Strateji Geliştirme Daire Bşk.',
    email: 'strateji@ostimteknik.edu.tr',
    password: 'Strateji123!',
    badge: 'REVIEWER • Üniversite Geneli'
  }
];

function App() {
  // Authentication State
  const [user, setUser] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [loginData, setLoginData] = useState({
    identifier: 'admin@ostimteknik.edu.tr',
    password: 'Admin123!'
  });
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Navigation & Global Selectors State
  const [activeView, setActiveView] = useState('DASHBOARD'); // 'DASHBOARD' | 'TABLE' | 'ADMIN_USERS' | 'ADMIN_BUILDER' | 'ADMIN_WORKFLOW' | 'ADMIN_AUDIT'
  const [activeTemplateCode, setActiveTemplateCode] = useState(null);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({
    YOK_24: true,
    UAM: false,
    EYLEM: false,
    DIGER_KURUMSAL: false,
    CUSTOM: true,
    ADMIN: true
  });

  // Master Catalogs
  const [departments, setDepartments] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('2025-2026');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [templates, setTemplates] = useState([]);
  const [workflowSummary, setWorkflowSummary] = useState(null);

  // Active Table Data State
  const [currentTemplate, setCurrentTemplate] = useState(null);
  const [tableRows, setTableRows] = useState([]);
  const [tableWorkflow, setTableWorkflow] = useState({ status: 'DRAFT', history: [] });
  const [tableDeadline, setTableDeadline] = useState(null);
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [isSavingRows, setIsSavingRows] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Notification Toast & Settings Modal
  const [toast, setToast] = useState(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const notify = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 5000);
  }, []);

  // Resolve Accessible Departments for Current User
  const accessibleDepartments = useMemo(() => {
    if (!user || departments.length === 0) return [];
    if (
      user.role === 'ADMIN' ||
      user.departmentScope?.type === 'ALL' ||
      user.departmentScope === 'ALL'
    ) {
      return departments;
    }

    const rootIds = new Set();
    const primaryId = user.departmentId?._id || user.departmentId;
    if (primaryId) rootIds.add(String(primaryId));

    if (
      user.departmentScope?.type === 'CUSTOM' &&
      Array.isArray(user.departmentScope?.departments)
    ) {
      user.departmentScope.departments.forEach((d) => {
        const id = typeof d === 'object' ? d._id : d;
        if (id) rootIds.add(String(id));
      });
    }

    return departments.filter((dept) => {
      const dId = String(dept._id);
      if (rootIds.has(dId)) return true;
      const ancestors = Array.isArray(dept.ancestors)
        ? dept.ancestors.map((a) => String(typeof a === 'object' ? a._id : a))
        : [];
      return ancestors.some((ancId) => rootIds.has(ancId));
    });
  }, [user, departments]);

  // Ensure selectedDepartmentId is valid when accessibleDepartments changes
  useEffect(() => {
    if (accessibleDepartments.length > 0) {
      const exists = accessibleDepartments.some(
        (d) => String(d._id) === String(selectedDepartmentId)
      );
      if (!exists) {
        const primaryId = user?.departmentId?._id || user?.departmentId;
        const matchPrimary = accessibleDepartments.find(
          (d) => String(d._id) === String(primaryId)
        );
        setSelectedDepartmentId(
          matchPrimary ? matchPrimary._id : accessibleDepartments[0]._id
        );
      }
    }
  }, [accessibleDepartments, selectedDepartmentId, user]);

  // Fetch initial catalogs after login
  const loadPortalCatalogs = useCallback(async () => {
    try {
      const [deptRes, periodRes, tplRes] = await Promise.all([
        departmentApi.getDepartments('flat'),
        periodApi.getPeriods(),
        templateApi.getTemplates()
      ]);

      setDepartments(deptRes.data || []);

      const periodList = periodRes.data || [];
      setPeriods(periodList);
      const activeP = periodList.find((p) => p.isActive);
      if (activeP) {
        setSelectedPeriod(activeP.name);
      }

      setTemplates(tplRes.data || []);
    } catch (err) {
      console.error('Portal katalogları yüklenirken hata:', err);
    }
  }, []);

  // Check stored JWT token on mount
  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem('otun_token');
      if (!token) {
        setIsAuthChecking(false);
        return;
      }
      try {
        const res = await authApi.getMe();
        if (res.user) {
          setUser(res.user);
          await loadPortalCatalogs();
        }
      } catch (err) {
        localStorage.removeItem('otun_token');
      } finally {
        setIsAuthChecking(false);
      }
    };
    checkSession();
  }, [loadPortalCatalogs]);

  // Load workflow summary when period changes
  useEffect(() => {
    if (user && selectedPeriod) {
      workflowApi
        .getSummary(selectedPeriod)
        .then((res) => setWorkflowSummary(res.summary || null))
        .catch(() => {});
    }
  }, [user, selectedPeriod, activeView]);

  // Load records & schema when activeTemplateCode, selectedDepartmentId, or selectedPeriod changes
  const loadActiveTableData = useCallback(async () => {
    if (!activeTemplateCode || !selectedDepartmentId || !selectedPeriod) return;
    setIsTableLoading(true);
    try {
      const [tplRes, recRes] = await Promise.all([
        templateApi.getTemplateByCode(activeTemplateCode),
        recordApi.getRecords(activeTemplateCode, selectedDepartmentId, selectedPeriod)
      ]);
      setCurrentTemplate(tplRes.data);
      setTableRows(recRes.data || []);
      setTableWorkflow(recRes.workflow || { status: 'DRAFT', history: [] });
      setTableDeadline(recRes.deadline || null);
    } catch (err) {
      notify(
        err.response?.data?.message || 'Tablo verileri yüklenemedi.',
        'error'
      );
    } finally {
      setIsTableLoading(false);
    }
  }, [activeTemplateCode, selectedDepartmentId, selectedPeriod, notify]);

  useEffect(() => {
    if (activeView === 'TABLE' && activeTemplateCode) {
      loadActiveTableData();
    }
  }, [activeView, activeTemplateCode, loadActiveTableData]);

  // Compute current user's table permissions for activeTemplateCode
  const currentTablePermissions = useMemo(() => {
    if (!user) return {};
    if (user.role === 'ADMIN') {
      return {
        canView: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
        canImport: true,
        canExport: true,
        canApprove: true
      };
    }
    const perms = user.tablePermissions || [];
    const specific = perms.find(
      (p) => (p.templateCode || '').toUpperCase() === (activeTemplateCode || '').toUpperCase()
    );
    const wildcard = perms.find((p) => p.templateCode === '*');
    const resolved = specific || wildcard || {};
    return {
      canView: !!resolved.canView,
      canCreate: !!resolved.canCreate,
      canUpdate: !!resolved.canUpdate,
      canDelete: !!resolved.canDelete,
      canImport: !!resolved.canImport,
      canExport: resolved.canExport !== false,
      canApprove: user.role === 'REVIEWER' || !!resolved.canApprove
    };
  }, [user, activeTemplateCode]);

  // Determine if table is read-only for the current user
  const isTableReadOnly = useMemo(() => {
    if (!user) return true;
    const status = tableWorkflow?.status || 'DRAFT';
    if (status === 'APPROVED' || status === 'SUBMITTED') return true;
    if (user.role === 'ADMIN') return false;
    if (!currentTablePermissions.canCreate && !currentTablePermissions.canUpdate) return true;
    if (tableDeadline && tableDeadline.isOpen === false) return true;
    return false;
  }, [user, tableWorkflow, currentTablePermissions, tableDeadline]);

  // Login Handler
  const handleLogin = async (e, customEmail, customPassword) => {
    if (e) e.preventDefault();
    const emailToUse = customEmail || loginData.identifier;
    const passwordToUse = customPassword || loginData.password;

    setIsLoggingIn(true);
    setLoginError('');
    try {
      const res = await authApi.login(emailToUse, passwordToUse);
      if (res.token && res.user) {
        localStorage.setItem('otun_token', res.token);
        setUser(res.user);
        await loadPortalCatalogs();
        setActiveView('DASHBOARD');
      }
    } catch (err) {
      setLoginError(
        err.response?.data?.message ||
          'Giriş yapılamadı. Kullanıcı adı veya şifreyi kontrol ediniz.'
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('otun_token');
    setUser(null);
    setShowSettingsModal(false);
    setActiveView('DASHBOARD');
    setActiveTemplateCode(null);
  };

  // Save Records Handler
  const handleSaveTableRows = async (rowsToSave) => {
    if (!currentTemplate || !selectedDepartmentId || !selectedPeriod) return;
    setIsSavingRows(true);
    try {
      const formattedRows = (rowsToSave || tableRows).map((r, idx) => ({
        _id: r._id || r.id,
        rowNumber: r.rowNumber !== undefined ? r.rowNumber : idx + 1,
        fixedRowId: r.fixedRowId || null,
        data: r.data || r
      }));

      const res = await recordApi.saveRecords(currentTemplate.code, {
        departmentId: selectedDepartmentId,
        period: selectedPeriod,
        rows: formattedRows,
        syncAll: true
      });

      if (res.data) {
        setTableRows(res.data);
      }
      notify(`${currentTemplate.title} verileri başarıyla kaydedildi!`, 'success');
    } catch (err) {
      const apiErrs = err.response?.data?.errors;
      if (Array.isArray(apiErrs) && apiErrs.length > 0) {
        notify(`Doğrulama Hatası: ${apiErrs[0].message}`, 'error');
      } else {
        notify(
          err.response?.data?.message || 'Veriler kaydedilirken bir hata oluştu.',
          'error'
        );
      }
    } finally {
      setIsSavingRows(false);
    }
  };

  // Delete Single Dynamic Row Handler
  const handleDeleteTableRow = async (rowObj, rowIdx) => {
    if (!currentTemplate) return;
    const recordId = rowObj._id || rowObj.id;
    if (recordId) {
      try {
        await recordApi.deleteRecord(
          currentTemplate.code,
          recordId,
          selectedDepartmentId,
          selectedPeriod
        );
        notify('Kayıt veritabanından silindi.', 'success');
      } catch (err) {
        notify(err.response?.data?.message || 'Kayıt silinemedi.', 'error');
        return;
      }
    }
    setTableRows((prev) => prev.filter((_, idx) => idx !== rowIdx));
  };

  // Server Calculate Verification Handler
  const handleServerCalculate = async (rowsToCalc) => {
    if (!currentTemplate) return;
    try {
      const res = await recordApi.calculateRecords(currentTemplate.code, {
        departmentId: selectedDepartmentId,
        period: selectedPeriod,
        rows: rowsToCalc
      });
      if (res.data?.rows) {
        setTableRows(res.data.rows);
      }
      notify('Canlı formüller sunucu motoru ile doğrulandı.', 'success');
    } catch (err) {
      notify('Formül hesaplama hatası.', 'error');
    }
  };

  // Workflow Submit & Review Handlers
  const handleSubmitWorkflow = async () => {
    if (!currentTemplate) return;
    try {
      // Save current rows first before submitting if not empty
      if (tableRows.length > 0) {
        await recordApi.saveRecords(currentTemplate.code, {
          departmentId: selectedDepartmentId,
          period: selectedPeriod,
          rows: tableRows.map((r, idx) => ({
            _id: r._id || r.id,
            rowNumber: r.rowNumber !== undefined ? r.rowNumber : idx + 1,
            fixedRowId: r.fixedRowId || null,
            data: r.data || r
          }))
        });
      }
      await workflowApi.submit(
        currentTemplate.code,
        selectedDepartmentId,
        selectedPeriod,
        'Veri girişi tamamlanarak onaya sunuldu.'
      );
      notify('Tablo başarıyla onaya gönderildi ve kilitlendi.', 'success');
      await loadActiveTableData();
    } catch (err) {
      notify(err.response?.data?.message || 'Onaya gönderilemedi.', 'error');
    }
  };

  const handleReviewWorkflow = async (action, note) => {
    if (!currentTemplate) return;
    await workflowApi.review(
      currentTemplate.code,
      selectedDepartmentId,
      selectedPeriod,
      action,
      note
    );
    notify(
      action === 'APPROVE'
        ? 'Tablo onaylandı ve kilitlendi!'
        : action === 'REVISE'
        ? 'Revizyon talebi ilgili birime iletildi.'
        : 'Tablo kilidi yeniden açıldı.',
      'success'
    );
    await loadActiveTableData();
  };

  // Categorized Templates for Navigation
  const categorizedTemplates = useMemo(() => {
    const q = sidebarSearch.toLowerCase().trim();
    const filtered = templates.filter(
      (t) =>
        !q ||
        t.title.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q) ||
        (t.category || '').toLowerCase().includes(q)
    );

    const yok24 = filtered.filter((t) => t.isOfficialYOK);
    const uam = filtered.filter(
      (t) => !t.isOfficialYOK && t.category === 'Uygulama ve Araştırma Merkezleri'
    );
    const eylem = filtered.filter(
      (t) => !t.isOfficialYOK && t.category === 'Ulusal Eylem Planları'
    );
    const digerKurumsal = filtered.filter(
      (t) =>
        !t.isOfficialYOK &&
        [
          'Valilik ve Kamu Raporları',
          'Dış İlişkiler ve Kalkınma',
          'Uluslararasılaşma'
        ].includes(t.category)
    );
    const custom = filtered.filter(
      (t) =>
        !t.isOfficialYOK &&
        ![
          'Uygulama ve Araştırma Merkezleri',
          'Ulusal Eylem Planları',
          'Valilik ve Kamu Raporları',
          'Dış İlişkiler ve Kalkınma',
          'Uluslararasılaşma'
        ].includes(t.category)
    );

    return { yok24, uam, eylem, digerKurumsal, custom };
  }, [templates, sidebarSearch]);

  const openTemplatePage = (code, customDeptId) => {
    if (customDeptId) setSelectedDepartmentId(customDeptId);
    setActiveTemplateCode(code);
    setActiveView('TABLE');
    setMobileSidebarOpen(false);
  };

  const toggleGroup = (key) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectedDeptObj = useMemo(
    () => departments.find((d) => String(d._id) === String(selectedDepartmentId)),
    [departments, selectedDepartmentId]
  );

  // ========================================================
  // RENDER: LOADING OR LOGIN SCREEN
  // ========================================================
  if (isAuthChecking) {
    return (
      <div className="h-screen bg-[#020617] flex items-center justify-center text-white">
        <div className="text-center space-y-3">
          <img src={otuLogo} alt="OTÜ" className="w-32 h-auto mx-auto animate-pulse" />
          <p className="text-xs font-bold tracking-widest uppercase text-blue-400">
            OSTİM Teknik Üniversitesi Strateji Portalı Yükleniyor...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 sm:p-6 relative overflow-y-auto font-sans text-left">
        <div className="bg-white/95 backdrop-blur-md w-full max-w-4xl rounded-[2.5rem] p-8 sm:p-12 shadow-2xl z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left: Login Form */}
          <div className="lg:col-span-6 space-y-6">
            <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
              <img src={otuLogo} alt="OTÜ" className="w-36 h-auto mb-4" />
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase leading-tight">
                VERİ İZLEME VE DEĞERLENDİRME BİRİMİ
                <span className="block text-blue-600 text-base font-bold italic uppercase mt-1">
                  YÖK İZLEME &amp; STRATEJİ PORTALI
                </span>
              </h1>
            </div>

            {loginError && (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-[11px] font-black uppercase text-slate-500 block mb-1.5 ml-1">
                  Kurumsal E-Posta Adresi
                </label>
                <input
                  type="text"
                  value={loginData.identifier}
                  placeholder="ornek@ostimteknik.edu.tr"
                  className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-blue-600 transition-colors"
                  onChange={(e) =>
                    setLoginData({ ...loginData, identifier: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-black uppercase text-slate-500 block mb-1.5 ml-1">
                  Şifre
                </label>
                <div className="relative w-full">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginData.password}
                    placeholder="Şifreniz"
                    className="w-full p-4 pr-12 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-blue-600 transition-colors"
                    onChange={(e) =>
                      setLoginData({ ...loginData, password: e.target.value })
                    }
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute top-1/2 right-4 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-blue-600 text-white p-4 rounded-2xl font-black text-xs shadow-xl hover:bg-blue-700 transition-all uppercase tracking-wider"
              >
                {isLoggingIn ? 'OTURUM AÇILIYOR...' : 'PORTALA GİRİŞ YAP'}
              </button>
            </form>
          </div>

          {/* Right: Demo Quick-Login Accounts for Testing */}
          <div className="lg:col-span-6 bg-slate-50 rounded-3xl p-6 border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-800">
              <Sparkles size={16} className="text-blue-600" />
              <span>Hızlı Test Hesapları (Tek Tıkla Giriş)</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Farklı birim kapsamlarını (RBAC), Fakülte Dekanlığı onay sürecini ve çoklu birim yetkisini test etmek için aşağıdaki hazır profillere tıklayabilirsiniz:
            </p>
            <div className="space-y-2 pt-1">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  type="button"
                  key={acc.email}
                  onClick={() => {
                    setLoginData({ identifier: acc.email, password: acc.password });
                    handleLogin(null, acc.email, acc.password);
                  }}
                  className="w-full text-left p-3 rounded-2xl bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-400 transition-all flex items-center justify-between gap-2 group"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-900 group-hover:text-blue-700 truncate">
                      {acc.label}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono truncate">
                      {acc.email}
                    </p>
                  </div>
                  <span className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-100 group-hover:bg-blue-600 group-hover:text-white text-slate-700 text-[10px] font-black uppercase transition-colors">
                    {acc.badge}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ========================================================
  // RENDER: AUTHENTICATED PORTAL SHELL
  // ========================================================
  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-800 font-sans relative overflow-hidden">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-2xl border flex items-center gap-3 text-xs font-black transition-all ${
            toast.type === 'error'
              ? 'bg-red-600 text-white border-red-700'
              : 'bg-slate-900 text-white border-slate-800'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle size={18} />
          ) : (
            <CheckCircle2 size={18} className="text-emerald-400" />
          )}
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-white/70 hover:text-white ml-2"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* SIDEBAR NAVIGATION */}
      <aside
        className={`${
          mobileSidebarOpen ? 'fixed inset-y-0 left-0 z-40 flex' : 'hidden lg:flex'
        } w-80 bg-white border-r border-slate-200 flex-col shadow-sm z-20 overflow-hidden text-left shrink-0`}
      >
        {/* Logo Brand */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div
            onClick={() => setActiveView('DASHBOARD')}
            className="flex items-center gap-3 cursor-pointer"
          >
            <img src={otuLogo} alt="OTÜ Logo" className="w-28 h-auto" />
            <div className="border-l border-slate-200 pl-3">
              <span className="text-[11px] font-black uppercase text-slate-900 block leading-tight">
                STRATEJİ PORTAL
              </span>
              <span className="text-[10px] font-bold text-blue-600 block">
                YÖK Veri İzleme
              </span>
            </div>
          </div>
          {mobileSidebarOpen && (
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-slate-700"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Sidebar Search */}
        <div className="p-3 border-b border-slate-100 shrink-0">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              placeholder="37+ Tabloda hızlı ara..."
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium outline-none focus:border-blue-600"
            />
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto custom-scrollbar">
          <button
            type="button"
            onClick={() => {
              setActiveView('DASHBOARD');
              setMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl transition-all ${
              activeView === 'DASHBOARD'
                ? 'bg-blue-600 text-white shadow-md font-black'
                : 'text-slate-600 hover:bg-slate-100 font-bold'
            }`}
          >
            <LayoutDashboard size={18} />
            <span className="text-xs uppercase tracking-tight">
              Genel Bakış / Ana Sayfa
            </span>
          </button>

          {/* Admin & Reviewer Management Section */}
          {(user.role === 'ADMIN' || user.role === 'REVIEWER') && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => toggleGroup('ADMIN')}
                className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-700"
              >
                <span>YÖNETİM VE ONAY MERKEZİ</span>
                {expandedGroups.ADMIN ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
              </button>

              {expandedGroups.ADMIN && (
                <div className="space-y-1 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveView('ADMIN_WORKFLOW');
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      activeView === 'ADMIN_WORKFLOW'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200 font-black'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Calendar size={15} className="text-amber-600 shrink-0" />
                    <span>Dönem, Son Tarih &amp; Onay Merkezi</span>
                  </button>

                  {user.role === 'ADMIN' && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveView('ADMIN_BUILDER');
                          setMobileSidebarOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                          activeView === 'ADMIN_BUILDER'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200 font-black'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Layers size={15} className="text-blue-600 shrink-0" />
                        <span>Dinamik Şablon Oluşturucu</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveView('ADMIN_USERS');
                          setMobileSidebarOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                          activeView === 'ADMIN_USERS'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200 font-black'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Shield size={15} className="text-indigo-600 shrink-0" />
                        <span>Kullanıcı &amp; Yetki Matrisi (RBAC)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveView('ADMIN_AUDIT');
                          setMobileSidebarOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                          activeView === 'ADMIN_AUDIT'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200 font-black'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Activity size={15} className="text-emerald-600 shrink-0" />
                        <span>Denetim Kayıtları (Audit Log)</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Category 1: 24 Official YÖK Templates */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => toggleGroup('YOK_24')}
              className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-50/60 rounded-xl"
            >
              <span>YÖK ÜNİVERSİTE İZLEME ({categorizedTemplates.yok24.length})</span>
              {expandedGroups.YOK_24 ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </button>

            {expandedGroups.YOK_24 && (
              <div className="mt-1 space-y-0.5 pl-2 border-l-2 border-blue-100 ml-2">
                {categorizedTemplates.yok24.map((tpl) => {
                  const isActive =
                    activeView === 'TABLE' && activeTemplateCode === tpl.code;
                  const isMacro =
                    tpl.excelTemplatePath?.endsWith('.xlsm') ||
                    tpl.code === 'MYO_UYGULAMALI_EGITIM' ||
                    tpl.code === 'PROJELER';
                  return (
                    <button
                      type="button"
                      key={tpl.code}
                      onClick={() => openTemplatePage(tpl.code)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-[11px] flex items-center justify-between gap-2 transition-all ${
                        isActive
                          ? 'bg-blue-600 text-white font-black shadow-sm'
                          : 'text-slate-600 hover:bg-slate-100 font-semibold'
                      }`}
                    >
                      <span className="truncate">{tpl.title}</span>
                      <span
                        className={`shrink-0 px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : tpl.type === 'FIXED'
                            ? 'bg-amber-100 text-amber-800'
                            : isMacro
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {tpl.type === 'FIXED' ? 'Matris' : isMacro ? '.xlsm' : 'Tablo'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Category 2: Research Centers (UAM - 7 Tables) */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => toggleGroup('UAM')}
              className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              <span>UYGULAMA VE ARAŞTIRMA MERKEZLERİ ({categorizedTemplates.uam.length})</span>
              {expandedGroups.UAM ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </button>
            {expandedGroups.UAM && (
              <div className="mt-1 space-y-0.5 pl-2 border-l-2 border-slate-200 ml-2">
                {categorizedTemplates.uam.map((tpl) => (
                  <button
                    type="button"
                    key={tpl.code}
                    onClick={() => openTemplatePage(tpl.code)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-[11px] truncate transition-all ${
                      activeView === 'TABLE' && activeTemplateCode === tpl.code
                        ? 'bg-blue-600 text-white font-black'
                        : 'text-slate-600 hover:bg-slate-100 font-semibold'
                    }`}
                  >
                    {tpl.title}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Category 3: National Action Plans (6 Tables) */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => toggleGroup('EYLEM')}
              className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              <span>YÖK ULUSAL EYLEM PLANLARI ({categorizedTemplates.eylem.length})</span>
              {expandedGroups.EYLEM ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </button>
            {expandedGroups.EYLEM && (
              <div className="mt-1 space-y-0.5 pl-2 border-l-2 border-slate-200 ml-2">
                {categorizedTemplates.eylem.map((tpl) => (
                  <button
                    type="button"
                    key={tpl.code}
                    onClick={() => openTemplatePage(tpl.code)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-[11px] truncate transition-all ${
                      activeView === 'TABLE' && activeTemplateCode === tpl.code
                        ? 'bg-blue-600 text-white font-black'
                        : 'text-slate-600 hover:bg-slate-100 font-semibold'
                    }`}
                  >
                    {tpl.title}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Category 4: Valilik, TİKA & Eğitim İhracatı */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => toggleGroup('DIGER_KURUMSAL')}
              className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              <span>VALİLİK, TİKA &amp; İHRACAT ({categorizedTemplates.digerKurumsal.length})</span>
              {expandedGroups.DIGER_KURUMSAL ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </button>
            {expandedGroups.DIGER_KURUMSAL && (
              <div className="mt-1 space-y-0.5 pl-2 border-l-2 border-slate-200 ml-2">
                {categorizedTemplates.digerKurumsal.map((tpl) => (
                  <button
                    type="button"
                    key={tpl.code}
                    onClick={() => openTemplatePage(tpl.code)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-[11px] truncate transition-all ${
                      activeView === 'TABLE' && activeTemplateCode === tpl.code
                        ? 'bg-blue-600 text-white font-black'
                        : 'text-slate-600 hover:bg-slate-100 font-semibold'
                    }`}
                  >
                    {tpl.title}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Category 5: Custom Dynamic Templates */}
          {categorizedTemplates.custom.length > 0 && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => toggleGroup('CUSTOM')}
                className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-50 rounded-xl"
              >
                <span>ÖZEL DİNAMİK ŞABLONLAR ({categorizedTemplates.custom.length})</span>
                {expandedGroups.CUSTOM ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
              </button>
              {expandedGroups.CUSTOM && (
                <div className="mt-1 space-y-0.5 pl-2 border-l-2 border-purple-200 ml-2">
                  {categorizedTemplates.custom.map((tpl) => (
                    <button
                      type="button"
                      key={tpl.code}
                      onClick={() => openTemplatePage(tpl.code)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-[11px] truncate transition-all ${
                        activeView === 'TABLE' && activeTemplateCode === tpl.code
                          ? 'bg-purple-600 text-white font-black'
                          : 'text-slate-600 hover:bg-slate-100 font-semibold'
                      }`}
                    >
                      {tpl.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col overflow-hidden text-left">
        {/* TOP HEADER */}
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 shrink-0 z-10 shadow-sm gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-slate-100 text-slate-700"
            >
              <Menu size={20} />
            </button>
            <div className="w-1.5 h-7 bg-blue-600 rounded-full shrink-0" />
            <div className="min-w-0">
              <h2 className="text-slate-900 font-black tracking-tight text-sm sm:text-base uppercase truncate">
                {activeView === 'DASHBOARD'
                  ? 'GENEL BAKIŞ VE VERİ İZLEME PANELİ'
                  : activeView === 'ADMIN_USERS'
                  ? 'KULLANICI & YETKİ MATRİSİ (RBAC)'
                  : activeView === 'ADMIN_BUILDER'
                  ? 'DİNAMİK TABLO VE ŞABLON OLUŞTURUCU'
                  : activeView === 'ADMIN_WORKFLOW'
                  ? 'DÖNEM, SON TARİH & ONAY MERKEZİ'
                  : activeView === 'ADMIN_AUDIT'
                  ? 'SİSTEM DENETİM KAYITLARI'
                  : currentTemplate?.title || activeTemplateCode}
              </h2>
              <p className="text-[11px] font-bold text-slate-400 truncate">
                {activeView === 'TABLE' && currentTemplate
                  ? `Şablon Kodu: ${currentTemplate.code} • ${currentTemplate.category} • ${
                      currentTemplate.type === 'FIXED'
                        ? `Sabit Satırlı Matris (${currentTemplate.fixedRows?.length || 0} Satır)`
                        : `Dinamik Tablo (${currentTemplate.columns?.length || 0} Sütun)`
                    }`
                  : 'OSTİM Teknik Üniversitesi Veri İzleme ve Değerlendirme Birimi'}
              </p>
            </div>
          </div>

          {/* Right Controls: Department Selector + Period Selector + User Profile */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Department Switcher */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <Building2 size={15} className="text-blue-600 shrink-0" />
              <div className="text-left">
                <span className="text-[9px] font-black uppercase text-slate-400 block leading-none">
                  Aktif Birim ({accessibleDepartments.length} Yetkili)
                </span>
                <select
                  value={selectedDepartmentId}
                  onChange={(e) => setSelectedDepartmentId(e.target.value)}
                  className="bg-transparent text-xs font-black text-slate-800 outline-none cursor-pointer max-w-[180px] sm:max-w-[230px] truncate"
                >
                  {accessibleDepartments.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Period Switcher */}
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <Calendar size={15} className="text-amber-600 shrink-0" />
              <div className="text-left">
                <span className="text-[9px] font-black uppercase text-slate-400 block leading-none">
                  Dönem
                </span>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="bg-transparent text-xs font-black text-slate-800 outline-none cursor-pointer"
                >
                  {periods.length > 0 ? (
                    periods.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name} {p.isActive ? '(Aktif)' : ''}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="2025-2026">2025-2026 (Aktif)</option>
                      <option value="2024-2025">2024-2025</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* User Badge & Settings Trigger */}
            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="flex items-center gap-2.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white px-3.5 py-2 rounded-xl transition-all border border-blue-200"
            >
              <div className="hidden md:block text-right">
                <span className="text-xs font-black block leading-none">
                  {user.name}
                </span>
                <span className="text-[10px] font-bold opacity-80 block mt-0.5">
                  {user.role}
                </span>
              </div>
              <Settings size={18} />
            </button>
          </div>
        </header>

        {/* WORKSPACE MAIN SCROLLABLE AREA */}
        <main className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50/60 custom-scrollbar">
          {activeView === 'DASHBOARD' && (
            <div className="space-y-6 max-w-[1600px] mx-auto">
              {/* Top Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-black uppercase text-blue-600 tracking-wider block">
                    Resmi YÖK İzleme Şablonları
                  </span>
                  <p className="text-4xl font-black text-slate-900 mt-2">
                    {categorizedTemplates.yok24.length}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    6 Sabit Matris • 18 Dinamik &amp; Makrolu (.xlsm)
                  </p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider block">
                    Kurumsal &amp; Özel Kategoriler
                  </span>
                  <p className="text-4xl font-black text-slate-900 mt-2">
                    {templates.length - categorizedTemplates.yok24.length}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    UAM, Ulusal Eylem Planları, Valilik, TİKA
                  </p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider block">
                    Onaylanan / İncelenen Tablolar
                  </span>
                  <p className="text-4xl font-black text-slate-900 mt-2">
                    {(workflowSummary?.approved || 0) + (workflowSummary?.submitted || 0)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {workflowSummary?.approved || 0} Onaylı • {workflowSummary?.submitted || 0} İncelemede
                  </p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider block">
                    Seçili Birim &amp; Dönem
                  </span>
                  <p className="text-lg font-black text-slate-900 mt-2 truncate">
                    {selectedDeptObj?.name || 'Birim Seçili'}
                  </p>
                  <p className="text-xs font-bold text-blue-600 mt-1">
                    Dönem: {selectedPeriod} • Kapsam: {user.departmentScope?.type || 'OWN_DEPT'}
                  </p>
                </div>
              </div>

              {/* 24 Official YÖK Monitoring Templates Grid */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-black text-slate-900 uppercase flex items-center gap-2">
                      <FileSpreadsheet size={20} className="text-blue-600" />
                      2025-2026 YÖK Üniversite İzleme ve Değerlendirme Şablonları (24 Resmi Tablo)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Tüm şablonlar canlı formül motoru, VBA çoklu seçim (Multi-Select) etiket seçicisi ve 1:1 orijinal .xlsx/.xlsm dışa/içe aktarım desteğine sahiptir.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {categorizedTemplates.yok24.map((tpl) => {
                    const isMacro =
                      tpl.excelTemplatePath?.endsWith('.xlsm') ||
                      tpl.code === 'MYO_UYGULAMALI_EGITIM' ||
                      tpl.code === 'PROJELER';
                    return (
                      <div
                        key={tpl.code}
                        onClick={() => openTemplatePage(tpl.code)}
                        className="p-4 rounded-2xl border border-slate-200 hover:border-blue-500 bg-slate-50/50 hover:bg-blue-50/40 cursor-pointer transition-all flex flex-col justify-between gap-3 group shadow-sm hover:shadow-md"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono text-[10px] font-black">
                              {tpl.code}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                tpl.type === 'FIXED'
                                  ? 'bg-amber-100 text-amber-800'
                                  : isMacro
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {tpl.type === 'FIXED'
                                ? `Sabit Matris (${tpl.fixedRows?.length || 0})`
                                : isMacro
                                ? 'Makrolu (.xlsm)'
                                : 'Dinamik Tablo'}
                            </span>
                          </div>
                          <h4 className="text-xs font-black text-slate-900 group-hover:text-blue-700 leading-snug">
                            {tpl.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                            {tpl.description || tpl.category}
                          </p>
                        </div>

                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 pt-2 border-t border-slate-200/70">
                          <span>{tpl.columns?.length || 0} Sütun</span>
                          <span className="text-blue-600 group-hover:translate-x-0.5 transition-transform">
                            Veri Girişi &rarr;
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Institutional Categories Grid (UAM, Action Plans, Valilik, TİKA) */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
                <h3 className="text-base font-black text-slate-900 uppercase">
                  Kurumsal Veri İzleme Kategorileri (UAM, Ulusal Eylem Planları, Valilik Brifing, TİKA)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {[
                    ...categorizedTemplates.uam,
                    ...categorizedTemplates.eylem,
                    ...categorizedTemplates.digerKurumsal,
                    ...categorizedTemplates.custom
                  ].map((tpl) => (
                    <div
                      key={tpl.code}
                      onClick={() => openTemplatePage(tpl.code)}
                      className="p-4 rounded-2xl border border-slate-200 hover:border-indigo-500 bg-slate-50/40 hover:bg-indigo-50/30 cursor-pointer transition-all flex flex-col justify-between gap-2"
                    >
                      <div>
                        <span className="text-[10px] font-black uppercase text-indigo-600 block">
                          {tpl.category}
                        </span>
                        <h4 className="text-xs font-black text-slate-900 mt-1">
                          {tpl.title}
                        </h4>
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 pt-2">
                        <span>{tpl.columns?.length || 0} Sütun</span>
                        <span className="text-indigo-600">Aç &rarr;</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeView === 'TABLE' && (
            <div className="space-y-4 max-w-[1600px] mx-auto">
              {isTableLoading || !currentTemplate ? (
                <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-xs font-bold text-slate-500">
                  Tablo şeması ve birim verileri yükleniyor...
                </div>
              ) : !currentTablePermissions.canView ? (
                <div className="bg-white rounded-3xl border border-red-200 p-12 text-center space-y-2">
                  <Lock size={32} className="mx-auto text-red-500" />
                  <h3 className="text-base font-black text-slate-900 uppercase">
                    Bu Tabloyu Görüntüleme Yetkiniz Bulunmamaktadır
                  </h3>
                  <p className="text-xs text-slate-500">
                    Sistem Yöneticisi (Admin) ile iletişime geçerek Yetki Matrisi üzerinden görüntüleme izni talep edebilirsiniz.
                  </p>
                </div>
              ) : (
                <>
                  {/* Workflow Approval & 1:1 Excel Toolbar */}
                  <WorkflowApprovalBar
                    template={currentTemplate}
                    workflow={tableWorkflow}
                    deadline={tableDeadline}
                    user={user}
                    permissions={currentTablePermissions}
                    onSubmitWorkflow={handleSubmitWorkflow}
                    onReviewWorkflow={handleReviewWorkflow}
                    onExportTemplate={() =>
                      excelApi
                        .exportExcel(
                          currentTemplate.code,
                          selectedDepartmentId,
                          selectedPeriod,
                          'template'
                        )
                        .then(() =>
                          notify('1:1 Orijinal YÖK Şablonu başarıyla indirildi!')
                        )
                        .catch(() =>
                          notify('Excel dışa aktarma sırasında hata oluştu.', 'error')
                        )
                    }
                    onExportClean={() =>
                      excelApi
                        .exportExcel(
                          currentTemplate.code,
                          selectedDepartmentId,
                          selectedPeriod,
                          'clean'
                        )
                        .then(() => notify('Standart Excel tablosu indirildi.'))
                        .catch(() => notify('Excel indirilemedi.', 'error'))
                    }
                    onDownloadBlank={() =>
                      templateApi
                        .downloadBlankExcel(currentTemplate.code)
                        .then(() => notify('Boş YÖK şablonu indirildi.'))
                        .catch(() => notify('Boş şablon indirilemedi.', 'error'))
                    }
                    onOpenImportModal={() => setShowImportModal(true)}
                  />

                  {/* Dedicated Fixed-Row Matrix View OR Dynamic Grid View */}
                  {currentTemplate.type === 'FIXED' ? (
                    <FixedMatrixView
                      template={currentTemplate}
                      rows={tableRows}
                      onChangeRows={setTableRows}
                      onSaveAll={handleSaveTableRows}
                      isSaving={isSavingRows}
                      isReadOnly={isTableReadOnly}
                      onServerCalculate={handleServerCalculate}
                    />
                  ) : (
                    <DynamicGridView
                      template={currentTemplate}
                      rows={tableRows}
                      onChangeRows={setTableRows}
                      onSaveAll={handleSaveTableRows}
                      onDeleteRow={handleDeleteTableRow}
                      isSaving={isSavingRows}
                      isReadOnly={isTableReadOnly}
                    />
                  )}

                  {/* Validated Excel Import Modal */}
                  <ExcelImportModal
                    isOpen={showImportModal}
                    onClose={() => setShowImportModal(false)}
                    template={currentTemplate}
                    departmentId={selectedDepartmentId}
                    departmentName={selectedDeptObj?.name}
                    period={selectedPeriod}
                    onImportSuccess={() => {
                      notify('Excel verileri doğrulanarak tabloya aktarıldı!');
                      loadActiveTableData();
                    }}
                  />
                </>
              )}
            </div>
          )}

          {activeView === 'ADMIN_BUILDER' && (
            <AdminDynamicBuilder
              templates={templates}
              onRefreshTemplates={loadPortalCatalogs}
              onSelectTemplateToView={(code) => openTemplatePage(code)}
            />
          )}

          {activeView === 'ADMIN_USERS' && (
            <AdminUsersRBAC departments={departments} templates={templates} />
          )}

          {activeView === 'ADMIN_WORKFLOW' && (
            <AdminWorkflowPeriods
              periods={periods}
              activePeriod={selectedPeriod}
              templates={templates}
              departments={departments}
              onRefreshPeriods={loadPortalCatalogs}
              onNavigateToTable={(code, deptId) => openTemplatePage(code, deptId)}
            />
          )}

          {activeView === 'ADMIN_AUDIT' && <AdminAuditLogs templates={templates} />}
        </main>
      </div>

      {/* USER PROFILE & LOGOUT MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl relative border border-slate-200 text-center space-y-4">
            <button
              type="button"
              onClick={() => setShowSettingsModal(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-700"
            >
              <X size={22} />
            </button>

            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mx-auto font-black text-xl">
              OTÜ
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 uppercase">
                {user.name}
              </h3>
              <p className="text-xs font-mono text-slate-500 mt-0.5">{user.email}</p>
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-black uppercase">
                <span>Rol: {user.role}</span>
                <span>•</span>
                <span>Kapsam: {user.departmentScope?.type || 'OWN_DEPT'}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs space-y-1">
              <p className="font-bold text-slate-700">
                Ana Birim: <span className="font-normal">{user.departmentId?.name || 'Rektörlük'}</span>
              </p>
              <p className="font-bold text-slate-700">
                Erişilebilir Birim Sayısı:{' '}
                <span className="font-normal">{accessibleDepartments.length} Birim</span>
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 p-4 text-red-600 font-black hover:bg-red-50 rounded-2xl border border-red-200 uppercase text-xs tracking-wider transition-all"
            >
              <LogOut size={16} /> Oturumu Kapat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  Plus,
  Save,
  Building2,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Trash2
} from 'lucide-react';
import { userApi } from '../services/api';

const PERM_KEYS = [
  { key: 'canView', label: 'Görüntüle' },
  { key: 'canCreate', label: 'Ekle' },
  { key: 'canUpdate', label: 'Güncelle' },
  { key: 'canDelete', label: 'Sil' },
  { key: 'canImport', label: 'İçe Aktar' },
  { key: 'canExport', label: 'Dışa Aktar' },
  { key: 'canApprove', label: 'Onayla' }
];

export default function AdminUsersRBAC({ departments = [], templates = [] }) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // New user form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'DEPT_USER',
    departmentId: '',
    scopeType: 'OWN_DEPT',
    customDepartments: []
  });

  // Selected user Profile, Scope & Permissions editing state
  const [editProfile, setEditProfile] = useState({
    name: '',
    role: 'DEPT_USER',
    departmentId: '',
    isActive: true,
    password: ''
  });
  const [editScopeType, setEditScopeType] = useState('OWN_DEPT');
  const [editCustomDepts, setEditCustomDepts] = useState([]);
  const [editPermissions, setEditPermissions] = useState([]);
  const [newPermTemplateCode, setNewPermTemplateCode] = useState('*');

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await userApi.getUsers({ limit: 100 });
      const list = res.data || [];
      setUsers(list);
      if (!selectedUser && list.length > 0) {
        selectUserForEdit(list[0]);
      } else if (selectedUser) {
        const refreshed = list.find((u) => (u._id || u.id) === (selectedUser._id || selectedUser.id));
        if (refreshed) selectUserForEdit(refreshed);
      }
    } catch (err) {
      setErrorMsg('Kullanıcı listesi alınamadı.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const selectUserForEdit = (u) => {
    setSelectedUser(u);
    setEditProfile({
      name: u.name || '',
      role: u.role || 'DEPT_USER',
      departmentId: u.departmentId?._id || u.departmentId || '',
      isActive: u.isActive !== false,
      password: ''
    });
    setEditScopeType(u.departmentScope?.type || 'OWN_DEPT');
    const customIds = (u.departmentScope?.departments || []).map((d) =>
      typeof d === 'object' ? d._id : d
    );
    setEditCustomDepts(customIds);
    setEditPermissions(
      Array.isArray(u.tablePermissions) && u.tablePermissions.length > 0
        ? u.tablePermissions.map((p) => ({ ...p }))
        : [
            {
              templateCode: '*',
              canView: true,
              canCreate: true,
              canUpdate: true,
              canDelete: false,
              canImport: true,
              canExport: true,
              canApprove: false
            }
          ]
    );
    setStatusMsg(null);
    setErrorMsg(null);
  };

  const toggleCustomDept = (deptId, isNewUser = false) => {
    if (isNewUser) {
      setNewUserForm((prev) => {
        const exists = prev.customDepartments.includes(deptId);
        return {
          ...prev,
          customDepartments: exists
            ? prev.customDepartments.filter((id) => id !== deptId)
            : [...prev.customDepartments, deptId]
        };
      });
    } else {
      setEditCustomDepts((prev) =>
        prev.includes(deptId) ? prev.filter((id) => id !== deptId) : [...prev, deptId]
      );
    }
  };

  const handleTogglePermFlag = (idx, key) => {
    setEditPermissions((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [key]: !row[key] } : row))
    );
  };

  const handleAddPermRow = () => {
    if (editPermissions.some((p) => p.templateCode === newPermTemplateCode)) {
      return;
    }
    setEditPermissions([
      ...editPermissions,
      {
        templateCode: newPermTemplateCode,
        canView: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
        canImport: true,
        canExport: true,
        canApprove: false
      }
    ]);
  };

  const handleRemovePermRow = (idx) => {
    setEditPermissions(editPermissions.filter((_, i) => i !== idx));
  };

  const handleSaveScopeAndPermissions = async () => {
    if (!selectedUser) return;
    setErrorMsg(null);
    setStatusMsg(null);
    const uid = selectedUser._id || selectedUser.id;
    try {
      const departmentScope = {
        type: editScopeType,
        departments: editScopeType === 'CUSTOM' ? editCustomDepts : []
      };
      const userUpdatePayload = {
        name: editProfile.name,
        role: editProfile.role,
        departmentId: editProfile.departmentId || null,
        isActive: editProfile.isActive,
        departmentScope,
        tablePermissions: editPermissions
      };
      if (editProfile.password && editProfile.password.trim().length > 0) {
        userUpdatePayload.password = editProfile.password.trim();
      }
      await userApi.updateUser(uid, userUpdatePayload);
      await userApi.updatePermissions(uid, {
        tablePermissions: editPermissions,
        departmentScope
      });
      setEditProfile((prev) => ({ ...prev, password: '' }));
      setStatusMsg(
        `${editProfile.name || selectedUser.name} (${selectedUser.email}) için profil, birim kapsamı ve tablo yetki matrisi güncellendi!`
      );
      await fetchUsers();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Kullanıcı ve yetkiler kaydedilemedi.');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const payload = {
        name: newUserForm.name,
        email: newUserForm.email,
        password: newUserForm.password,
        role: newUserForm.role,
        departmentId: newUserForm.departmentId || null,
        departmentScope: {
          type: newUserForm.scopeType,
          departments: newUserForm.scopeType === 'CUSTOM' ? newUserForm.customDepartments : []
        },
        tablePermissions: [
          {
            templateCode: '*',
            canView: true,
            canCreate: newUserForm.role !== 'REVIEWER',
            canUpdate: newUserForm.role !== 'REVIEWER',
            canDelete: newUserForm.role === 'ADMIN',
            canImport: newUserForm.role !== 'REVIEWER',
            canExport: true,
            canApprove: newUserForm.role === 'ADMIN' || newUserForm.role === 'REVIEWER'
          }
        ]
      };
      await userApi.createUser(payload);
      setStatusMsg(`Yeni kullanıcı (${newUserForm.email}) başarıyla oluşturuldu!`);
      setShowCreateForm(false);
      setNewUserForm({
        name: '',
        email: '',
        password: '',
        role: 'DEPT_USER',
        departmentId: '',
        scopeType: 'OWN_DEPT',
        customDepartments: []
      });
      await fetchUsers();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Kullanıcı oluşturulamadı.');
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center">
            <Shield size={24} />
          </div>
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight">
              Kullanıcı, Birim Kapsamı ve Tablo Yetki Matrisi (RBAC)
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Kullanıcıların hangi birimlerin verilerini görebileceğini (Örn: Bilgisayar Müh. kullanıcısına Yazılım Müh. yetkisi verme) ve tablo bazlı CRUD/Onay yetkilerini yönetin.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateForm((prev) => !prev)}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase flex items-center gap-2 transition-all"
        >
          <Plus size={15} />
          {showCreateForm ? 'Formu Gizle' : 'Yeni Kullanıcı Oluştur'}
        </button>
      </div>

      {statusMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-300 text-red-800 text-xs font-bold flex items-center gap-2">
          <AlertCircle size={18} className="text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Create User Form */}
      {showCreateForm && (
        <form
          onSubmit={handleCreateUser}
          className="bg-white rounded-3xl border border-blue-200 p-6 shadow-md space-y-4"
        >
          <h3 className="text-sm font-black uppercase text-slate-900 border-b border-slate-100 pb-3">
            Yeni Portal Kullanıcısı Tanımla
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Ad Soyad / Unvan *</label>
              <input
                type="text"
                value={newUserForm.name}
                onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                placeholder="Örn: Dr. Öğr. Üyesi Ahmet Yılmaz"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Kurumsal E-Posta *</label>
              <input
                type="email"
                value={newUserForm.email}
                onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                placeholder="kullanici@ostimteknik.edu.tr"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Şifre *</label>
              <input
                type="password"
                value={newUserForm.password}
                onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                placeholder="En az 6 karakter"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Sistem Rolü *</label>
              <select
                value={newUserForm.role}
                onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold"
              >
                <option value="DEPT_USER">Birim Veri Giriş Sorumlusu (DEPT_USER)</option>
                <option value="REVIEWER">Üst Birim / Dekanlık Onaylayıcı (REVIEWER)</option>
                <option value="ADMIN">Sistem Yöneticisi (ADMIN)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Ana Birimi (Bölüm/Fakülte) *</label>
              <select
                value={newUserForm.departmentId}
                onChange={(e) => setNewUserForm({ ...newUserForm, departmentId: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold"
                required={newUserForm.role !== 'ADMIN'}
              >
                <option value="">Birim Seçiniz...</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Birim Görünürlük Kapsamı</label>
              <select
                value={newUserForm.scopeType}
                onChange={(e) => setNewUserForm({ ...newUserForm, scopeType: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold"
              >
                <option value="OWN_DEPT">Sadece Kendi Birimi ve Alt Birimleri (OWN_DEPT)</option>
                <option value="CUSTOM">Seçili Ek Birimler (CUSTOM - Çoklu Birim Yetkisi)</option>
                <option value="ALL">Üniversite Geneli Tüm Birimler (ALL)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase"
            >
              Kullanıcıyı Kaydet
            </button>
          </div>
        </form>
      )}

      {/* Main Split View: Users List (Left) + RBAC & Scope Editor (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Users List */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 p-4 shadow-sm space-y-3">
          <h3 className="text-xs font-black uppercase text-slate-700 px-2">
            Kayıtlı Kullanıcılar ({users.length})
          </h3>
          {isLoading ? (
            <p className="text-xs text-slate-400 p-4">Yükleniyor...</p>
          ) : (
            <div className="space-y-2 max-h-[65vh] overflow-y-auto custom-scrollbar pr-1">
              {users.map((u) => {
                const isSelected =
                  (selectedUser?._id || selectedUser?.id) === (u._id || u.id);
                return (
                  <button
                    type="button"
                    key={u._id || u.id}
                    onClick={() => selectUserForEdit(u)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                        : 'bg-slate-50/70 hover:bg-slate-100 border-slate-200 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black truncate">{u.name}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : u.role === 'ADMIN'
                            ? 'bg-purple-100 text-purple-800'
                            : u.role === 'REVIEWER'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {u.role}
                      </span>
                    </div>
                    <p
                      className={`text-[11px] mt-0.5 truncate ${
                        isSelected ? 'text-blue-100' : 'text-slate-500'
                      }`}
                    >
                      {u.email}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-[10px] font-bold">
                      <span>
                        Birim: {u.departmentId?.name || 'Rektörlük / Genel'}
                      </span>
                      <span>Kapsam: {u.departmentScope?.type || 'OWN_DEPT'}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Selected User Scope & Table Permission Matrix */}
        <div className="lg:col-span-8 space-y-6">
          {selectedUser ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase">
                    {selectedUser.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedUser.email} • Ana Birim:{' '}
                    <strong>{selectedUser.departmentId?.name || 'Genel'}</strong>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSaveScopeAndPermissions}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase flex items-center gap-2 shadow-md shadow-blue-600/20 transition-all"
                >
                  <Save size={15} />
                  Profil, Kapsam ve Yetki Matrisini Kaydet
                </button>
              </div>

              {/* 0. User Profile, Role, Department & Account Status */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-800 flex items-center gap-2">
                  <Edit3 size={15} className="text-blue-600" />
                  Kullanıcı Profili, Rol ve Hesap Bilgileri
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Ad Soyad / Unvan
                    </label>
                    <input
                      type="text"
                      value={editProfile.name}
                      onChange={(e) =>
                        setEditProfile({ ...editProfile, name: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Sistem Rolü
                    </label>
                    <select
                      value={editProfile.role}
                      onChange={(e) =>
                        setEditProfile({ ...editProfile, role: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold"
                    >
                      <option value="DEPT_USER">Birim Sorumlusu (DEPT_USER)</option>
                      <option value="REVIEWER">Üst Birim Onaylayıcı (REVIEWER)</option>
                      <option value="ADMIN">Sistem Yöneticisi (ADMIN)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Ana Birimi
                    </label>
                    <select
                      value={editProfile.departmentId}
                      onChange={(e) =>
                        setEditProfile({ ...editProfile, departmentId: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold"
                    >
                      <option value="">Rektörlük / Genel</option>
                      {departments.map((d) => (
                        <option key={d._id} value={d._id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Hesap Durumu
                    </label>
                    <select
                      value={editProfile.isActive ? 'true' : 'false'}
                      onChange={(e) =>
                        setEditProfile({
                          ...editProfile,
                          isActive: e.target.value === 'true'
                        })
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold"
                    >
                      <option value="true">Aktif (Giriş Yapabilir)</option>
                      <option value="false">Pasif (Devre Dışı)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Yeni Şifre (İsteğe Bağlı)
                    </label>
                    <input
                      type="password"
                      value={editProfile.password}
                      onChange={(e) =>
                        setEditProfile({ ...editProfile, password: e.target.value })
                      }
                      placeholder="Değiştirmek için giriniz..."
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* 1. Department Visibility Scope */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-800 flex items-center gap-2">
                  <Building2 size={16} className="text-blue-600" />
                  1. Birim Görünürlük ve Veri Erişim Kapsamı (Department Scope)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      id: 'OWN_DEPT',
                      title: 'Kendi Birimi (OWN_DEPT)',
                      desc: 'Yalnızca kendi birimi ve hiyerarşik alt birimlerini görür.'
                    },
                    {
                      id: 'CUSTOM',
                      title: 'Çoklu Özel Birim (CUSTOM)',
                      desc: 'Kendi birimine ek olarak aşağıdan seçilen birimlere de erişir.'
                    },
                    {
                      id: 'ALL',
                      title: 'Tüm Üniversite (ALL)',
                      desc: 'Üniversitedeki tüm fakülte, MYO ve bölümlere erişir.'
                    }
                  ].map((opt) => (
                    <button
                      type="button"
                      key={opt.id}
                      onClick={() => setEditScopeType(opt.id)}
                      className={`p-3.5 rounded-2xl border text-left transition-all ${
                        editScopeType === opt.id
                          ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-600/15'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <p className="text-xs font-black text-slate-900">{opt.title}</p>
                      <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                        {opt.desc}
                      </p>
                    </button>
                  ))}
                </div>

                {editScopeType === 'CUSTOM' && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <p className="text-xs font-bold text-slate-700">
                      Ek Yetki Verilecek Birimleri Seçiniz (Örn: Bilgisayar Müh. kullanıcısına Yazılım Müh. ekleme):
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1 custom-scrollbar">
                      {departments.map((d) => {
                        const checked = editCustomDepts.includes(d._id);
                        const isPrimary =
                          (selectedUser.departmentId?._id || selectedUser.departmentId) ===
                          d._id;
                        return (
                          <label
                            key={d._id}
                            className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer transition-colors ${
                              checked || isPrimary
                                ? 'bg-blue-50 border-blue-300 font-bold text-blue-900'
                                : 'bg-white border-slate-200 text-slate-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              disabled={isPrimary}
                              checked={checked || isPrimary}
                              onChange={() => toggleCustomDept(d._id, false)}
                              className="w-4 h-4 accent-blue-600 rounded"
                            />
                            <span className="truncate" title={d.name}>
                              {d.name} {isPrimary && '(Ana Birim)'}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Table Permissions Matrix */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs font-black uppercase text-slate-800 flex items-center gap-2">
                    <Users size={16} className="text-blue-600" />
                    2. Tablo Bazlı Yetki Matrisi (Görüntüle / Ekle / Güncelle / Sil / İçe-Dışa Aktar / Onayla)
                  </h4>

                  <div className="flex items-center gap-2">
                    <select
                      value={newPermTemplateCode}
                      onChange={(e) => setNewPermTemplateCode(e.target.value)}
                      className="rounded-xl border border-slate-300 px-2.5 py-1.5 text-xs font-bold"
                    >
                      <option value="*">* (Tüm Tablolar - Genel Kural)</option>
                      {templates.map((t) => (
                        <option key={t.code} value={t.code}>
                          {t.code} - {t.title}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAddPermRow}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center gap-1"
                    >
                      <Plus size={13} /> Tablo Kuralı Ekle
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-100 text-slate-700">
                      <tr>
                        <th className="p-3 border-b border-slate-200 font-black">
                          Şablon / Tablo Kodu
                        </th>
                        {PERM_KEYS.map((pk) => (
                          <th
                            key={pk.key}
                            className="p-3 border-b border-slate-200 font-black text-center"
                          >
                            {pk.label}
                          </th>
                        ))}
                        <th className="p-3 border-b border-slate-200 font-black text-center">
                          Kaldır
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {editPermissions.map((perm, idx) => (
                        <tr
                          key={perm.templateCode || idx}
                          className="border-b border-slate-100 hover:bg-slate-50"
                        >
                          <td className="p-3 font-black text-slate-900">
                            {perm.templateCode === '*'
                              ? '* (Tüm Tablolar Varsayılan)'
                              : perm.templateCode}
                          </td>
                          {PERM_KEYS.map((pk) => (
                            <td key={pk.key} className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={!!perm[pk.key]}
                                onChange={() => handleTogglePermFlag(idx, pk.key)}
                                className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                              />
                            </td>
                          ))}
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemovePermRow(idx)}
                              className="text-slate-400 hover:text-red-600"
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
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-xs text-slate-400">
              Düzenlemek için soldaki listeden bir kullanıcı seçiniz.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

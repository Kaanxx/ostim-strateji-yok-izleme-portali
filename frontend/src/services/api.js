import axios from 'axios';

const resolveBaseUrl = () => {
  const envUrl = process.env.REACT_APP_API_URL;
  if (envUrl !== undefined && envUrl !== null) {
    const trimmed = envUrl.trim();
    if (trimmed === '') {
      // In Docker Nginx build where REACT_APP_API_URL="", relative /api is proxied by Nginx
      return '';
    }
    return trimmed.replace(/\/api\/?$/, '').replace(/\/$/, '');
  }
  return 'http://localhost:5000';
};

export const API_BASE_URL = resolveBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 60000
});

// Request interceptor to attach Bearer JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('otun_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor with automatic fallback between relative /api and http://localhost:5000
api.interceptors.response.use(
  (response) => {
    // If relative request accidentally hit SPA fallback returning index.html
    const contentType = response.headers?.['content-type'] || '';
    if (
      typeof response.data === 'string' &&
      contentType.includes('text/html') &&
      response.config &&
      !response.config._retriedFallback
    ) {
      const retryConfig = {
        ...response.config,
        baseURL: 'http://localhost:5000',
        _retriedFallback: true
      };
      return axios.request(retryConfig);
    }
    return response;
  },
  async (error) => {
    const originalConfig = error.config;
    // Network error fallback between relative '' and 'http://localhost:5000'
    if (
      !error.response &&
      originalConfig &&
      !originalConfig._retriedFallback
    ) {
      originalConfig._retriedFallback = true;
      originalConfig.baseURL =
        originalConfig.baseURL === 'http://localhost:5000'
          ? ''
          : 'http://localhost:5000';
      return axios.request(originalConfig);
    }
    return Promise.reject(error);
  }
);

// Helper to trigger browser file download from Blob response
export const triggerBlobDownload = (blobData, headers, fallbackFilename) => {
  let filename = fallbackFilename || 'tablo.xlsx';
  const disposition = headers?.['content-disposition'] || headers?.['Content-Disposition'];
  if (disposition) {
    const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    const stdMatch = disposition.match(/filename="?([^";]+)"?/i);
    if (utf8Match && utf8Match[1]) {
      try {
        filename = decodeURIComponent(utf8Match[1]);
      } catch (e) {
        filename = utf8Match[1];
      }
    } else if (stdMatch && stdMatch[1]) {
      try {
        filename = decodeURIComponent(stdMatch[1]);
      } catch (e) {
        filename = stdMatch[1];
      }
    }
  }

  const contentType =
    headers?.['content-type'] ||
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const blob = new Blob([blobData], { type: contentType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// ==========================================
// 1. AUTHENTICATION API
// ==========================================
export const authApi = {
  login: async (email, password) => {
    const res = await api.post('/api/auth/login', { email, password });
    return res.data;
  },
  getMe: async () => {
    const res = await api.get('/api/auth/me');
    return res.data;
  },
  changePassword: async (currentPassword, newPassword) => {
    const res = await api.post('/api/auth/change-password', {
      currentPassword,
      newPassword
    });
    return res.data;
  }
};

// ==========================================
// 2. DEPARTMENTS & HIERARCHY API
// ==========================================
export const departmentApi = {
  getDepartments: async (format = 'flat') => {
    const res = await api.get('/api/departments', { params: { format } });
    return res.data;
  },
  getDepartmentTree: async () => {
    const res = await api.get('/api/departments', { params: { format: 'tree' } });
    return res.data;
  },
  createDepartment: async (payload) => {
    const res = await api.post('/api/departments', payload);
    return res.data;
  },
  updateDepartment: async (id, payload) => {
    const res = await api.put(`/api/departments/${id}`, payload);
    return res.data;
  },
  deleteDepartment: async (id) => {
    const res = await api.delete(`/api/departments/${id}`);
    return res.data;
  }
};

// ==========================================
// 3. PERIODS & DEADLINES API
// ==========================================
export const periodApi = {
  getPeriods: async () => {
    const res = await api.get('/api/periods');
    return res.data;
  },
  getActivePeriod: async () => {
    const res = await api.get('/api/periods/active');
    return res.data;
  },
  createPeriod: async (payload) => {
    const res = await api.post('/api/periods', payload);
    return res.data;
  },
  updatePeriod: async (id, payload) => {
    const res = await api.put(`/api/periods/${id}`, payload);
    return res.data;
  },
  setActivePeriod: async (id) => {
    const res = await api.put(`/api/periods/${id}/active`);
    return res.data;
  },
  getDeadlines: async (period) => {
    const res = await api.get(`/api/periods/${encodeURIComponent(period)}/deadlines`);
    return res.data;
  },
  setDeadline: async (period, payload) => {
    const res = await api.post(
      `/api/periods/${encodeURIComponent(period)}/deadlines`,
      payload
    );
    return res.data;
  },
  deleteDeadline: async (period, id) => {
    const res = await api.delete(
      `/api/periods/${encodeURIComponent(period)}/deadlines/${id}`
    );
    return res.data;
  }
};

// ==========================================
// 4. TEMPLATES & DYNAMIC BUILDER API
// ==========================================
export const templateApi = {
  getTemplates: async (params = {}) => {
    const res = await api.get('/api/templates', { params });
    return res.data;
  },
  getTemplateByCode: async (code) => {
    const res = await api.get(`/api/templates/${encodeURIComponent(code)}`);
    return res.data;
  },
  createTemplate: async (payload) => {
    const res = await api.post('/api/templates', payload);
    return res.data;
  },
  updateTemplate: async (code, payload) => {
    const res = await api.put(`/api/templates/${encodeURIComponent(code)}`, payload);
    return res.data;
  },
  deleteTemplate: async (code) => {
    const res = await api.delete(`/api/templates/${encodeURIComponent(code)}`);
    return res.data;
  },
  extractFromExcel: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/api/templates/extract-from-excel', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },
  downloadBlankExcel: async (code, fallbackName) => {
    const res = await api.get(
      `/api/templates/${encodeURIComponent(code)}/blank-excel`,
      { responseType: 'blob' }
    );
    triggerBlobDownload(res.data, res.headers, fallbackName || `${code}_Bos_Sablon.xlsx`);
  }
};

// ==========================================
// 5. RECORDS & FORMULA ENGINE API
// ==========================================
export const recordApi = {
  getRecords: async (templateCode, departmentId, period) => {
    const res = await api.get(`/api/records/${encodeURIComponent(templateCode)}`, {
      params: { departmentId, period }
    });
    return res.data;
  },
  saveRecords: async (templateCode, payload) => {
    const res = await api.post(
      `/api/records/${encodeURIComponent(templateCode)}`,
      payload
    );
    return res.data;
  },
  updateRecord: async (templateCode, id, payload) => {
    const res = await api.put(
      `/api/records/${encodeURIComponent(templateCode)}/${id}`,
      payload
    );
    return res.data;
  },
  deleteRecord: async (templateCode, id, departmentId, period) => {
    const res = await api.delete(
      `/api/records/${encodeURIComponent(templateCode)}/${id}`,
      { params: { departmentId, period } }
    );
    return res.data;
  },
  calculateRecords: async (templateCode, payload) => {
    const res = await api.post(
      `/api/records/${encodeURIComponent(templateCode)}/calculate`,
      payload
    );
    return res.data;
  }
};

// ==========================================
// 6. EXCEL 1:1 EXPORT & VALIDATED IMPORT API
// ==========================================
export const excelApi = {
  exportExcel: async (templateCode, departmentId, period, format = 'template', fallbackName) => {
    const res = await api.get(`/api/excel/export/${encodeURIComponent(templateCode)}`, {
      params: { departmentId, period, format },
      responseType: 'blob'
    });
    const ext =
      (templateCode === 'MYO_UYGULAMALI_EGITIM' || templateCode === 'PROJELER') &&
      format === 'template'
        ? 'xlsm'
        : 'xlsx';
    triggerBlobDownload(
      res.data,
      res.headers,
      fallbackName || `${templateCode}_${period}.${ext}`
    );
  },
  importExcel: async (templateCode, file, departmentId, period, commit = 'true') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('departmentId', departmentId);
    formData.append('period', period);
    formData.append('commit', String(commit));

    const res = await api.post(
      `/api/excel/import/${encodeURIComponent(templateCode)}`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        validateStatus: (status) => status < 500 // Resolve 400 validation errors gracefully
      }
    );
    return res.data;
  }
};

// ==========================================
// 7. WORKFLOW APPROVAL API
// ==========================================
export const workflowApi = {
  getSummary: async (period) => {
    const res = await api.get('/api/workflow/summary', { params: { period } });
    return res.data;
  },
  getStatus: async (templateCode, departmentId, period) => {
    const res = await api.get(`/api/workflow/${encodeURIComponent(templateCode)}`, {
      params: { departmentId, period }
    });
    return res.data;
  },
  submit: async (templateCode, departmentId, period, notes = '') => {
    const res = await api.post(
      `/api/workflow/${encodeURIComponent(templateCode)}/submit`,
      { departmentId, period, notes }
    );
    return res.data;
  },
  review: async (templateCode, departmentId, period, action, note = '') => {
    const res = await api.post(
      `/api/workflow/${encodeURIComponent(templateCode)}/review`,
      { departmentId, period, action, note }
    );
    return res.data;
  }
};

// ==========================================
// 8. USERS, RBAC & AUDIT LOGS API (ADMIN)
// ==========================================
export const userApi = {
  getUsers: async (params = {}) => {
    const res = await api.get('/api/users', { params });
    return res.data;
  },
  createUser: async (payload) => {
    const res = await api.post('/api/users', payload);
    return res.data;
  },
  updateUser: async (id, payload) => {
    const res = await api.put(`/api/users/${id}`, payload);
    return res.data;
  },
  updatePermissions: async (id, payload) => {
    const res = await api.put(`/api/users/${id}/permissions`, payload);
    return res.data;
  },
  updateScope: async (id, payload) => {
    const res = await api.put(`/api/users/${id}/scope`, payload);
    return res.data;
  },
  deleteUser: async (id) => {
    const res = await api.delete(`/api/users/${id}`);
    return res.data;
  }
};

export const auditApi = {
  getLogs: async (params = {}) => {
    const res = await api.get('/api/audit-logs', { params });
    return res.data;
  }
};

export default api;

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

/**
 * Hàm phụ trợ thực hiện các request HTTP tới Backend
 * @param {string} endpoint 
 * @param {object} options 
 * @returns {Promise<any>}
 */
async function request(endpoint, options = {}) {
  const url = `${BACKEND_URL}${endpoint}`;
  
  // Thiết lập các headers mặc định
  const headers = {
    ...options.headers,
  };

  // Đính kèm token nếu tồn tại trong localStorage
  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Tự động thêm Content-Type nếu gửi body
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Đọc dữ liệu phản hồi (JSON hoặc text)
  let data;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMessage = (data && data.error) || `Yêu cầu thất bại với mã lỗi ${response.status}`;
    throw new Error(errorMessage);
  }

  return data;
}

export const api = {
  // --- Link APIs ---
  getLinks: () => request('/api/links'),
  
  searchLinks: (query, threshold, limit) => 
    request('/api/search', {
      method: 'POST',
      body: JSON.stringify({ query, threshold, limit }),
    }),

  createLink: (linkData) => 
    request('/api/links', {
      method: 'POST',
      body: JSON.stringify(linkData),
    }),

  analyzeLink: (rawText) => 
    request('/api/links/analyze', {
      method: 'POST',
      body: JSON.stringify({ rawText }),
    }),

  updateLink: (id, linkData) => 
    request(`/api/links/${id}`, {
      method: 'PUT',
      body: JSON.stringify(linkData),
    }),

  deleteLink: (id) => 
    request(`/api/links/${id}`, {
      method: 'DELETE',
    }),

  trackClick: (id) => 
    request(`/api/links/${id}/click`, {
      method: 'POST',
    }),

  // --- Auth APIs ---
  login: (username, password) => 
    request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  changePassword: (currentPassword, newPassword) =>
    request('/api/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  // --- User APIs (Admin) ---
  getUsers: () => request('/api/users'),

  createUser: (username, password) => 
    request('/api/users', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  updateUser: (id, payload) => 
    request(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteUser: (id) => 
    request(`/api/users/${id}`, {
      method: 'DELETE',
    }),

  // --- Admin Dashboard APIs ---
  getAdminHealthCheck: () => request('/api/admin/health-check'),
  
  getAdminLogs: (params) => {
    const query = new URLSearchParams();
    if (params.actionType) query.append('actionType', params.actionType);
    if (params.search) query.append('search', params.search);
    if (params.username) query.append('username', params.username);
    if (params.date) query.append('date', params.date);
    if (params.limit) query.append('limit', params.limit);
    if (params.offset) query.append('offset', params.offset);
    return request(`/api/admin/logs?${query.toString()}`);
  },

  // --- Settings APIs ---
  getPublicSettings: () => request('/api/settings'),
  getAdminSettings: () => request('/api/admin/settings'),
  updateAdminSettings: (settings) => request('/api/admin/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  }),
};

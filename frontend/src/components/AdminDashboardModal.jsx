import React, { useState, useEffect, useRef } from 'react';
import { X, Users, UserPlus, Trash2, Edit2, Save, Key, AlertCircle, Activity, Database, Server, Sparkles, Brain, ClipboardList, Search, RefreshCw, CheckCircle2, XCircle, ArrowRight, Shield, Settings } from 'lucide-react';
import { api } from '../services/api';

const AdminDashboardModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('managers'); // 'managers', 'connections', 'logs', 'settings'
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // ---------------- MANAGER MANAGEMENT STATE ----------------
  const [managers, setManagers] = useState([]);
  const [loadingManagers, setLoadingManagers] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingUsername, setEditingUsername] = useState('');
  const [editingPassword, setEditingPassword] = useState('');

  // ---------------- CONNECTION / HEALTH CHECK STATE ----------------
  const [healthData, setHealthData] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [healthError, setHealthError] = useState('');

  // ---------------- SYSTEM LOGS STATE ----------------
  const [logs, setLogs] = useState([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsError, setLogsError] = useState('');

  // ---------------- SYSTEM SETTINGS STATE ----------------
  const [settingsData, setSettingsData] = useState({
    rate_limiting: { enabled: true, login_limit: 10, create_link_limit: 10, analyze_limit: 5, search_limit: 15, click_limit: 30 },
    permissions: { guest: [], manager: [] },
    system: { maintenance_mode: false, log_retention_days: 30, default_search_limit: 9, default_search_threshold: 0.3 }
  });
  const [loadingSettings, setLoadingSettings] = useState(false);

  // Log Filters
  const [actionTypeFilter, setActionTypeFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [tempSearchFilter, setTempSearchFilter] = useState('');
  const [usernameFilter, setUsernameFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [logsLimit, setLogsLimit] = useState(50);
  const searchTimeoutRef = useRef(null);

  // Fetch managers logic
  const fetchManagers = async () => {
    if (!localStorage.getItem('token')) return;
    setLoadingManagers(true);
    setError('');
    try {
      const data = await api.getUsers();
      setManagers(data || []);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Lỗi tải danh sách manager');
    } finally {
      setLoadingManagers(false);
    }
  };

  // Fetch health data logic
  const fetchHealth = async () => {
    if (!localStorage.getItem('token')) return;
    setLoadingHealth(true);
    setHealthError('');
    try {
      const data = await api.getAdminHealthCheck();
      setHealthData(data);
    } catch (err) {
      console.error(err);
      setHealthError(err.message || 'Lỗi tải thông tin trạng thái kết nối');
    } finally {
      setLoadingHealth(false);
    }
  };

  // Fetch logs logic
  const fetchLogs = async (reset = false) => {
    if (!localStorage.getItem('token')) return;
    setLoadingLogs(true);
    setLogsError('');
    const currentOffset = reset ? 0 : logs.length;
    try {
      const data = await api.getAdminLogs({
        actionType: actionTypeFilter,
        search: searchFilter,
        username: usernameFilter,
        date: dateFilter,
        limit: logsLimit,
        offset: currentOffset
      });
      if (reset) {
        setLogs(data.logs || []);
      } else {
        setLogs(prev => [...prev, ...(data.logs || [])]);
      }
      setLogsTotal(data.total || 0);
    } catch (err) {
      console.error(err);
      setLogsError(err.message || 'Lỗi tải nhật ký hệ thống');
    } finally {
      setLoadingLogs(false);
    }
  };

  // Fetch dynamic system settings logic
  const fetchSettings = async () => {
    if (!localStorage.getItem('token')) return;
    setLoadingSettings(true);
    setError('');
    try {
      const data = await api.getAdminSettings();
      setSettingsData(data || {});
    } catch (err) {
      console.error(err);
      setError(err.message || 'Lỗi tải cấu hình hệ thống');
    } finally {
      setLoadingSettings(false);
    }
  };

  // Trigger loads based on active tab
  useEffect(() => {
    if (isOpen) {
      setError('');
      setSuccessMsg('');
      // Luôn tải danh sách manager để phục vụ hiển thị bộ lọc người dùng
      fetchManagers();
      
      if (activeTab === 'connections') {
        fetchHealth();
      } else if (activeTab === 'logs') {
        fetchLogs(true);
      } else if (activeTab === 'settings') {
        fetchSettings();
      }
    }
  }, [isOpen, activeTab]);

  // Effect to load logs on filter change
  useEffect(() => {
    if (isOpen && activeTab === 'logs') {
      fetchLogs(true);
    }
  }, [actionTypeFilter, searchFilter, usernameFilter, dateFilter, logsLimit]);

  // Handle live search filter typing with debounce
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setTempSearchFilter(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setSearchFilter(value);
    }, 600);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setTempSearchFilter('');
    setSearchFilter('');
    setActionTypeFilter('');
    setUsernameFilter('');
    setDateFilter('');
    setLogsLimit(50);
  };

  // ----------------- SYSTEM SETTINGS HANDLERS -----------------
  const handleRateLimitChange = (key, value) => {
    const parsedVal = parseInt(value, 10);
    setSettingsData(prev => ({
      ...prev,
      rate_limiting: {
        ...prev.rate_limiting,
        [key]: isNaN(parsedVal) ? '' : parsedVal
      }
    }));
  };

  const handleSystemSettingChange = (key, value) => {
    setSettingsData(prev => ({
      ...prev,
      system: {
        ...prev.system,
        [key]: value
      }
    }));
  };

  const handlePermissionToggle = (role, permission) => {
    setSettingsData(prev => {
      const currentRolePerms = prev.permissions?.[role] || [];
      const updatedPerms = currentRolePerms.includes(permission)
        ? currentRolePerms.filter(p => p !== permission)
        : [...currentRolePerms, permission];
      
      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          [role]: updatedPerms
        }
      };
    });
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const response = await api.updateAdminSettings(settingsData);
      setSettingsData(response.settings);
      setSuccessMsg('Đã lưu cấu hình hệ thống thành công');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Lỗi cập nhật cấu hình hệ thống');
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  // ----------------- MANAGER CRUD HANDLERS -----------------
  const handleAddManager = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Vui lòng nhập tên đăng nhập và mật khẩu');
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const data = await api.createUser(username.trim(), password);
      setSuccessMsg(`Đã tạo thành công tài khoản: ${data.username}`);
      setUsername('');
      setPassword('');
      fetchManagers();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Lỗi thêm manager');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteManager = async (id, name) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa tài khoản Manager: "${name}" không?`)) return;

    setActionLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      await api.deleteUser(id);
      setSuccessMsg(`Đã xóa thành công tài khoản Manager "${name}"`);
      fetchManagers();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Lỗi xóa manager');
    } finally {
      setActionLoading(false);
    }
  };

  const startEdit = (manager) => {
    setEditingId(manager.id);
    setEditingUsername(manager.username);
    setEditingPassword('');
  };

  const handleSaveEdit = async (id) => {
    if (!editingUsername.trim()) {
      setError('Tên đăng nhập không được để trống');
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const payload = { username: editingUsername.trim() };
      if (editingPassword) payload.password = editingPassword;

      await api.updateUser(id, payload);
      setSuccessMsg(`Cập nhật thông tin tài khoản thành công`);
      setEditingId(null);
      fetchManagers();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Lỗi cập nhật manager');
    } finally {
      setActionLoading(false);
    }
  };

  // Helper formats Action Type badge
  const renderActionBadge = (type) => {
    let text = type;
    let className = 'badge-gray';

    switch (type) {
      case 'CREATE_LINK':
        text = 'Thêm liên kết';
        className = 'badge-green';
        break;
      case 'UPDATE_LINK':
        text = 'Cập nhật liên kết';
        className = 'badge-blue';
        break;
      case 'DELETE_LINK':
        text = 'Xóa liên kết';
        className = 'badge-red';
        break;
      case 'CLICK_LINK':
        text = 'Click link';
        className = 'badge-cyan';
        break;
      case 'GEMINI_EMBEDDING':
        text = 'Gemini Embedding';
        className = 'badge-purple';
        break;
      case 'DEEPSEEK_ANALYZE':
        text = 'DeepSeek Trích xuất';
        className = 'badge-violet';
        break;
      case 'CREATE_USER':
        text = 'Thêm Manager';
        className = 'badge-orange';
        break;
      case 'UPDATE_USER':
        text = 'Sửa Manager';
        className = 'badge-orange';
        break;
      case 'DELETE_USER':
        text = 'Xóa Manager';
        className = 'badge-orange';
        break;
      default:
        break;
    }

    return <span className={`log-badge ${className}`}>{text}</span>;
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content modal-large glass-panel border-glow admin-dashboard-modal" onClick={(e) => e.stopPropagation()}>

        {/* Modal Header */}
        <div className="modal-header">
          <h3 className="modal-title text-gradient flex-center gap-2">
            <Shield size={20} />
            <span>Bảng Quản Trị Hệ Thống</span>
          </h3>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Custom Tabs Navigation */}
        <div className="admin-tabs-row">
          <button
            className={`admin-tab-btn ${activeTab === 'managers' ? 'active' : ''}`}
            onClick={() => { setActiveTab('managers'); setError(''); setSuccessMsg(''); }}
            title="Quản lý Managers"
          >
            <Users size={16} />
            <span>Quản lý Managers</span>
          </button>
          <button
            className={`admin-tab-btn ${activeTab === 'connections' ? 'active' : ''}`}
            onClick={() => { setActiveTab('connections'); setError(''); setSuccessMsg(''); }}
            title="Kiểm tra Kết nối"
          >
            <Activity size={16} />
            <span>Kiểm tra Kết nối</span>
          </button>
          <button
            className={`admin-tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => { setActiveTab('logs'); setError(''); setSuccessMsg(''); }}
            title="Nhật ký Hoạt động"
          >
            <ClipboardList size={16} />
            <span>Nhật ký Hoạt động</span>
          </button>
          <button
            className={`admin-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => { setActiveTab('settings'); setError(''); setSuccessMsg(''); }}
            title="Cấu hình hệ thống"
          >
            <Settings size={16} />
            <span>Cấu hình</span>
          </button>
        </div>

        {/* Global Success / Error Notification in Modal */}
        {error && (
          <div className="error-banner mb-4 flex-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="success-banner mb-4">
            {successMsg}
          </div>
        )}

        {/* Main Tab Contents */}
        <div className="admin-tab-content">

          {/* TAB 1: MANAGERS */}
          {activeTab === 'managers' && (
            <div className="management-layout">
              {/* Add Manager Form */}
              <div className="add-manager-sec">
                <h4 className="section-subtitle flex-center gap-1.5">
                  <UserPlus size={16} /> Thêm Manager mới
                </h4>
                <form onSubmit={handleAddManager} className="form-container">
                  <div className="form-group">
                    <label className="form-label">Tên đăng nhập</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Ví dụ: manager_an"
                      disabled={actionLoading}
                      className="input-field"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Mật khẩu</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Nhập mật khẩu"
                      disabled={actionLoading}
                      className="input-field"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="btn-primary w-full flex-center gap-2 mt-2"
                  >
                    {actionLoading ? (
                      <>
                        <div className="btn-spinner"></div>
                        <span>Đang tạo...</span>
                      </>
                    ) : (
                      <span>Tạo tài khoản</span>
                    )}
                  </button>
                </form>
              </div>

              {/* Manager List */}
              <div className="managers-list-sec">
                <h4 className="section-subtitle">Danh sách tài khoản</h4>
                {loadingManagers ? (
                  <div className="flex-center py-8">
                    <div className="btn-spinner icon-purple"></div>
                  </div>
                ) : managers.length === 0 ? (
                  <div className="empty-sub-state">Chưa có tài khoản Manager nào.</div>
                ) : (
                  <div className="managers-table-container">
                    <table className="managers-table">
                      <thead>
                        <tr>
                          <th>Tên đăng nhập</th>
                          <th>Ngày tạo</th>
                          <th style={{ textAlign: 'right' }}>Hành động</th>
                        </tr>
                      </thead>
                      <tbody>
                        {managers.map((m) => (
                          <tr key={m.id}>
                            <td>
                              {editingId === m.id ? (
                                <input
                                  type="text"
                                  value={editingUsername}
                                  onChange={(e) => setEditingUsername(e.target.value)}
                                  className="input-field input-sm"
                                  required
                                />
                              ) : (
                                <span className="font-semibold text-primary-dark">{m.username}</span>
                              )}
                            </td>
                            <td>{new Date(m.created_at).toLocaleDateString('vi-VN')}</td>
                            <td style={{ textAlign: 'right' }}>
                              {editingId === m.id ? (
                                <div className="table-actions">
                                  <div className="password-edit-sm">
                                    <input
                                      type="password"
                                      placeholder="Mật khẩu mới (nếu sửa)"
                                      value={editingPassword}
                                      onChange={(e) => setEditingPassword(e.target.value)}
                                      className="input-field input-sm input-pwd"
                                    />
                                  </div>
                                  <button
                                    onClick={() => handleSaveEdit(m.id)}
                                    disabled={actionLoading}
                                    className="action-btn-save flex-center"
                                    title="Lưu lại"
                                  >
                                    <Save size={14} />
                                  </button>
                                  <button
                                    onClick={() => setEditingId(null)}
                                    className="action-btn-cancel flex-center"
                                    title="Hủy bỏ"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ) : (
                                <div className="table-actions">
                                  <button
                                    onClick={() => startEdit(m)}
                                    className="action-btn-edit flex-center"
                                    title="Sửa tài khoản"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteManager(m.id, m.username)}
                                    disabled={actionLoading}
                                    className="action-btn-delete flex-center"
                                    title="Xóa tài khoản"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CONNECTIONS */}
          {activeTab === 'connections' && (
            <div className="connections-tab-sec animated-fade-in">
              <div className="section-header-with-btn">
                <h4 className="section-subtitle" style={{ marginBottom: 0 }}>Trạng thái kết nối & API lượng truy cập</h4>
                <button
                  onClick={fetchHealth}
                  disabled={loadingHealth}
                  className="btn-secondary flex-center gap-1.5 btn-sm"
                  style={{ padding: '0.4rem 0.8rem' }}
                >
                  <RefreshCw size={12} className={loadingHealth ? 'animate-spin' : ''} />
                  <span>Kiểm tra lại</span>
                </button>
              </div>

              {loadingHealth ? (
                <div className="flex-center py-12">
                  <div className="btn-spinner icon-purple" style={{ width: '2rem', height: '2rem' }}></div>
                  <span className="ml-2 font-semibold text-muted">Đang truy vấn hệ thống...</span>
                </div>
              ) : healthError ? (
                <div className="error-banner flex-center gap-2 mt-4">
                  <AlertCircle size={16} />
                  <span>{healthError}</span>
                </div>
              ) : healthData ? (
                <div className="connection-status-grid">

                  {/* Supabase Database Box */}
                  <div className="status-card glass-panel border-glow">

                    <div className="status-header">
                      <div className="status-title-group">
                        <div className="status-icon-box bg-purple">
                          <Database size={18} />
                        </div>
                        <h5 className="status-card-title">Supabase Database</h5>
                      </div>
                      <span className={`status-badge ${healthData.database.status}`}>
                        {healthData.database.status === 'connected' ? 'ĐÃ KẾT NỐI' : 'MẤT KẾT NỐI'}
                      </span>
                    </div>
                  </div>

                  {/* Backend Server Box */}
                  <div className="status-card glass-panel border-glow">
                    <div className="status-header">
                      <div className="status-title-group">
                        <div className="status-icon-box bg-blue">
                          <Server size={18} />
                        </div>
                        <h5 className="status-card-title">Backend Server</h5>
                      </div>
                      <span className="status-badge connected">ĐANG CHẠY</span>
                    </div>
                  </div>

                  {/* DeepSeek AI Box */}
                  <div className="status-card glass-panel border-glow">
                    <div className="status-header">
                      <div className="status-title-group">
                        <div className="status-icon-box bg-indigo">
                          <Brain size={18} />
                        </div>
                        <h5 className="status-card-title">DeepSeek AI</h5>
                      </div>
                      <span className={`status-badge ${healthData.deepseek.status}`}>
                        {healthData.deepseek.status === 'connected' ? 'ĐANG HOẠT ĐỘNG' : 'LỖI CẤU HÌNH'}
                      </span>
                    </div>

                    <div className="stat-row">
                      <span className="stat-label">
                        Model: <span className="font-semibold text-primary" style={{ marginLeft: '4px' }}>deepseek-v4-flash</span>
                      </span>
                      <span className="stat-val text-muted font-semibold" style={{ fontSize: '0.8rem' }}>
                        {healthData.deepseek.latency ? `ping: ${healthData.deepseek.latency} ms` : 'ping: N/A'}
                      </span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">Tổng request trong ngày:</span>
                      <span className="stat-val font-semibold">{healthData.deepseek.requestCount?.day ?? 0}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">Tổng request trong tháng:</span>
                      <span className="stat-val font-semibold">{healthData.deepseek.requestCount?.month ?? 0}</span>
                    </div>
                    {healthData.deepseek.error && (
                      <p className="status-error-text mt-2"><AlertCircle size={10} inline /> {healthData.deepseek.error}</p>
                    )}
                  </div>

                  {/* Gemini AI Box */}
                  <div className="status-card glass-panel border-glow">
                    <div className="status-header">
                      <div className="status-title-group">
                        <div className="status-icon-box bg-cyan">
                          <Sparkles size={18} />
                        </div>
                        <h5 className="status-card-title">Gemini AI</h5>
                      </div>
                      <span className={`status-badge ${healthData.gemini.status}`}>
                        {healthData.gemini.status === 'connected' ? 'ĐANG HOẠT ĐỘNG' : 'LỖI CẤU HÌNH'}
                      </span>
                    </div>

                    <div className="stat-row">
                      <span className="stat-label">
                        Model: <span className="font-semibold text-primary" style={{ marginLeft: '4px' }}>gemini-embedding-001</span>
                      </span>
                      <span className="stat-val text-muted font-semibold" style={{ fontSize: '0.8rem' }}>
                        {healthData.gemini.latency ? `ping: ${healthData.gemini.latency} ms` : 'ping: N/A'}
                      </span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">Tổng request trong ngày:</span>
                      <span className="stat-val font-semibold">{healthData.gemini.requestCount?.day ?? 0}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">Tổng request trong tháng:</span>
                      <span className="stat-val font-semibold">{healthData.gemini.requestCount?.month ?? 0}</span>
                    </div>
                    {healthData.gemini.error && (
                      <p className="status-error-text mt-2"><AlertCircle size={10} inline /> {healthData.gemini.error}</p>
                    )}
                  </div>



                </div>
              ) : (
                <div className="empty-sub-state mt-4">Không có dữ liệu kết nối. Hãy thử làm mới.</div>
              )}
            </div>
          )}

          {/* TAB 3: SYSTEM LOGS */}
          {activeTab === 'logs' && (
            <div className="logs-tab-sec animated-fade-in">
              <h4 className="section-subtitle">Nhật ký hoạt động hệ thống ({logsTotal})</h4>

              {/* Log filtering controls */}
              <div className="logs-filter-bar glass-panel" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', padding: '1rem' }}>
                <div className="filter-item search-box">
                  <Search size={14} className="search-icon" />
                  <input
                    type="text"
                    value={tempSearchFilter}
                    onChange={handleSearchChange}
                    placeholder="Tìm chi tiết hoạt động..."
                    className="input-field input-sm search-log-input"
                  />
                </div>

                <div className="filter-item select-box">
                  <select
                    value={actionTypeFilter}
                    onChange={(e) => setActionTypeFilter(e.target.value)}
                    className="input-field input-sm select-log-action"
                  >
                    <option value="">-- Tất cả hành động --</option>
                    <option value="CREATE_LINK">Thêm liên kết</option>
                    <option value="UPDATE_LINK">Cập nhật liên kết</option>
                    <option value="DELETE_LINK">Xóa liên kết</option>
                    <option value="CLICK_LINK">User Click link</option>
                    <option value="GEMINI_EMBEDDING">Gemini AI Request</option>
                    <option value="DEEPSEEK_ANALYZE">DeepSeek AI Request</option>
                    <option value="CREATE_USER">Tạo Manager</option>
                    <option value="UPDATE_USER">Sửa Manager</option>
                    <option value="DELETE_USER">Xóa Manager</option>
                  </select>
                </div>

                <div className="filter-item select-box">
                  <select
                    value={usernameFilter}
                    onChange={(e) => setUsernameFilter(e.target.value)}
                    className="input-field input-sm"
                  >
                    <option value="">-- Tất cả tài khoản --</option>
                    <option value="Guest">Guest (Khách)</option>
                    <option value="admin">admin (Admin)</option>
                    {managers.map(m => (
                      <option key={m.id} value={m.username}>{m.username} (Manager)</option>
                    ))}
                  </select>
                </div>

                <div className="filter-item date-box">
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="input-field input-sm"
                    style={{ cursor: 'pointer' }}
                  />
                </div>

                <div className="filter-item select-box">
                  <select
                    value={logsLimit}
                    onChange={(e) => setLogsLimit(parseInt(e.target.value, 10))}
                    className="input-field input-sm select-log-limit"
                    title="Số bản ghi hiển thị"
                  >
                    <option value={50}>Hiển thị 50 dòng</option>
                    <option value={100}>Hiển thị 100 dòng</option>
                    <option value={200}>Hiển thị 200 dòng</option>
                  </select>
                </div>

                <div className="filter-actions-row" style={{ display: 'flex', gap: '0.5rem', gridColumn: '1 / -1', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                  <button
                    onClick={handleClearFilters}
                    className="btn-secondary btn-sm flex-center"
                    title="Xóa bộ lọc"
                    disabled={!actionTypeFilter && !searchFilter && !usernameFilter && !dateFilter && logsLimit === 50}
                    style={{ padding: '0.45rem 1rem' }}
                  >
                    <span>Làm mới bộ lọc</span>
                  </button>

                  <button
                    onClick={() => fetchLogs(true)}
                    disabled={loadingLogs}
                    className="btn-primary btn-sm flex-center gap-1.5"
                    style={{ padding: '0.45rem 1.2rem' }}
                  >
                    <RefreshCw size={12} className={loadingLogs ? 'animate-spin' : ''} />
                    <span>Tải lại</span>
                  </button>
                </div>
              </div>

              {logsError && (
                <div className="error-banner flex-center gap-2 mt-4">
                  <AlertCircle size={16} />
                  <span>{logsError}</span>
                </div>
              )}

              {/* Log Table List */}
              <div className="logs-table-wrapper" style={{ marginTop: '1.25rem' }}>
                {logs.length === 0 ? (
                  loadingLogs ? (
                    <div className="flex-center py-12">
                      <div className="btn-spinner icon-purple"></div>
                    </div>
                  ) : (
                    <div className="empty-sub-state">Không tìm thấy bản ghi nhật ký hoạt động nào phù hợp.</div>
                  )
                ) : (
                  <>
                    <table className="logs-table">
                      <thead>
                        <tr>
                          <th>Thời gian</th>
                          <th>Tài khoản</th>
                          <th>Hành động</th>
                          <th>Chi tiết hoạt động</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((log) => (
                          <tr key={log.id}>
                            <td className="log-time" style={{ whiteSpace: 'nowrap' }}>
                              {new Date(log.created_at).toLocaleString('vi-VN')}
                            </td>
                            <td className="log-user font-semibold">
                              <span className={log.username === 'admin' ? 'text-danger' : log.username === 'Guest' ? 'text-muted' : 'text-primary'}>
                                {log.username}
                              </span>
                            </td>
                            <td>{renderActionBadge(log.action_type)}</td>
                            <td className="log-details text-muted">{log.details}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Load more button */}
                    {logs.length < logsTotal && (
                      <div className="flex-center mt-4 mb-2">
                        <button
                          onClick={() => fetchLogs(false)}
                          disabled={loadingLogs}
                          className="btn-secondary btn-sm flex-center gap-1.5"
                          style={{ padding: '0.5rem 1.2rem' }}
                        >
                          {loadingLogs ? (
                            <div className="btn-spinner"></div>
                          ) : (
                            <>
                              <span>Tải thêm lịch sử</span>
                              <ArrowRight size={12} />
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: SYSTEM SETTINGS */}
          {activeTab === 'settings' && (
            <div className="settings-tab-sec animated-fade-in">
              <h4 className="section-subtitle flex-center gap-1.5" style={{ marginBottom: '1.25rem' }}>
                <Settings size={16} /> Cấu hình hệ thống động
              </h4>
              
              {loadingSettings ? (
                <div className="flex-center py-12">
                  <div className="btn-spinner icon-purple"></div>
                  <span className="ml-2 font-semibold text-muted">Đang tải cài đặt hệ thống...</span>
                </div>
              ) : (
                <form onSubmit={handleSaveSettings} className="settings-form">
                  <div className="settings-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                    
                    {/* Rate Limiting Card */}
                    <div className="settings-card glass-panel border-glow" style={{ padding: '1.25rem', borderRadius: '12px' }}>
                      <h5 className="settings-card-title flex-center gap-1.5" style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--primary)' }}>
                        <Activity size={16} /> Tần suất yêu cầu (Rate Limit)
                      </h5>
                      <div className="form-group flex-center" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0.75rem 0' }}>
                        <label className="form-label" style={{ marginBottom: 0, fontWeight: 600 }}>Kích hoạt Rate Limiting</label>
                        <label className="toggle-switch-container">
                          <input 
                            type="checkbox" 
                            checked={settingsData.rate_limiting?.enabled || false}
                            onChange={(e) => setSettingsData(prev => ({
                              ...prev,
                              rate_limiting: { ...prev.rate_limiting, enabled: e.target.checked }
                            }))}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>
                      
                      <div className="rate-limit-inputs" style={{ opacity: settingsData.rate_limiting?.enabled ? 1 : 0.5, pointerEvents: settingsData.rate_limiting?.enabled ? 'auto' : 'none', transition: 'all 0.2s' }}>
                        <div className="form-group" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0.5rem 0' }}>
                          <span className="text-muted" style={{ fontSize: '0.88rem' }}>Đăng nhập (lần/phút):</span>
                          <input 
                            type="number" 
                            min="1" 
                            max="200"
                            value={settingsData.rate_limiting?.login_limit || 10}
                            onChange={(e) => handleRateLimitChange('login_limit', e.target.value)}
                            className="input-field"
                            style={{ width: '80px', padding: '0.35rem 0.5rem', textAlign: 'center', borderRadius: '6px' }}
                          />
                        </div>
                        <div className="form-group" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0.5rem 0' }}>
                          <span className="text-muted" style={{ fontSize: '0.88rem' }}>Tìm kiếm (lần/phút):</span>
                          <input 
                            type="number" 
                            min="1" 
                            max="200"
                            value={settingsData.rate_limiting?.search_limit || 15}
                            onChange={(e) => handleRateLimitChange('search_limit', e.target.value)}
                            className="input-field"
                            style={{ width: '80px', padding: '0.35rem 0.5rem', textAlign: 'center', borderRadius: '6px' }}
                          />
                        </div>
                        <div className="form-group" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0.5rem 0' }}>
                          <span className="text-muted" style={{ fontSize: '0.88rem' }}>Thêm liên kết (lần/phút):</span>
                          <input 
                            type="number" 
                            min="1" 
                            max="200"
                            value={settingsData.rate_limiting?.create_link_limit || 10}
                            onChange={(e) => handleRateLimitChange('create_link_limit', e.target.value)}
                            className="input-field"
                            style={{ width: '80px', padding: '0.35rem 0.5rem', textAlign: 'center', borderRadius: '6px' }}
                          />
                        </div>
                        <div className="form-group" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0.5rem 0' }}>
                          <span className="text-muted" style={{ fontSize: '0.88rem' }}>AI phân tích (lần/phút):</span>
                          <input 
                            type="number" 
                            min="1" 
                            max="200"
                            value={settingsData.rate_limiting?.analyze_limit || 5}
                            onChange={(e) => handleRateLimitChange('analyze_limit', e.target.value)}
                            className="input-field"
                            style={{ width: '80px', padding: '0.35rem 0.5rem', textAlign: 'center', borderRadius: '6px' }}
                          />
                        </div>
                        <div className="form-group" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0.5rem 0' }}>
                          <span className="text-muted" style={{ fontSize: '0.88rem' }}>Click liên kết (lần/phút):</span>
                          <input 
                            type="number" 
                            min="1" 
                            max="200"
                            value={settingsData.rate_limiting?.click_limit || 30}
                            onChange={(e) => handleRateLimitChange('click_limit', e.target.value)}
                            className="input-field"
                            style={{ width: '80px', padding: '0.35rem 0.5rem', textAlign: 'center', borderRadius: '6px' }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Permissions Card */}
                    <div className="settings-card glass-panel border-glow" style={{ padding: '1.25rem', borderRadius: '12px' }}>
                      <h5 className="settings-card-title flex-center gap-1.5" style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--secondary)' }}>
                        <Shield size={16} /> Phân Quyền Hệ Thống
                      </h5>
                      
                      {/* Guest Permissions */}
                      <div className="permissions-group" style={{ marginBottom: '1rem' }}>
                        <span className="font-semibold" style={{ fontSize: '0.9rem', display: 'block', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginBottom: '8px', color: 'var(--text-muted)' }}>Quyền của Khách (Guest)</span>
                        <div style={{ display: 'flex', alignItems: 'center', margin: '6px 0' }}>
                          <input 
                            type="checkbox" 
                            id="p_guest_view"
                            checked={settingsData.permissions?.guest?.includes('view_links') || false}
                            onChange={() => handlePermissionToggle('guest', 'view_links')}
                            style={{ marginRight: '8px', width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                          <label htmlFor="p_guest_view" style={{ fontSize: '0.88rem', cursor: 'pointer' }}>Xem danh sách link</label>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', margin: '6px 0' }}>
                          <input 
                            type="checkbox" 
                            id="p_guest_search"
                            checked={settingsData.permissions?.guest?.includes('search_links') || false}
                            onChange={() => handlePermissionToggle('guest', 'search_links')}
                            style={{ marginRight: '8px', width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                          <label htmlFor="p_guest_search" style={{ fontSize: '0.88rem', cursor: 'pointer' }}>Tìm kiếm ngữ nghĩa</label>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', margin: '6px 0' }}>
                          <input 
                            type="checkbox" 
                            id="p_guest_click"
                            checked={settingsData.permissions?.guest?.includes('click_link') || false}
                            onChange={() => handlePermissionToggle('guest', 'click_link')}
                            style={{ marginRight: '8px', width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                          <label htmlFor="p_guest_click" style={{ fontSize: '0.88rem', cursor: 'pointer' }}>Click link nguồn</label>
                        </div>
                      </div>

                      {/* Manager Permissions */}
                      <div className="permissions-group" style={{ marginTop: '1rem' }}>
                        <span className="font-semibold" style={{ fontSize: '0.9rem', display: 'block', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginBottom: '8px', color: 'var(--text-muted)' }}>Quyền của Quản lý (Manager)</span>
                        <div style={{ display: 'flex', alignItems: 'center', margin: '6px 0' }}>
                          <input 
                            type="checkbox" 
                            id="p_mgr_create"
                            checked={settingsData.permissions?.manager?.includes('create_link') || false}
                            onChange={() => handlePermissionToggle('manager', 'create_link')}
                            style={{ marginRight: '8px', width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                          <label htmlFor="p_mgr_create" style={{ fontSize: '0.88rem', cursor: 'pointer' }}>Thêm liên kết mới</label>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', margin: '6px 0' }}>
                          <input 
                            type="checkbox" 
                            id="p_mgr_edit"
                            checked={settingsData.permissions?.manager?.includes('edit_link') || false}
                            onChange={() => handlePermissionToggle('manager', 'edit_link')}
                            style={{ marginRight: '8px', width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                          <label htmlFor="p_mgr_edit" style={{ fontSize: '0.88rem', cursor: 'pointer' }}>Chỉnh sửa liên kết</label>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', margin: '6px 0' }}>
                          <input 
                            type="checkbox" 
                            id="p_mgr_delete"
                            checked={settingsData.permissions?.manager?.includes('delete_link') || false}
                            onChange={() => handlePermissionToggle('manager', 'delete_link')}
                            style={{ marginRight: '8px', width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                          <label htmlFor="p_mgr_delete" style={{ fontSize: '0.88rem', cursor: 'pointer' }}>Xóa liên kết</label>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', margin: '6px 0' }}>
                          <input 
                            type="checkbox" 
                            id="p_mgr_analyze"
                            checked={settingsData.permissions?.manager?.includes('analyze_link') || false}
                            onChange={() => handlePermissionToggle('manager', 'analyze_link')}
                            style={{ marginRight: '8px', width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                          <label htmlFor="p_mgr_analyze" style={{ fontSize: '0.88rem', cursor: 'pointer' }}>Sử dụng AI phân tích</label>
                        </div>
                      </div>
                    </div>

                    {/* Advanced System Settings Card */}
                    <div className="settings-card glass-panel border-glow" style={{ padding: '1.25rem', borderRadius: '12px' }}>
                      <h5 className="settings-card-title flex-center gap-1.5" style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--warning)' }}>
                        <Database size={16} /> Thiết Lập Hệ Thống Nâng Cao
                      </h5>
                      
                      <div className="form-group flex-center" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0.75rem 0' }}>
                        <label className="form-label text-danger" style={{ marginBottom: 0, fontWeight: 700 }}>Chế độ bảo trì (Maintenance)</label>
                        <label className="toggle-switch-container">
                          <input 
                            type="checkbox" 
                            checked={settingsData.system?.maintenance_mode || false}
                            onChange={(e) => setSettingsData(prev => ({
                              ...prev,
                              system: { ...prev.system, maintenance_mode: e.target.checked }
                            }))}
                          />
                          <span className="toggle-slider btn-danger-toggle"></span>
                        </label>
                      </div>

                      <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px', margin: '0.8rem 0' }}>
                        <span className="text-muted" style={{ fontSize: '0.88rem' }}>Giữ nhật ký (ngày):</span>
                        <input 
                          type="number" 
                          min="1" 
                          max="365"
                          value={settingsData.system?.log_retention_days || 30}
                          onChange={(e) => handleSystemSettingChange('log_retention_days', parseInt(e.target.value, 10))}
                          className="input-field"
                        />
                      </div>

                      <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px', margin: '0.8rem 0' }}>
                        <span className="text-muted" style={{ fontSize: '0.88rem' }}>Số kết quả tìm kiếm mặc định:</span>
                        <input 
                          type="number" 
                          min="1" 
                          max="50"
                          value={settingsData.system?.default_search_limit || 9}
                          onChange={(e) => handleSystemSettingChange('default_search_limit', parseInt(e.target.value, 10))}
                          className="input-field"
                        />
                      </div>

                      <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px', margin: '0.8rem 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span className="text-muted" style={{ fontSize: '0.88rem' }}>Độ tương đồng mặc định:</span>
                          <span className="font-semibold text-primary" style={{ fontSize: '0.88rem' }}>{Math.round((settingsData.system?.default_search_threshold || 0.3) * 100)}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="0.0" 
                          max="1.0" 
                          step="0.05"
                          value={settingsData.system?.default_search_threshold || 0.3}
                          onChange={(e) => handleSystemSettingChange('default_search_threshold', parseFloat(e.target.value))}
                          className="slider-input"
                          style={{ margin: '0.35rem 0' }}
                        />
                      </div>
                    </div>
                    
                  </div>

                  <div className="flex justify-end" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="btn-primary flex-center gap-1.5"
                      style={{ padding: '0.55rem 2rem' }}
                    >
                      {actionLoading ? (
                        <>
                          <div className="btn-spinner"></div>
                          <span>Đang lưu...</span>
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          <span>Lưu cấu hình</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default AdminDashboardModal;

import React, { useState, useEffect } from 'react';
import { X, Users, UserPlus, Trash2, Edit2, Save, Key, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

const ManagerManagementModal = ({ isOpen, onClose }) => {
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form states for Add/Edit
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [editingId, setEditingId] = useState(null); // ID of manager being edited
  const [editingUsername, setEditingUsername] = useState('');
  const [editingPassword, setEditingPassword] = useState('');

  // Fetch managers when modal opens
  const fetchManagers = async () => {
    if (!localStorage.getItem('token')) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.getUsers();
      setManagers(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Lỗi tải danh sách manager');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchManagers();
      // Reset forms
      setUsername('');
      setPassword('');
      setEditingId(null);
      setError('');
      setSuccessMsg('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Add Manager
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
      const data = await api.createUser(username, password);

      setSuccessMsg(`Đã tạo thành công tài khoản: ${data.username}`);
      setUsername('');
      setPassword('');
      fetchManagers(); // Reload list
    } catch (err) {
      console.error(err);
      setError(err.message || 'Lỗi thêm manager');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Delete Manager
  const handleDeleteManager = async (id, name) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa tài khoản Manager: "${name}" không?`)) return;

    setActionLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      await api.deleteUser(id);

      setSuccessMsg(`Đã xóa thành công tài khoản Manager`);
      fetchManagers();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Lỗi xóa manager');
    } finally {
      setActionLoading(false);
    }
  };

  // Start Edit Mode
  const startEdit = (manager) => {
    setEditingId(manager.id);
    setEditingUsername(manager.username);
    setEditingPassword('');
  };

  // Handle Save Edit
  const handleSaveEdit = async (id) => {
    if (!editingUsername.trim()) {
      setError('Tên đăng nhập không được để trống');
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const payload = { username: editingUsername };
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

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content modal-large glass-panel border-glow" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <h3 className="modal-title text-gradient flex-center gap-2">
            <Users size={20} />
            <span>Quản lý tài khoản</span>
          </h3>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

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

        <div className="management-layout">
          {/* Right Column: Add Manager Form */}
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
                  <>
                    <span>Tạo tài khoản</span>
                  </>
                )}
              </button>
            </form>
          </div>
          {/* Left Column: Manager list */}
          <div className="managers-list-sec">
            <h4 className="section-subtitle">Danh sách tài khoản</h4>
            {loading ? (
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
                            />
                          ) : (
                            <span className="font-semibold">{m.username}</span>
                          )}
                        </td>
                        <td>{new Date(m.created_at).toLocaleDateString('vi-VN')}</td>
                        <td style={{ textAlign: 'right' }}>
                          {editingId === m.id ? (
                            <div className="table-actions">
                              <div className="password-edit-sm">
                                <input
                                  type="password"
                                  placeholder="Mật khẩu mới"
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

      </div>
    </div>
  );
};

export default ManagerManagementModal;

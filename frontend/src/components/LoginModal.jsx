import React, { useState } from 'react';
import { X, LogIn, Lock, User } from 'lucide-react';
import { api } from '../services/api';

const LoginModal = ({ isOpen, onClose, onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Vui lòng nhập đầy đủ tên tài khoản và mật khẩu');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await api.login(username, password);

      // Store in localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      onLoginSuccess(data.user, data.token);
      onClose();
      // Reset form
      setUsername('');
      setPassword('');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Không thể kết nối đến máy chủ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content glass-panel border-glow" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <h3 className="modal-title text-gradient flex-center gap-2">
            <LogIn size={20} />
            <span>Đăng nhập hệ thống</span>
          </h3>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="error-banner mb-4">
            {error}
          </div>
        )}

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="form-container">
          <div className="form-group">
            <label className="form-label">
              <User size={14} /> Tên đăng nhập
            </label>
            <div className="input-with-icon">
              <User size={16} className="input-icon" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập tên đăng nhập"
                disabled={loading}
                className="input-field pl-10"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              <Lock size={14} /> Mật khẩu
            </label>
            <div className="input-with-icon">
              <Lock size={16} className="input-icon" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                disabled={loading}
                className="input-field pl-10"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex-center gap-2 mt-4"
          >
            {loading ? (
              <>
                <div className="btn-spinner"></div>
                <span>Đang đăng nhập...</span>
              </>
            ) : (
              <>
                <span>Đăng nhập</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;

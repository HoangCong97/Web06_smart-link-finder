import React, { useState } from 'react';
import { X, Key, Lock, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

const ChangePasswordModal = ({ isOpen, onClose }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Toggle visibility
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!isOpen) return null;

  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Vui lòng điền đầy đủ tất cả các trường');
      return;
    }

    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu mới và xác nhận mật khẩu không khớp');
      return;
    }

    if (currentPassword === newPassword) {
      setError('Mật khẩu mới không được trùng với mật khẩu hiện tại');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const data = await api.changePassword(currentPassword, newPassword);
      setSuccess(data.message || 'Đổi mật khẩu thành công!');
      // Reset password fields nhưng giữ success message
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Không thể đổi mật khẩu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="modal-content glass-panel border-glow" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <h3 className="modal-title text-gradient flex-center gap-2">
            <Key size={20} />
            <span>Đổi mật khẩu</span>
          </h3>
          <button className="modal-close-btn" onClick={handleClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="error-banner mb-4 flex-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Success Banner */}
        {success && (
          <div className="success-banner mb-4 flex-center gap-2">
            <CheckCircle2 size={16} />
            <span>{success}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="form-container">
          {/* Current Password */}
          <div className="form-group">
            <label className="form-label">
              <Lock size={14} /> Mật khẩu hiện tại
            </label>
            <div className="input-with-icon" style={{ position: 'relative' }}>
              <Lock size={16} className="input-icon" />
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Nhập mật khẩu hiện tại"
                disabled={loading}
                className="input-field pl-10"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="password-toggle-btn"
                tabIndex={-1}
                aria-label={showCurrent ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="form-group">
            <label className="form-label">
              <Key size={14} /> Mật khẩu mới
            </label>
            <div className="input-with-icon" style={{ position: 'relative' }}>
              <Key size={16} className="input-icon" />
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)"
                disabled={loading}
                className="input-field pl-10"
                required
                minLength={6}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="password-toggle-btn"
                tabIndex={-1}
                aria-label={showNew ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {/* Password strength hint */}
            {newPassword && (
              <div className="password-strength-hint" style={{ marginTop: '6px', fontSize: '0.8rem', color: newPassword.length >= 6 ? 'var(--success, #22c55e)' : 'var(--text-muted)' }}>
                {newPassword.length >= 6 ? '✓ Đủ độ dài tối thiểu' : `Còn thiếu ${6 - newPassword.length} ký tự`}
              </div>
            )}
          </div>

          {/* Confirm New Password */}
          <div className="form-group">
            <label className="form-label">
              <Lock size={14} /> Xác nhận mật khẩu mới
            </label>
            <div className="input-with-icon" style={{ position: 'relative' }}>
              <Lock size={16} className="input-icon" />
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                disabled={loading}
                className="input-field pl-10"
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="password-toggle-btn"
                tabIndex={-1}
                aria-label={showConfirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {/* Match indicator */}
            {confirmPassword && (
              <div style={{ marginTop: '6px', fontSize: '0.8rem', color: newPassword === confirmPassword ? 'var(--success, #22c55e)' : '#ef4444' }}>
                {newPassword === confirmPassword ? '✓ Mật khẩu khớp' : '✗ Mật khẩu không khớp'}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex-center gap-2 mt-4"
          >
            {loading ? (
              <>
                <div className="btn-spinner"></div>
                <span>Đang xử lý...</span>
              </>
            ) : (
              <>
                <Key size={16} />
                <span>Đổi mật khẩu</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordModal;

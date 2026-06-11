import React, { useState, useEffect } from 'react';
import { X, Link, FileText, Calendar, Edit3 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';

const EditLinkModal = ({ isOpen, onClose, link, onLinkUpdated }) => {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [deadline, setDeadline] = useState('');
  const [isPinned, setIsPinned] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && link) {
      setUrl(link.url || '');
      setTitle(link.title || '');
      setContent(link.content || '');
      setIsPinned(link.is_pinned || false);
      // Format deadline date to YYYY-MM-DDTHH:MM for input element
      if (link.deadline) {
        const d = new Date(link.deadline);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        setDeadline(`${year}-${month}-${day}T${hours}:${minutes}`);
      } else {
        setDeadline('');
      }
      setError('');
    }
  }, [isOpen, link]);

  if (!isOpen || !link) return null;

  const triggerConfetti = () => {
    confetti({
      particleCount: 50,
      spread: 45,
      origin: { y: 0.8 },
      colors: ['#a855f7', '#06b6d4', '#3b82f6']
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url) {
      setError('Đường dẫn URL là bắt buộc');
      return;
    }
    if (!title) {
      setError('Tiêu đề tìm kiếm là bắt buộc');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await api.updateLink(link.id, {
        url,
        title,
        content: content || '',
        deadline: deadline ? new Date(deadline).toISOString() : null,
        is_pinned: isPinned
      });

      triggerConfetti();
      onLinkUpdated(data);
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Không thể kết nối đến server');
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
            <Edit3 size={20} />
            <span>Sửa thông tin liên kết</span>
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
          {/* URL Input */}
          <div className="form-group">
            <label className="form-label">
              <Link size={14} /> Đường dẫn URL <span className="text-danger">*</span>
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Nhập đường dẫn URL"
              disabled={loading}
              className="input-field"
              required
            />
          </div>

          {/* Title Input */}
          <div className="form-group">
            <label className="form-label">
              <FileText size={14} /> Tiêu đề tìm kiếm <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nhập tiêu đề"
              disabled={loading}
              className="input-field"
              required
            />
          </div>

          {/* Description Input */}
          <div className="form-group">
            <label className="form-label">
              <FileText size={14} /> Mô tả
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Mô tả nội dung của đường dẫn này..."
              disabled={loading}
              className="input-field min-h-80"
            />
          </div>

          {/* Deadline Input */}
          <div className="form-group">
            <label className="form-label">
              <Calendar size={14} /> Deadline
            </label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              disabled={loading}
              className="input-field"
            />
          </div>

          {/* Pinned Option */}
          <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              id="edit-is-pinned"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              disabled={loading}
              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary)' }}
            />
            <label htmlFor="edit-is-pinned" className="form-label" style={{ textTransform: 'none', fontSize: '0.88rem', color: 'var(--text-primary)', cursor: 'pointer', margin: 0 }}>
              Ghim liên kết lên đầu trang
            </label>
          </div>
 
          {/* Submit Buttons */}
          <div className="modal-actions-footer mt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn-secondary flex-center gap-1.5"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-center gap-2"
            >
              {loading ? (
                <>
                  <div className="btn-spinner"></div>
                  <span>Đang cập nhật & băm vector...</span>
                </>
              ) : (
                <>
                  <span>Lưu thay đổi</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditLinkModal;

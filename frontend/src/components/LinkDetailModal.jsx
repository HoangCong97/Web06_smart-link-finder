import React from 'react';
import { X, ExternalLink, Calendar, Clock, FileText } from 'lucide-react';

const LinkDetailModal = ({ isOpen, onClose, link }) => {
  if (!isOpen || !link) return null;

  const { title, url, content, deadline, created_at } = link;

  // Extract domain name
  const getDomain = (urlStr) => {
    try {
      return new URL(urlStr).hostname;
    } catch {
      return '';
    }
  };

  const domain = getDomain(url);

  // Format created date
  const formatCreatedDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  // Format deadline date
  const formatDeadlineDate = (dateStr) => {
    if (!dateStr) return 'Không có';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content glass-panel border-glow modal-detail" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <h3 className="modal-title text-gradient flex-center gap-2">
            <span>Chi tiết</span>
          </h3>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body-detail">
          {/* Description */}
          <div className="detail-section mb-4">
            <h5 className="detail-section-title flex-center gap-1.5">
              <FileText size={15} />
              <span>Mô tả nội dung</span>
            </h5>
            <p className="detail-desc-content">
              {content ? content : 'Không có mô tả cho liên kết này.'}
            </p>
          </div>

          {/* Date Info */}
          <div className="detail-time-grid mb-5">
            <div className="detail-time-item">
              <span className="detail-time-label flex-center gap-1">
                <Calendar size={13} />
                <span>Hạn chót (Deadline):</span>
              </span>
              <span className={`detail-time-value ${deadline ? 'has-deadline' : ''}`}>
                {formatDeadlineDate(deadline)}
              </span>
            </div>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary flex-center gap-2"
            style={{ textDecoration: 'none' }}
          >
            <span>Truy cập liên kết</span>
            <ExternalLink size={15} />
          </a>
        </div>
      </div>
    </div>
  );
};

export default LinkDetailModal;

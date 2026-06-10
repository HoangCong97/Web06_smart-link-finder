import React from 'react';
import { X, ExternalLink, Calendar, Clock, Eye } from 'lucide-react';

const LinkDetailModal = ({ isOpen, onClose, link, onTrackClick, user }) => {
  if (!isOpen || !link) return null;

  const { title, url, content, deadline, created_at, click_count } = link;

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
    if (!dateStr) return 'Không rõ';
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

  // Determine deadline status
  const getDeadlineStatus = (dateStr) => {
    if (!dateStr) return null;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const deadlineDate = new Date(dateStr);
      deadlineDate.setHours(0, 0, 0, 0);

      const diffTime = deadlineDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        return { text: `Quá hạn ${Math.abs(diffDays)} ngày`, type: 'expired' };
      }
      if (diffDays === 0) {
        return { text: 'Hạn chót hôm nay!', type: 'critical' };
      }
      if (diffDays <= 3) {
        return { text: `Còn ${diffDays} ngày`, type: 'urgent' };
      }
      return { text: `Còn ${diffDays} ngày`, type: 'normal' };
    } catch {
      return null;
    }
  };

  const deadlineStatus = getDeadlineStatus(deadline);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content glass-panel border-glow modal-detail" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <h3 className="modal-title text-gradient flex-align-center gap-2">
            <span>Chi tiết liên kết</span>
          </h3>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body-detail">
          {/* Title & Domain */}
          <div className="detail-header-section mb-4">
            <h2 className="detail-title text-gradient-title">{title || 'Không có tiêu đề'}</h2>
          </div>

          {/* Description */}
          <div className="detail-section mb-4">
            <p className="detail-desc-content">
              {content ? content : 'Không có mô tả cho liên kết này.'}
            </p>
          </div>

          {/* Date Info Grid */}
          <div className="detail-time-grid mb-5">
            <div className="detail-time-item">
              <span className="detail-time-label flex-align-center gap-1">
                <Clock size={13} />
                <span>Ngày tạo:</span>
              </span>
              <span className="detail-time-value">
                {formatCreatedDate(created_at)}
              </span>
            </div>

            <div className="detail-time-item">
              <span className="detail-time-label flex-align-center gap-1">
                <Calendar size={13} />
                <span>Hạn chót (Deadline):</span>
              </span>
              <div className="detail-deadline-box">
                <span className={`detail-time-value ${deadline ? 'has-deadline' : ''} ${deadlineStatus ? deadlineStatus.type : ''}`}>
                  {formatDeadlineDate(deadline)}
                </span>
              </div>
            </div>

            {user && (user.role === 'admin' || user.role === 'manager') && (
              <div className="detail-time-item">
                <span className="detail-time-label flex-align-center gap-1">
                  <Eye size={13} />
                  <span>Lượt truy cập:</span>
                </span>
                <span className="detail-time-value">
                  {click_count || 0} lượt
                </span>
              </div>
            )}
          </div>

          {/* Action Button */}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary flex-center gap-2 detail-btn-visit"
            style={{ textDecoration: 'none' }}
            onClick={() => {
              if (onTrackClick) onTrackClick(link.id);
            }}
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


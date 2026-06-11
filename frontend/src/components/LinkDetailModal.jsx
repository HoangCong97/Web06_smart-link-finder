import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Calendar, Clock, Eye, Copy, Check } from 'lucide-react';
import { getDomain, formatCreatedDate, formatDeadlineDate, getDeadlineStatus } from '../utils/helpers';

const LinkDetailModal = ({ isOpen, onClose, link, onTrackClick, user }) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCopied(false);
  }, [link?.id]);

  if (!isOpen || !link) return null;

  const { title, url, content, deadline, created_at, click_count } = link;

  const domain = getDomain(url);
  const deadlineStatus = getDeadlineStatus(deadline);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Không thể sao chép liên kết:', err);
    }
  };

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

          {/* Copy URL Section */}
          <div className="detail-section mb-4 detail-url-section">
            <span className="detail-time-label flex-align-center gap-1 mb-2">
              <span>Đường dẫn liên kết (URL):</span>
            </span>
            <div className="url-copy-wrapper">
              <a href={url} target="_blank" rel="noopener noreferrer" className="url-display-text" title={url}>
                {url}
              </a>
              <button 
                type="button" 
                className={`btn-copy-url ${copied ? 'copied' : ''}`}
                onClick={handleCopy}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'Đã sao chép' : 'Sao chép'}</span>
              </button>
            </div>
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


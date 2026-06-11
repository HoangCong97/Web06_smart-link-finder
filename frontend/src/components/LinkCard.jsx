import React, { useState } from 'react';
import { Trash2, ExternalLink, Calendar, Award, Edit2, Eye, Pin, Flame } from 'lucide-react';
import { getDomain, getDeadlineStatus } from '../utils/helpers';

const LinkCard = ({ link, onDelete, onEdit, onPinToggle, onClickCard, onTrackClick, user, isSearchResult }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { id, url, title, deadline, similarity, click_count } = link;

  const domain = getDomain(url);
  const deadlineStatus = getDeadlineStatus(deadline);

  const isUrgent = deadlineStatus && deadlineStatus.type === 'critical';
  const isHot = click_count !== undefined && click_count >= 10;
  const glowClass = isUrgent ? 'glow-pulse-urgent' : isHot ? 'glow-pulse-hot' : '';

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    setShowConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    await onDelete(id);
    setIsDeleting(false);
  };

  return (
    <div 
      className={`glass-panel link-card hover-scale ${isDeleting ? 'deleting' : ''} ${glowClass}`}
      onClick={() => onClickCard && onClickCard(link)}
      style={{ cursor: 'pointer' }}
    >
      {/* Similarity Score for Semantic Vector Search */}
      {isSearchResult && similarity !== undefined && (
        <div className="similarity-badge">
          <Award size={14} />
          <span>{(similarity * 100).toFixed(1)}% khớp</span>
        </div>
      )}

      {/* Click / View count badge (Visible to all users, special Flame styling for hot links) */}
      {click_count !== undefined && click_count > 0 && (
        <div 
          className={`views-badge ${isHot ? 'hot-badge' : ''}`} 
          title={isHot ? `${click_count} lượt truy cập - Liên kết cực kỳ HOT!` : `${click_count} lượt truy cập`}
        >
          {isHot ? (
            <Flame size={13} style={{ fill: 'currentColor', color: '#ea580c' }} />
          ) : (
            <Eye size={13} />
          )}
          <span>{click_count}</span>
        </div>
      )}

      {/* Card Title */}
      <p 
        className="card-title" 
        title={title || url}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          ...(click_count > 0 ? { paddingRight: '3.2rem' } : {})
        }}
      >
        {link.is_pinned && (
          <Pin 
            size={14} 
            style={{ 
              transform: 'rotate(45deg)', 
              fill: 'currentColor', 
              color: 'var(--warning)',
              flexShrink: 0
            }} 
          />
        )}
        <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', flexGrow: 1 }}>
          {title || url}
        </span>
      </p>

      {/* Card Metadata Row */}
      <div className="card-meta-row">
        {/* Domain Name & External Link */}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="card-link flex-center gap-1"
          onClick={(e) => {
            e.stopPropagation();
            if (onTrackClick) onTrackClick(id);
          }}
        >
          <span className="card-domain">{domain}</span>
          <ExternalLink size={12} />
        </a>

        {/* Deadline & Action Buttons */}
        <div className="card-meta-right">
          {deadlineStatus ? (
            <div className={`deadline-badge ${deadlineStatus.type}`}>
              <Calendar size={12} />
              <span>{deadlineStatus.text}</span>
            </div>
          ) : (
            <div className="deadline-badge-empty">Không có deadline</div>
          )}

          {/* Delete & Edit Actions (Only when logged in) */}
          {user && (
            <div className="card-actions">
              {showConfirm ? (
                <div className="confirm-delete animated-fade-in" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={handleConfirmDelete}
                    disabled={isDeleting}
                    className="confirm-btn-yes"
                  >
                    Xóa
                  </button>
                  <button
                    onClick={() => setShowConfirm(false)}
                    disabled={isDeleting}
                    className="confirm-btn-no"
                  >
                    Hủy
                  </button>
                </div>
              ) : (
                <div className="flex-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPinToggle && onPinToggle(link);
                    }}
                    className={`pin-icon-btn ${link.is_pinned ? 'active' : ''}`}
                    title={link.is_pinned ? "Bỏ ghim liên kết" : "Ghim liên kết"}
                  >
                    <Pin size={16} style={link.is_pinned ? { transform: 'rotate(45deg)', fill: 'currentColor' } : { transform: 'rotate(0deg)' }} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(link);
                    }}
                    className="edit-icon-btn"
                    title="Sửa liên kết"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={handleDeleteClick}
                    className="delete-icon-btn"
                    title="Xóa liên kết"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LinkCard;

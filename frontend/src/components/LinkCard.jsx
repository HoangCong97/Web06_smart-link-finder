import React, { useState } from 'react';
import { Trash2, ExternalLink, Calendar, Award, Edit2 } from 'lucide-react';

const LinkCard = ({ link, onDelete, onEdit, onClickCard, user, isSearchResult }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { id, url, title, deadline, similarity } = link;

  // Extract domain name from URL
  const getDomain = (urlStr) => {
    try {
      return new URL(urlStr).hostname;
    } catch {
      return '';
    }
  };

  const domain = getDomain(url);

  // Compute deadline status badge details
  const getDeadlineStatus = () => {
    if (!deadline) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(deadline);
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
    return { text: `Hạn: ${new Date(deadline).toLocaleDateString('vi-VN')}`, type: 'normal' };
  };

  const deadlineStatus = getDeadlineStatus();

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
      className={`glass-panel link-card hover-scale ${isDeleting ? 'deleting' : ''}`}
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

      {/* Card Title */}
      <p className="card-title" title={title || url}>
        {title || url}
      </p>

      {/* Card Metadata Row */}
      <div className="card-meta-row">
        {/* Domain Name & External Link */}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="card-link flex-center gap-1"
          onClick={(e) => e.stopPropagation()}
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
                <div className="confirm-delete animated-fade-in">
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

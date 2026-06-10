/**
 * Trích xuất domain từ một URL string.
 * @param {string} urlStr 
 * @returns {string}
 */
export const getDomain = (urlStr) => {
  try {
    return new URL(urlStr).hostname;
  } catch {
    return '';
  }
};

/**
 * Định dạng ngày tạo.
 * @param {string} dateStr 
 * @returns {string}
 */
export const formatCreatedDate = (dateStr) => {
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

/**
 * Định dạng ngày deadline.
 * @param {string} dateStr 
 * @returns {string}
 */
export const formatDeadlineDate = (dateStr) => {
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

/**
 * Lấy trạng thái hạn chót (text và type để áp CSS class).
 * @param {string} dateStr 
 * @returns {{ text: string, type: string, diffDays: number } | null}
 */
export const getDeadlineStatus = (dateStr) => {
  if (!dateStr) return null;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(dateStr);
    deadlineDate.setHours(0, 0, 0, 0);

    const diffTime = deadlineDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: `Quá hạn ${Math.abs(diffDays)} ngày`, type: 'expired', diffDays };
    }
    if (diffDays === 0) {
      return { text: 'Hạn chót hôm nay!', type: 'critical', diffDays };
    }
    if (diffDays <= 3) {
      return { text: `Còn ${diffDays} ngày`, type: 'urgent', diffDays };
    }
    return {
      text: `Hạn: ${new Date(dateStr).toLocaleDateString('vi-VN')}`,
      type: 'normal',
      diffDays
    };
  } catch {
    return null;
  }
};

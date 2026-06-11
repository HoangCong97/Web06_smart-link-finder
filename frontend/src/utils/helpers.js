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
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes} - ${d.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })}`;
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
    const deadlineDate = new Date(dateStr);

    if (deadlineDate < today) {
      // Đã quá hạn
      const diffTime = today - deadlineDate;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 0) {
        const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
        if (diffHours === 0) {
          const diffMins = Math.floor(diffTime / (1000 * 60));
          return { text: `Quá hạn ${diffMins} phút`, type: 'expired', diffDays: -1 };
        }
        return { text: `Quá hạn ${diffHours} giờ`, type: 'expired', diffDays: -1 };
      }
      return { text: `Quá hạn ${diffDays} ngày`, type: 'expired', diffDays: -diffDays };
    } else {
      // Chưa quá hạn
      const diffTime = deadlineDate - today;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
        if (diffHours === 0) {
          const diffMins = Math.floor(diffTime / (1000 * 60));
          return { text: `Còn ${diffMins} phút`, type: 'critical', diffDays: 0 };
        }
        return { text: `Còn ${diffHours} giờ`, type: 'critical', diffDays: 0 };
      }
      if (diffDays <= 3) {
        return { text: `Còn ${diffDays} ngày`, type: 'urgent', diffDays };
      }
      return {
        text: `Hạn: ${new Date(dateStr).toLocaleDateString('vi-VN')}`,
        type: 'normal',
        diffDays
      };
    }
  } catch {
    return null;
  }
};

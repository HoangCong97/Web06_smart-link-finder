import React, { useState } from 'react';
import { Link, FileText, Calendar, Sparkles, Plus } from 'lucide-react';
import confetti from 'canvas-confetti';

const LinkForm = ({ onLinkAdded, backendUrl }) => {
  const [activeTab, setActiveTab] = useState('manual'); // 'manual' or 'ai'

  // Manual Form States
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [deadline, setDeadline] = useState('');

  // AI Form States
  const [rawText, setRawText] = useState('');

  // Status States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const triggerConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#a855f7', '#06b6d4', '#3b82f6']
    });
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!url) {
      setError('Đường dẫn URL là bắt buộc');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${backendUrl}/api/links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          title: title || undefined,
          content: content || undefined,
          deadline: deadline || undefined
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra khi thêm link');
      }

      // Reset manual form
      setUrl('');
      setTitle('');
      setContent('');
      setDeadline('');

      triggerConfetti();
      onLinkAdded(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Không thể kết nối đến server');
    } finally {
      setLoading(false);
    }
  };

  const handleAiSubmit = async (e) => {
    e.preventDefault();
    if (!rawText.trim()) {
      setError('Nội dung văn bản không được để trống');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${backendUrl}/api/links/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rawText }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra khi phân tích văn bản');
      }

      // Reset AI form
      setRawText('');

      triggerConfetti();
      onLinkAdded(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Không thể kết nối đến server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel link-form-panel">
      {/* Panel Header */}
      <div className="panel-header">
        <h2 className="panel-title text-gradient">Thêm liên kết mới</h2>
      </div>

      {/* Tabs Header */}
      <div className="tabs-header">
        <button
          type="button"
          onClick={() => { setActiveTab('manual'); setError(''); }}
          className={`tab-btn ${activeTab === 'manual' ? 'active' : ''}`}
        >
          Nhập thủ công
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('ai'); setError(''); }}
          className={`tab-btn flex-center gap-1.5 ${activeTab === 'ai' ? 'active' : ''}`}
        > AI Phân tích
        </button>
      </div>

      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      {/* Manual Mode Form */}
      {activeTab === 'manual' ? (
        <form onSubmit={handleManualSubmit} className="form-container">
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
              <FileText size={14} /> Tiêu đề tìm kiếm
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nhập tiêu đề"
              disabled={loading}
              className="input-field"
            />
          </div>

          {/* Description / Content Input */}
          <div className="form-group">
            <label className="form-label">
              Mô tả
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
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              disabled={loading}
              className="input-field"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex-center gap-2"
          >
            {loading ? (
              <>
                <div className="btn-spinner"></div>
                <span>Đang phân tích & lưu...</span>
              </>
            ) : (
              <>
                <span>Lưu</span>
              </>
            )}
          </button>
        </form>
      ) : (
        /* AI Analyze Mode Form */
        <form onSubmit={handleAiSubmit} className="form-container">
          <div className="form-group">
            <label className="form-label">
              Nội dung văn bản thô (AI phân tích)
            </label>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Đưa tất cả nội dung vào, AI tự phân tích"
              disabled={loading}
              className="input-field min-h-180"
              required
            />
            <p className="form-help text-cyan">
              * Hệ thống sử dụng mô hình deepseek-v4-flash để tự động bóc tách: Đường dẫn URL, Tiêu đề tóm tắt, Nội dung chính và Deadline.
            </p>
            <p className="form-help text-cyan">
              * Hệ thống sử dụng mô hình gemini-embedding-001 để tạo vector tìm kiếm.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary btn-ai w-full flex-center gap-2"
          >
            {loading ? (
              <>
                <div className="btn-spinner"></div>
                <span>AI đang phân tích & trích xuất...</span>
              </>
            ) : (
              <>
                <span>AI Phân tích & Lưu</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
};

export default LinkForm;

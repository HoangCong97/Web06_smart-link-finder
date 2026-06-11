import React, { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, Sparkles, X } from 'lucide-react';

const SearchBar = ({ onSearch, onClear, isLoading, defaultThreshold = 0.3, defaultLimit = 9 }) => {
  const [query, setQuery] = useState('');
  const [threshold, setThreshold] = useState(defaultThreshold);
  const [limit, setLimit] = useState(defaultLimit);

  useEffect(() => {
    if (defaultThreshold !== undefined) {
      setThreshold(defaultThreshold);
    }
  }, [defaultThreshold]);

  useEffect(() => {
    if (defaultLimit !== undefined) {
      setLimit(defaultLimit);
    }
  }, [defaultLimit]);
  const [showFilters, setShowFilters] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query, threshold, limit);
    }
  };

  const handleClear = () => {
    setQuery('');
    onClear();
  };

  const quickSearchTags = [
  ];

  return (
    <div className="glass-panel search-panel">
      <form onSubmit={handleSubmit} className="search-form">
        {/* Main Search Row */}
        <div className="search-row">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nhập từ khóa tìm kiếm..."
            className="search-input"
            disabled={isLoading}
          />

          <div className="search-actions-right">
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="search-clear-btn"
                title="Xóa nội dung tìm kiếm"
              >
                <X size={16} />
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`filter-toggle-btn ${showFilters ? 'active' : ''}`}
              title="Cấu hình tìm kiếm AI"
            >
              <SlidersHorizontal size={18} />
            </button>

            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="btn-primary search-submit-btn flex-center gap-1.5"
            >
              <Search size={14} />
              <span>Tìm kiếm</span>
            </button>
          </div>
        </div>

        {/* Collapsible Advanced Filters */}
        {showFilters && (
          <div className="advanced-filter-panel animated-fade-in">
            <h4 className="filter-title flex-center gap-1.5">
              <Sparkles size={14} /> Bộ tinh chỉnh tìm kiếm ngữ nghĩa
            </h4>

            <div className="filter-grid">
              {/* Threshold Slider */}
              <div className="filter-group">
                <div className="slider-labels">
                  <span className="slider-label-text">Ngưỡng tương đồng tối thiểu (Threshold)</span>
                  <span className="slider-value">{(threshold * 100).toFixed(0)}%</span>
                </div>

                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={threshold}
                  onChange={(e) => setThreshold(parseFloat(e.target.value))}
                  className="slider-input"
                />

                <div className="slider-range-tips">
                  <span>0% (Khớp bất kỳ)</span>
                  <span>100% (Khớp tuyệt đối)</span>
                </div>
              </div>

              {/* Limit Input */}
              <div className="filter-group limit-group-container">
                <label className="filter-label">Số lượng kết quả tối đa</label>
                <div className="limit-input-row">
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={limit}
                    onChange={(e) => setLimit(parseInt(e.target.value, 10) || 5)}
                    className="input-field limit-input"
                  />
                  <span className="limit-tip-text">liên kết hiển thị đầu tiên</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Search Tag Suggestions */}
        {quickSearchTags && quickSearchTags.length > 0 && (
          <div className="quick-tags-container">
            <span className="quick-tags-title">Gợi ý nhanh:</span>
            <div className="tags-list">
              {quickSearchTags.map((tag, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setQuery(tag);
                    onSearch(tag, threshold, limit);
                  }}
                  disabled={isLoading}
                  className="tag-btn"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default SearchBar;

import React, { useState, useEffect } from 'react';
import { Sparkles, Database, RefreshCw, AlertTriangle, HelpCircle } from 'lucide-react';
import LinkForm from './components/LinkForm';
import SearchBar from './components/SearchBar';
import LinkCard from './components/LinkCard';
import Loader from './components/Loader';
import './App.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

function App() {
  const [links, setLinks] = useState([]);
  const [searchResults, setSearchResults] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  const [connectionWarning, setConnectionWarning] = useState(false);

  // Fetch all links on load
  const fetchLinks = async () => {
    setIsLoading(true);
    setError('');
    setConnectionWarning(false);
    try {
      const response = await fetch(`${BACKEND_URL}/api/links`);
      if (!response.ok) {
        throw new Error('Không thể lấy danh sách liên kết từ server');
      }
      const data = await response.json();
      setLinks(data);
    } catch (err) {
      console.error(err);
      setError('Lỗi kết nối: Hãy đảm bảo Backend Server đang chạy.');
      setConnectionWarning(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  // Handle adding a link
  const handleLinkAdded = (newLink) => {
    setLinks((prev) => [newLink, ...prev]);
    // Clear search results so the user can see their newly added link in the list
    setSearchResults(null);
    setSearchQuery('');
  };

  // Handle semantic search
  const handleSearch = async (query, threshold, limit) => {
    setIsSearching(true);
    setError('');
    setSearchQuery(query);
    try {
      const response = await fetch(`${BACKEND_URL}/api/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, threshold, limit }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra trong quá trình tìm kiếm AI');
      }

      setSearchResults(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Không thể thực hiện tìm kiếm ngữ nghĩa');
    } finally {
      setIsSearching(false);
    }
  };

  // Clear search and show all links
  const handleClearSearch = () => {
    setSearchResults(null);
    setSearchQuery('');
  };

  // Handle delete link
  const handleDeleteLink = async (id) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/links/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Lỗi khi xóa link');
      }

      // Update local states
      setLinks((prev) => prev.filter((item) => item.id !== id));
      if (searchResults) {
        setSearchResults((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (err) {
      console.error(err);
      alert(err.message || 'Không thể xóa liên kết');
    }
  };

  const activeLinksList = searchResults !== null ? searchResults : links;
  const isSearchingActive = searchResults !== null;

  return (
    <div className="app-container">
      {/* Premium Header */}
      <header className="app-header">
        <h1 className="app-title text-gradient">Smart Link Finder</h1>
      </header>

      {/* Connection warning banner if server is offline */}
      {connectionWarning && (
        <div className="warning-banner-large animated-fade-in">
          <div className="warning-banner-left">
            <AlertTriangle size={20} className="icon-bounce" />
            <div className="warning-banner-text-group">
              <p className="warning-banner-title">Không thể kết nối đến Backend Server ({BACKEND_URL})</p>
              <p className="warning-banner-desc">Vui lòng khởi chạy server bằng lệnh `npm run dev` ở thư mục backend và kiểm tra cấu hình file .env.</p>
            </div>
          </div>
          <button
            onClick={fetchLinks}
            className="warning-banner-retry-btn flex-center gap-1.5"
          >
            <RefreshCw size={14} /> Thử lại
          </button>
        </div>
      )}

      {/* Main Layout Grid */}
      <div className="layout-grid">
        {/* Left Side: Create Form */}
        <div className="sidebar-column">
          <LinkForm onLinkAdded={handleLinkAdded} backendUrl={BACKEND_URL} />
        </div>

        {/* Right Side: Search & List */}
        <div className="main-column">
          {/* Search controls */}
          <SearchBar
            onSearch={handleSearch}
            onClear={handleClearSearch}
            isLoading={isSearching}
          />

          {/* Heading dynamic block */}
          <div className="column-header-row">
            <h3 className="column-header-title flex-center gap-2">
              {isSearchingActive ? (
                <>
                  <span>
                    Kết quả tìm kiếm từ AI cho "{searchQuery}" ({activeLinksList.length})
                  </span>
                </>
              ) : (
                <>
                  <Database size={20} className="icon-purple" />
                  <span>Tất cả liên kết đã lưu ({links.length})</span>
                </>
              )}
            </h3>

            {!isSearchingActive && (
              <button
                onClick={fetchLinks}
                disabled={isLoading}
                className="refresh-btn flex-center gap-1.5"
                title="Làm mới danh sách"
              >
                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                <span>Làm mới</span>
              </button>
            )}
          </div>

          {/* Error message */}
          {error && !connectionWarning && (
            <div className="error-banner mb-6">
              {error}
            </div>
          )}

          {/* Results State Management */}
          {isSearching ? (
            <div className="glass-panel loader-wrapper-panel">
              <Loader message="AI đang giải mã câu hỏi & truy vấn cơ sở dữ liệu vector..." />
            </div>
          ) : isLoading ? (
            <div className="glass-panel loader-wrapper-panel">
              <Loader message="Đang tải danh sách liên kết..." />
            </div>
          ) : activeLinksList.length === 0 ? (
            <div className="glass-panel empty-state">
              <div className="empty-state-icon-box">
                <AlertTriangle size={32} />
              </div>
              <h4 className="empty-state-title">
                {isSearchingActive ? 'Không tìm thấy liên kết phù hợp' : 'Danh sách liên kết trống'}
              </h4>

              <p className="empty-state-desc">
                {isSearchingActive
                  ? 'Hãy thử hạ thấp ngưỡng tương đồng (threshold) trong phần tinh chỉnh hoặc tìm kiếm với từ khóa khác.'
                  : 'Hãy nhập đường dẫn URL và tiêu đề ở khung bên trái hoặc sử dụng AI Phân tích để thêm liên kết đầu tiên.'
                }
              </p>
            </div>
          ) : (
            <div className="cards-grid animated-fade-in">
              {activeLinksList.map((link) => (
                <div key={link.id} className="animated-fade-in">
                  <LinkCard
                    link={link}
                    onDelete={handleDeleteLink}
                    isSearchResult={isSearchingActive}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;

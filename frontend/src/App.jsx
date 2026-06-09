import React, { useState, useEffect } from 'react';
import { Sparkles, Database, RefreshCw, AlertTriangle, HelpCircle, LogIn, LogOut, Users, Plus } from 'lucide-react';
import LinkForm from './components/LinkForm';
import SearchBar from './components/SearchBar';
import LinkCard from './components/LinkCard';
import Loader from './components/Loader';
import LoginModal from './components/LoginModal';
import ManagerManagementModal from './components/ManagerManagementModal';
import EditLinkModal from './components/EditLinkModal';
import LinkDetailModal from './components/LinkDetailModal';
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

  // Authentication & Modal States
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [viewingLink, setViewingLink] = useState(null);

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
        headers: {
          'Authorization': `Bearer ${token}`
        }
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

  // Handle login success
  const handleLoginSuccess = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
  };

  // Handle logout
  const handleLogout = () => {
    if (window.confirm('Bạn có chắc chắn muốn đăng xuất khỏi tài khoản không?')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setToken(null);
      setShowLinkForm(false);
    }
  };

  // Handle link updated
  const handleLinkUpdated = (updatedLink) => {
    setLinks((prev) => prev.map((item) => item.id === updatedLink.id ? updatedLink : item));
    if (searchResults) {
      setSearchResults((prev) => prev.map((item) => item.id === updatedLink.id ? updatedLink : item));
    }
  };

  const activeLinksList = searchResults !== null ? searchResults : links;
  const isSearchingActive = searchResults !== null;

  const isFormVisible = user && showLinkForm;

  return (
    <>
      {/* Full width Premium Header Bar */}
      <header className="header-bar-full">
        <div className="header-inner">
          <h1 className="app-title text-gradient" style={{ textAlign: 'left', margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Smart Link Finder</h1>

          <div className="header-actions">
            {user ? (
              <div className="header-user-group">
                <span className="user-name-text">Xin chào, <strong>{user.username}</strong></span>
                <span className={`user-badge ${user.role}`}>
                  {user.role}
                </span>
                {user.role === 'admin' && (
                  <button
                    onClick={() => setIsManagerModalOpen(true)}
                    className="nav-btn btn-sm"
                    title="Quản lý Manager"
                  >
                    <Users size={14} />
                    <span className="btn-text">Manager</span>
                  </button>
                )}
                <button
                  onClick={() => setShowLinkForm((prev) => !prev)}
                  className={`nav-btn btn-sm ${showLinkForm ? 'active' : ''}`}
                  style={showLinkForm ? { borderColor: 'var(--primary)', color: 'var(--primary)', background: '#fff' } : {}}
                  title="Thêm liên kết mới"
                >
                  <Plus size={14} />
                  <span className="btn-text">Thêm link</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="nav-btn btn-sm btn-logout"
                  title="Đăng xuất"
                >
                  <LogOut size={14} />
                  <span className="btn-text">Đăng xuất</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="nav-btn btn-sm"
                title="Đăng nhập"
              >
                <LogIn size={14} />
                <span>Đăng nhập</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="app-container" style={{ paddingTop: '1.5rem' }}>

      {/* Connection warning banner if server is offline */}
      {connectionWarning && (
        <div className="warning-banner-large animated-fade-in" style={{ marginBottom: '2rem' }}>
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

      {/* Main Layout Grid (Dynamic Columns: 380px 1fr if form shown, else 1fr) */}
      <div className={isFormVisible ? "layout-grid" : "layout-grid-full"}>
        {/* Left Side: Create Form (only if logged in and toggled showLinkForm) */}
        {isFormVisible && (
          <div className="sidebar-column">
            <LinkForm
              onLinkAdded={handleLinkAdded}
              backendUrl={BACKEND_URL}
              token={token}
            />
          </div>
        )}

        {/* Right Side: Search & List */}
        <div className="main-column">
          {/* Search controls (Fixed/Sticky) */}
          <div className="sticky-search-container">
            <SearchBar
              onSearch={handleSearch}
              onClear={handleClearSearch}
              isLoading={isSearching}
            />
          </div>

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
                  : user
                    ? 'Hãy click nút "Thêm liên kết" phía trên để mở khung thêm liên kết đầu tiên.'
                    : 'Đăng nhập với quyền Admin hoặc Manager để thêm liên kết mới.'
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
                    onEdit={(l) => setEditingLink(l)}
                    onClickCard={(l) => setViewingLink(l)}
                    user={user}
                    isSearchResult={isSearchingActive}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Auth & Admin Modals */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        backendUrl={BACKEND_URL}
      />

      <ManagerManagementModal
        isOpen={isManagerModalOpen}
        onClose={() => setIsManagerModalOpen(false)}
        backendUrl={BACKEND_URL}
        token={token}
      />

      <EditLinkModal
        isOpen={editingLink !== null}
        onClose={() => setEditingLink(null)}
        link={editingLink}
        onLinkUpdated={handleLinkUpdated}
        backendUrl={BACKEND_URL}
        token={token}
      />

      <LinkDetailModal
        isOpen={viewingLink !== null}
        onClose={() => setViewingLink(null)}
        link={viewingLink}
      />
      </div>
    </>
  );
}

export default App;

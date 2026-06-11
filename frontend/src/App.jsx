import React, { useState, useEffect, Suspense } from 'react';
import { Sparkles, Database, RefreshCw, AlertTriangle, HelpCircle, LogIn, LogOut, Users, Plus, Shield, Key, Maximize, Minimize } from 'lucide-react';
import LinkForm from './components/LinkForm';
import SearchBar from './components/SearchBar';
import LinkCard from './components/LinkCard';
import Loader from './components/Loader';
import { api } from './services/api';
import './App.css';

const LoginModal = React.lazy(() => import('./components/LoginModal'));
const AdminDashboardModal = React.lazy(() => import('./components/AdminDashboardModal'));
const EditLinkModal = React.lazy(() => import('./components/EditLinkModal'));
const ChangePasswordModal = React.lazy(() => import('./components/ChangePasswordModal'));
const LinkDetailModal = React.lazy(() => import('./components/LinkDetailModal'));


function App() {
  const [links, setLinks] = useState([]);
  const [searchResults, setSearchResults] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  const [connectionWarning, setConnectionWarning] = useState(false);

  // Cấu hình hệ thống động tải từ server
  const [publicSettings, setPublicSettings] = useState({
    guest_permissions: ["search_links", "view_links", "click_link"],
    maintenance_mode: false,
    default_search_limit: 9,
    default_search_threshold: 0.3
  });

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
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Theo dõi sự kiện thay đổi toàn màn hình
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error('Không thể bật chế độ toàn màn hình:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // Tải cài đặt hệ thống công khai
  const fetchPublicSettings = async () => {
    try {
      const data = await api.getPublicSettings();
      setPublicSettings(data);
    } catch (err) {
      console.error('Lỗi khi tải cài đặt hệ thống:', err);
    }
  };

  // Fetch all links on load
  const fetchLinks = async () => {
    // Nếu khách không có quyền xem, không gọi tải link (tránh lỗi 403 thừa)
    const savedUser = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
    if (!savedUser && publicSettings && publicSettings.guest_permissions && !publicSettings.guest_permissions.includes('view_links')) {
      return;
    }

    setIsLoading(true);
    setError('');
    setConnectionWarning(false);
    try {
      const data = await api.getLinks();
      setLinks(data);
    } catch (err) {
      console.error(err);
      
      // Tự động đăng xuất nếu token bị hết hạn hoặc không hợp lệ để tránh kẹt trong trạng thái lỗi
      const isAuthError = err.message && (
        err.message.toLowerCase().includes('token') || 
        err.message.toLowerCase().includes('hết hạn') || 
        err.message.toLowerCase().includes('xác thực') ||
        err.message.toLowerCase().includes('đăng nhập')
      );
      
      if (isAuthError) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setToken(null);
      }

      setError(err.message || 'Lỗi kết nối: Hãy đảm bảo Backend Server đang chạy.');
      // Chỉ bật cảnh báo kết nối nếu thực sự mất kết nối mạng (Failed to fetch)
      if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('network') || err.message.includes('Failed to connect'))) {
        setConnectionWarning(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Lấy cấu hình hệ thống khi mount
  useEffect(() => {
    fetchPublicSettings();
  }, []);

  // Tải danh sách liên kết mỗi khi token hoặc cấu hình phân quyền khách thay đổi
  useEffect(() => {
    fetchLinks();
  }, [token, publicSettings.guest_permissions]);

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
      const data = await api.searchLinks(query, threshold, limit);
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
      await api.deleteLink(id);

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
    fetchPublicSettings();
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
    setLinks((prev) => {
      const updated = prev.map((item) => item.id === updatedLink.id ? updatedLink : item);
      return [...updated].sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) {
          return a.is_pinned ? -1 : 1;
        }
        return 0;
      });
    });
    if (searchResults) {
      setSearchResults((prev) => {
        const updated = prev.map((item) => item.id === updatedLink.id ? updatedLink : item);
        return [...updated].sort((a, b) => {
          if (a.is_pinned !== b.is_pinned) {
            return a.is_pinned ? -1 : 1;
          }
          return 0;
        });
      });
    }
    // Cập nhật ngay lập tức nếu đang mở xem chi tiết
    setViewingLink((prev) => 
      prev && prev.id === updatedLink.id ? updatedLink : prev
    );
  };

  // Handle toggling pin status
  const handlePinToggle = async (link) => {
    try {
      const updatedLink = await api.updateLink(link.id, {
        is_pinned: !link.is_pinned
      });
      handleLinkUpdated(updatedLink);
    } catch (err) {
      console.error('Lỗi khi ghim/bỏ ghim liên kết:', err);
      alert(err.message || 'Không thể thực hiện ghim/bỏ ghim liên kết');
    }
  };

  // Gửi API tăng số lượt click và cập nhật state
  const handleLinkClick = async (linkId) => {
    try {
      const data = await api.trackClick(linkId);

      setLinks((prev) =>
        prev.map((item) => (item.id === linkId ? { ...item, click_count: data.click_count } : item))
      );
      if (searchResults) {
        setSearchResults((prev) =>
          prev.map((item) => (item.id === linkId ? { ...item, click_count: data.click_count } : item))
        );
      }
      // Cập nhật ngay lập tức nếu đang mở xem chi tiết
      setViewingLink((prev) => 
        prev && prev.id === linkId ? { ...prev, click_count: data.click_count } : prev
      );
    } catch (err) {
      console.error('Không thể cập nhật lượt click:', err);
    }
  };

  const activeLinksList = searchResults !== null ? searchResults : links;
  const isSearchingActive = searchResults !== null;

  const isFormVisible = user && showLinkForm;

  if (publicSettings && publicSettings.maintenance_mode && (!user || user.role !== 'admin')) {
    return (
      <div className="maintenance-overlay" style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        color: '#fff',
        fontFamily: 'var(--font-body)',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div className="glass-panel" style={{
          maxWidth: '500px',
          padding: '3rem 2rem',
          borderRadius: '16px',
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(139, 92, 246, 0.15)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <div style={{
            background: 'rgba(139, 92, 246, 0.1)',
            width: '64px', height: '64px',
            borderRadius: '50%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: '1.5rem',
            border: '1px solid rgba(139, 92, 246, 0.3)'
          }}>
            <AlertTriangle size={32} className="icon-bounce" style={{ color: '#f59e0b' }} />
          </div>
          <h2 className="text-gradient" style={{
            fontFamily: 'var(--font-title)',
            fontSize: '1.75rem',
            fontWeight: 800,
            marginBottom: '1rem'
          }}>Hệ thống đang bảo trì</h2>
          <p style={{ color: '#94a3b8', lineHeight: 1.6, marginBottom: '2rem' }}>
            Chúng tôi đang nâng cấp hệ thống để mang lại trải nghiệm tốt nhất cho bạn. Vui lòng quay lại sau ít phút.
          </p>
          <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem' }}>
            Nếu bạn là Quản trị viên, vui lòng đăng nhập để truy cập hệ thống.
          </div>
          <button 
            onClick={() => setIsLoginModalOpen(true)}
            className="btn-primary" 
            style={{ padding: '0.6rem 2rem', width: 'auto' }}
          >
            Đăng nhập Admin
          </button>
        </div>
        
        {isLoginModalOpen && (
          <Suspense fallback={null}>
            <LoginModal
              isOpen={isLoginModalOpen}
              onClose={() => setIsLoginModalOpen(false)}
              onLoginSuccess={handleLoginSuccess}
            />
          </Suspense>
        )}
      </div>
    );
  }

  return (
    <>
      {publicSettings && publicSettings.maintenance_mode && user && user.role === 'admin' && (
        <div style={{
          background: 'linear-gradient(90deg, #b91c1c 0%, #dc2626 100%)',
          color: 'white',
          textAlign: 'center',
          padding: '0.4rem',
          fontSize: '0.82rem',
          fontWeight: 700,
          letterSpacing: '0.5px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          zIndex: 999
        }}>
          ⚠️ HỆ THỐNG ĐANG BẬT CHẾ ĐỘ BẢO TRÌ - BẠN ĐANG DUYỆT VỚI QUYỀN ADMIN BYPASS
        </div>
      )}
      {/* Full width Premium Header Bar */}
      <header className="header-bar-full">
        <div className="header-inner">
          <h1 className="app-title text-gradient" style={{ textAlign: 'left', margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Smart Link Finder</h1>

          <div className="header-actions">
            <button
              onClick={toggleFullscreen}
              className="nav-btn btn-sm"
              title={isFullscreen ? "Thoát toàn màn hình" : "Chế độ toàn màn hình (Ẩn thanh địa chỉ)"}
            >
              {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
              <span className="btn-text">{isFullscreen ? "Thu nhỏ" : "Toàn màn hình"}</span>
            </button>

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
                    title="Bảng Quản trị"
                  >
                    <Shield size={14} />
                    <span className="btn-text">Quản trị</span>
                  </button>
                )}
                <button
                  onClick={() => setIsChangePasswordOpen(true)}
                  className="nav-btn btn-sm"
                  title="Đổi mật khẩu"
                >
                  <Key size={14} />
                  <span className="btn-text">Đổi mật khẩu</span>
                </button>
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
                <p className="warning-banner-title">Không thể kết nối đến Server</p>
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
              />
            </div>
          )}

          {/* Right Side: Search & List */}
          <div className="main-column">
            {/* Search controls (Fixed/Sticky) */}
            <div className="sticky-search-container">
              {!user && publicSettings && publicSettings.guest_permissions && !publicSettings.guest_permissions.includes('search_links') ? (
                <div className="glass-panel" style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', borderRadius: '12px' }}>
                  <Shield size={16} className="text-warning" style={{ color: '#f59e0b' }} />
                  <span>Chức năng tìm kiếm yêu cầu đăng nhập tài khoản.</span>
                  <button 
                    onClick={() => setIsLoginModalOpen(true)}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                  >
                    Đăng nhập
                  </button>
                </div>
              ) : (
                <SearchBar
                  onSearch={handleSearch}
                  onClear={handleClearSearch}
                  isLoading={isSearching}
                  defaultThreshold={publicSettings.default_search_threshold}
                  defaultLimit={publicSettings.default_search_limit}
                />
              )}
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
            {!user && publicSettings && publicSettings.guest_permissions && !publicSettings.guest_permissions.includes('view_links') ? (
              <div className="glass-panel empty-state" style={{ padding: '4rem 2rem' }}>
                <div className="empty-state-icon-box" style={{ background: 'rgba(139, 92, 246, 0.05)', color: 'var(--primary)' }}>
                  <Shield size={32} />
                </div>
                <h4 className="empty-state-title">Yêu Cầu Đăng Nhập</h4>
                <p className="empty-state-desc" style={{ maxWidth: '400px', margin: '0.5rem auto 1.5rem auto' }}>
                  Admin đã cấu hình yêu cầu đăng nhập để xem danh sách liên kết. Vui lòng đăng nhập tài khoản Manager hoặc Admin để tiếp tục.
                </p>
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="btn-primary flex-center gap-1.5"
                  style={{ margin: '0 auto', padding: '0.55rem 2rem' }}
                >
                  <LogIn size={14} />
                  <span>Đăng nhập ngay</span>
                </button>
              </div>
            ) : isSearching ? (
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
                      onPinToggle={handlePinToggle}
                      onClickCard={(l) => setViewingLink(l)}
                      onTrackClick={handleLinkClick}
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
        {isLoginModalOpen && (
          <Suspense fallback={null}>
            <LoginModal
              isOpen={isLoginModalOpen}
              onClose={() => setIsLoginModalOpen(false)}
              onLoginSuccess={handleLoginSuccess}
            />
          </Suspense>
        )}

        {isManagerModalOpen && (
          <Suspense fallback={null}>
            <AdminDashboardModal
              isOpen={isManagerModalOpen}
              onClose={() => setIsManagerModalOpen(false)}
            />
          </Suspense>
        )}

        {isChangePasswordOpen && (
          <Suspense fallback={null}>
            <ChangePasswordModal
              isOpen={isChangePasswordOpen}
              onClose={() => setIsChangePasswordOpen(false)}
            />
          </Suspense>
        )}

        {editingLink !== null && (
          <Suspense fallback={null}>
            <EditLinkModal
              isOpen={editingLink !== null}
              onClose={() => setEditingLink(null)}
              link={editingLink}
              onLinkUpdated={handleLinkUpdated}
            />
          </Suspense>
        )}

        {viewingLink !== null && (
          <Suspense fallback={null}>
            <LinkDetailModal
              isOpen={viewingLink !== null}
              onClose={() => setViewingLink(null)}
              link={viewingLink}
              onTrackClick={handleLinkClick}
              user={user}
            />
          </Suspense>
        )}
      </div>
    </>
  );
}

export default App;

# Cấu Trúc Dự Án (Project Structure) - Smart Link Finder

Tài liệu này cung cấp chi tiết sơ đồ thư mục, vai trò của từng file và lược đồ cơ sở dữ liệu để AI nhanh chóng định vị nơi cần làm việc.

---

## 📂 Sơ Đồ Thư Mục Toàn Bộ Dự Án

```text
Web06_smart-link-finder/
├── AI env/                 # Thư mục lưu trữ context phục vụ AI (giữ context, quản lý task)
│   ├── master.md           # [Entry Point] Điểm bắt đầu hướng dẫn AI
│   ├── structure.md        # Tài liệu cấu trúc dự án (File này)
│   ├── tasks.md            # Tài liệu theo dõi tiến độ các task
│   └── rules.md            # Quy chuẩn viết code & hướng dẫn tối ưu token
│
├── backend/                # Server Backend (Node.js + Express + Supabase)
│   ├── .env                # Các biến môi trường nhạy cảm (JWT Secret, API Keys)
│   ├── .env.example        # Bản mẫu cấu hình môi trường mẫu
│   ├── init.db.sql         # File khởi tạo Database Schema trong Supabase SQL Editor
│   ├── package.json        # Định nghĩa các package phụ thuộc phía Backend
│   └── server.js           # Server chính, chứa toàn bộ API endpoints và logic xử lý AI
│
└── frontend/               # Single Page Application Frontend (Vite + React)
    ├── package.json        # Các package phụ thuộc phía Frontend
    ├── vite.config.js      # Cấu hình bundler Vite
    ├── index.html          # Khung HTML chính của ứng dụng
    └── src/
        ├── main.jsx        # Điểm khởi chạy của React app
        ├── index.css       # CSS toàn cục đơn giản
        ├── App.jsx         # Component gốc quản lý State toàn ứng dụng & Router giả
        ├── App.css         # Chứa hệ thống thiết kế Vanilla CSS, UI & Animations
        └── components/     # Các React Components
            ├── LinkCard.jsx               # Card hiển thị thu gọn một liên kết
            ├── LinkDetailModal.jsx        # Modal xem chi tiết liên kết (đã được làm đẹp)
            ├── EditLinkModal.jsx          # Modal cập nhật thông tin liên kết
            ├── LinkForm.jsx               # Khung nhập liên kết mới (hỗ trợ nhập tay & AI trích xuất)
            ├── SearchBar.jsx              # Thanh tìm kiếm ngữ nghĩa, có bộ lọc Threshold & Limit
            ├── LoginModal.jsx             # Modal đăng nhập hệ thống
            ├── ManagerManagementModal.jsx # [Chỉ Admin] Modal quản lý tài khoản Manager
            └── Loader.jsx                 # Hiệu ứng Spinner tải dữ liệu
```

---

## 💾 Database Schema (Supabase PostgreSQL)

Database bao gồm 2 bảng chính và 1 hàm tìm kiếm vector đặc thù:

### 1. Bảng `public.fl_links`
Lưu trữ thông tin liên kết đã được chuẩn hóa và các vector tương ứng.
* `id` (`bigint`, Primary Key): ID tự động tăng.
* `url` (`text`, Not Null): Đường dẫn liên kết.
* `title` (`text`): Tiêu đề đã được làm sạch hoặc trích xuất bởi AI.
* `content` (`text`): Mô tả ngắn của liên kết.
* `deadline` (`date`): Hạn chót cần xử lý liên kết (định dạng YYYY-MM-DD, có thể NULL).
* `embedding` (`vector(768)`): Vector nhúng 768 chiều phục vụ tìm kiếm ngữ nghĩa, được tạo bởi mô hình `gemini-embedding-001`.
* `created_at` (`timestamp with time zone`): Thời điểm lưu liên kết (Default: UTC `now()`).

### 2. Bảng `public.fl_users`
Lưu thông tin tài khoản đăng nhập và phân quyền.
* `id` (`bigint`, Primary Key): ID tự động tăng.
* `username` (`text`, Unique, Not Null): Tên đăng nhập.
* `password` (`text`, Not Null): Mật khẩu đã mã hóa bằng `bcrypt`.
* `role` (`text`, Not Null): Chỉ nhận giá trị `'admin'` hoặc `'manager'`.
* `created_at` (`timestamp with time zone`): Ngày tạo tài khoản.

### 3. Hàm tìm kiếm `match_links` (Supabase RPC)
Tính toán độ tương đồng Cosine giữa vector truy vấn và vector lưu trong database:
```sql
create or replace function match_links (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  id bigint,
  url text,
  title text,
  content text,
  deadline date,
  similarity float
) ...
```
Hàm trả về các liên kết có độ tương đồng lớn hơn `match_threshold`, sắp xếp theo thứ tự giảm dần và giới hạn số lượng bằng `match_count`.

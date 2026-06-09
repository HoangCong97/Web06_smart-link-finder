# AI Environment Master - Smart Link Finder

Chào mừng bạn đến với **AI Environment** của dự án **Smart Link Finder**. Tài liệu này đóng vai trò là điểm bắt đầu (Entry Point) giúp AI nắm bắt toàn bộ ngữ cảnh dự án, lịch sử công việc và cách thức hoạt động tối ưu nhất nhằm tiết kiệm tài nguyên (tokens) và tránh nhầm lẫn.

---

## 📌 Các Tài Liệu Ngữ Cảnh Liên Kết
*Khi làm việc, AI nên tham chiếu các tài liệu này để có đầy đủ thông tin chi tiết:*

1. [📂 Cấu trúc dự án (structure.md)](file:///c:/Workspace/Web06_find-link/AI%20env/structure.md): Chi tiết sơ đồ thư mục, vai trò của từng file trong Frontend & Backend.
2. [📋 Quản lý tác vụ (tasks.md)](file:///c:/Workspace/Web06_find-link/AI%20env/tasks.md): Theo dõi các công việc đã làm, đang làm, lỗi cần sửa và các tính năng kế hoạch.
3. [⚙️ Quy chuẩn & Hiệu năng AI (rules.md)](file:///c:/Workspace/Web06_find-link/AI%20env/rules.md): Các nguyên tắc viết code, cấu trúc DB, API contract và cách AI tự tối ưu hóa tokens khi hoạt động.

---

## 🚀 Tổng Quan Dự Án & Kiến Trúc

**Smart Link Finder** là một ứng dụng lưu trữ và tìm kiếm liên kết thông minh bằng AI (Semantic Search).

### 🛠️ Tech Stack
* **Frontend**: React (Vite), Vanilla CSS (`App.css`), Lucide React Icons.
* **Backend**: Node.js + Express.
* **Database / Vector Database**: Supabase (PostgreSQL với tiện ích mở rộng `pgvector`).
* **AI Engine**:
  * **Gemini API (`gemini-embedding-001`)**: Sử dụng để tạo vector embedding (768 chiều) cho tiêu đề liên kết phục vụ tìm kiếm ngữ nghĩa.
  * **DeepSeek API (`deepseek-v4-flash`)**: Sử dụng để phân tích đoạn văn bản thô (raw text), tự động trích xuất thông tin (URL, tiêu đề, mô tả, hạn chót) dưới dạng JSON.

### 🔐 Authentication & Authorization
* Xác thực dựa trên mã **JWT (JSON Web Token)** được lưu ở LocalStorage phía client.
* Phân quyền người dùng (Roles):
  * **Guest (Khách)**: Chỉ tìm kiếm và xem chi tiết liên kết.
  * **Manager**: Thêm, sửa, xóa liên kết.
  * **Admin**: Có mọi quyền của Manager, đồng thời có thêm quyền quản lý danh sách Manager (thêm, sửa username/password, xóa tài khoản Manager).

---

## 💡 Hướng Dẫn Dành Cho AI Khi Làm Việc
Để đạt hiệu quả tối đa và tiết kiệm token, AI hãy tuân thủ các quy tắc sau:
1. **Kiểm tra trước khi code**: Luôn xem [tasks.md](file:///c:/Workspace/Web06_find-link/AI%20env/tasks.md) để biết nhiệm vụ hiện tại và cập nhật nó sau khi hoàn thành.
2. **Hạn chế đọc toàn bộ file**: Chỉ sử dụng `view_file` cho các dòng cần chỉnh sửa hoặc đọc tóm tắt cấu trúc thay vì đọc hàng ngàn dòng CSS/JS không liên quan.
3. **Phản hồi súc tích**: Tránh giải thích dài dòng hoặc lặp lại code không cần thiết. Chỉ giải thích lý do thực hiện thay đổi và đưa ra kết quả.
4. **Giữ cấu trúc CSS nhất quán**: Dự án sử dụng Vanilla CSS trong `App.css`. Luôn giữ các biến CSS ở `:root` và đảm bảo các class mới tuân theo hệ thống thiết kế chung (Glassmorphism, Ambient light, Text Gradient).

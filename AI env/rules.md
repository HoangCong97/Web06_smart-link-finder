# Quy Chuẩn & Tiết Kiệm Năng Lượng AI (AI Rules & Token Saving Guidelines)

Tài liệu này xác định các quy tắc lập trình và quy trình tương tác giúp AI hoạt động chuẩn xác, nhanh chóng và tiết kiệm tối đa chi phí tài nguyên (tokens).

---

## 🛠️ Quy Chuẩn Lập Trình (Coding Conventions)

### 1. Phía Frontend (React + CSS)
* **CSS thuần**: Dự án viết CSS tập trung trong `App.css`. Không sử dụng TailwindCSS hay CSS Modules trừ khi có yêu cầu cụ thể.
* **Hệ màu chủ đạo (CSS Variables)**:
  * Tận dụng các biến màu đã định nghĩa ở `:root` trong `App.css` như: `--primary`, `--secondary`, `--bg-dark`, `--text-primary`, v.v.
  * Giữ thiết kế theo phong cách Kính Acrylic sáng (Glassmorphism), có ánh sáng viền loang (Ambient light).
* **Quản lý Component**:
  * Đặt trong thư mục `src/components/`.
  * Viết theo dạng Functional Components, sử dụng hooks (`useState`, `useEffect`, `useRef`).
  * Sử dụng thư viện `lucide-react` để chèn icon. Đảm bảo kích thước icon nhỏ gọn phù hợp (thường là `size={14}` hoặc `size={16}`).

### 2. Phía Backend (Node.js + Express + Supabase)
* **API Endpoints**:
  * Định nghĩa rõ ràng trong `backend/server.js`.
  * Trả dữ liệu dạng JSON rõ ràng, luôn phản hồi các mã HTTP Status Code thích hợp (200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal Server Error).
  * Luôn bao bọc mã trong khối `try-catch` để xử lý lỗi tốt và in log lỗi ra Console.
* **Xác thực & Phân quyền**:
  * Sử dụng JWT Bearer token được gửi qua header `Authorization`.
  * Áp dụng middleware xác thực `authenticateJWT` và phân quyền `requireRole` cho các route bảo mật.

---

## 💡 Hướng Dẫn Tối Ưu Hóa & Tiết Kiệm Tokens Cho AI

Khi AI nhận yêu cầu từ người dùng, hãy áp dụng các nguyên tắc sau để hoạt động hiệu quả và tiết kiệm chi phí:

### 1. Kỹ năng tìm kiếm khoanh vùng (Targeted Search)
* **KHÔNG** đọc toàn bộ thư mục một cách ngẫu nhiên.
* Sử dụng công cụ `grep_search` để tìm chính xác từ khóa, biến hoặc hàm cần xem trong dự án.

### 2. Chỉ đọc dòng cần thiết (Targeted Reading)
* Tệp `App.css` và `server.js` có kích thước khá lớn (>500 dòng).
* **KHÔNG** gọi `view_file` toàn bộ tệp trừ khi bắt buộc.
* Luôn sử dụng tham số `StartLine` và `EndLine` để chỉ đọc đoạn code nhỏ có liên quan đến lỗi hoặc tính năng đang xử lý. Việc này giúp tiết kiệm tới 80% tokens đầu vào.

### 3. Sửa đổi mục tiêu (Targeted Writing)
* Sử dụng `replace_file_content` để thay thế đúng khối code cần thiết bằng cách khai báo chính xác `TargetContent` và phạm vi dòng `StartLine`/`EndLine`.
* Tránh viết đè (overwrite) toàn bộ file lớn nếu chỉ cần sửa vài dòng code.

### 4. Giao tiếp súc tích (Concise Communication)
* Phản hồi người dùng ngắn gọn, tập trung thẳng vào giải pháp hoặc câu trả lời.
* Khi kết thúc phiên làm việc hoặc hoàn thành một tác vụ, hãy tóm tắt ngắn gọn những gì đã làm và chỉ ra các tệp bị ảnh hưởng thông qua đường dẫn liên kết nhấp được (`[App.jsx](file:///...)`).
* Không lặp lại mã nguồn dài dòng trong câu trả lời nếu nó đã có sẵn trong file.

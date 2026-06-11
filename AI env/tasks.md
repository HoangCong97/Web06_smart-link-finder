# Quản Lý Tác Vụ (Task Management) - Smart Link Finder

Tài liệu này dùng để ghi lại tiến độ thực hiện các công việc trong dự án. AI cần cập nhật file này mỗi khi bắt đầu một tính năng mới hoặc sau khi hoàn thành một yêu cầu từ người dùng.

---

## 📋 Trạng Thái Các Tác Vụ

### 1. 🚀 Tác Vụ Đang Thực Hiện (Active Tasks)
* Hiện tại không có tác vụ nào đang thực hiện.

### 2. ⏳ Tác Vụ Kế Hoạch (Backlog / Planned Tasks)
- `[ ]` Tích hợp tính năng Mắt xem và Độ ưu tiên hiển thị cho Link cố định & Link có thời hạn (Theo [plan.md](file:///c:/Workspace/Web06_smart-link-finder/AI%20env/plan.md)).
- `[ ]` Cải thiện hiệu suất tải trang bằng cách tối ưu lazy loading các modal.
- `[ ]` Bổ sung bộ lọc trạng thái hạn chót (Lọc danh sách các link đã quá hạn, sắp quá hạn).

### 3. ✅ Tác Vụ Đã Hoàn Thành (Completed Tasks)
- `[x]` **Thêm tính năng sao chép nhanh liên kết (Click-to-copy URL) trong chi tiết liên kết** - *Hoàn thành ngày 11/06/2026*:
  * Cập nhật `LinkDetailModal.jsx` sử dụng `useState` và `useEffect` để hiển thị trạng thái đã sao chép.
  * Thêm nút Sao chép (sử dụng icon `Copy` và `Check` từ `lucide-react`) cạnh URL hiển thị của liên kết.
  * Thêm các lớp CSS tương ứng (`.detail-url-section`, `.url-copy-wrapper`, `.url-display-text`, `.btn-copy-url`) trong `App.css` để đảm bảo giao diện đẹp mắt theo phong cách chung của hệ thống.
- `[x]` **Tính năng Ghim và Bỏ ghim liên kết** - *Hoàn thành ngày 11/06/2026*:
  * Thêm cột `is_pinned` (boolean) vào bảng `fl_links` và cập nhật trong `init.db.sql`.
  * Cập nhật backend `server.js` để trả về `is_pinned`, sắp xếp các liên kết được ghim lên đầu tiên ở route `GET /api/links`, và hỗ trợ lưu trạng thái ghim ở route `PUT /api/links/:id`.
  * Thêm fallback tự động lấy `is_pinned` từ cơ sở dữ liệu trong `POST /api/search` để đảm bảo tương thích mà không cần bắt buộc nâng cấp RPC.
  * Cập nhật frontend để hiển thị icon ghim trực quan cho tất cả người dùng, cung cấp nút ghim nhanh cho Admin/Manager trên `LinkCard`, và tích hợp checkbox bật/tắt ghim trong `EditLinkModal`.
- `[x]` **Kiểm tra trùng lặp URL trước khi gọi AI và lưu** - *Hoàn thành ngày 11/06/2026*:
  * Thêm logic kiểm tra trùng lặp URL trong database (`fl_links`) trước khi gọi Gemini API tạo embedding và lưu trong route tạo thủ công `POST /api/links` của [server.js](file:///c:/Workspace/Web06_smart-link-finder/backend/server.js).
  * Trong route phân tích AI `POST /api/links/analyze`, sau khi trích xuất URL bằng DeepSeek, kiểm tra sự tồn tại của URL này trong DB trước khi gọi Gemini tạo embedding và lưu.
- `[x]` **Thêm giờ phút vào trường Deadline** - *Hoàn thành ngày 11/06/2026*:
  * Cập nhật kiểu dữ liệu cột `deadline` trong file khởi tạo DB [init.db.sql](file:///c:/Workspace/Web06_smart-link-finder/backend/init.db.sql) thành `timestamp with time zone`.
  * Thay đổi kiểu của trường nhập liệu từ `type="date"` sang `type="datetime-local"` ở [LinkForm.jsx](file:///c:/Workspace/Web06_smart-link-finder/frontend/src/components/LinkForm.jsx) và [EditLinkModal.jsx](file:///c:/Workspace/Web06_smart-link-finder/frontend/src/components/EditLinkModal.jsx).
  * Nâng cấp hàm định dạng ngày tháng `formatDeadlineDate` và hàm tính trạng thái hạn chót `getDeadlineStatus` ở [helpers.js](file:///c:/Workspace/Web06_smart-link-finder/frontend/src/utils/helpers.js) để hiển thị đầy đủ giờ phút cùng các trạng thái relative (quá hạn/còn lại theo giờ, phút).
- `[x]` **Sửa lỗi chức năng xóa hiển thị chi tiết** - *Hoàn thành ngày 11/06/2026*:
  * Nguyên nhân: Sự kiện click trên nút xác nhận xóa ("Xóa" / "Hủy") trong `LinkCard.jsx` bị lan truyền (bubble) lên container cha có thiết lập hành động mở modal chi tiết (`onClickCard`).
  * Cách khắc phục: Thêm `onClick={(e) => e.stopPropagation()}` vào thẻ div bao bọc các nút xác nhận xóa (`confirm-delete`) để chặn sự kiện lan truyền lên thẻ cha.
- `[x]` **Sửa lỗi tài khoản Manager bị báo Không thể kết nối đến Server** - *Hoàn thành ngày 11/06/2026*:
  * Nguyên nhân: Cơ chế phân quyền manager cũ trong backend chặn manager xem danh sách links (403 Forbidden). Frontend cũ chuyển toàn bộ lỗi (bao gồm lỗi phân quyền 403) thành thông báo mất kết nối server.
  * Cách khắc phục:
    * Cho phép tài khoản `manager` kế thừa các quyền cơ bản: `view_links`, `search_links`, `click_link`.
    * Tinh chỉnh catch block ở `App.jsx` chỉ báo mất kết nối mạng khi thực sự gặp lỗi kết nối (ví dụ: `Failed to fetch`).
    * Tích hợp cơ chế tự động đăng xuất (auto-logout) khi phát hiện lỗi token không hợp lệ hoặc hết hạn để tránh kẹt trạng thái.
    * Đã tạo tài khoản test `manager_test` (mật khẩu: `manager123`) để kiểm tra toàn diện mọi tác vụ của Manager (đăng nhập, xem link, tìm kiếm, click, tạo, sửa, xóa link) đều trả về 200/201 thành công.
- `[x]` **Tắt tính năng zoom trên điện thoại (Android & iOS)** - *Hoàn thành ngày 11/06/2026*:
  * Cấu hình thẻ meta viewport `maximum-scale=1.0, user-scalable=no, shrink-to-fit=no` trong [index.html](file:///c:/Workspace/Web06_smart-link-finder/frontend/index.html).
  * Thêm thuộc tính `touch-action: manipulation` vào [index.css](file:///c:/Workspace/Web06_smart-link-finder/frontend/src/index.css) để chặn double-tap to zoom.
  * Thêm JS event listeners lắng nghe sự kiện `gesturestart` và `touchstart` (cho multi-touch > 1 ngón) trong [index.html](file:///c:/Workspace/Web06_smart-link-finder/frontend/index.html) để chặn cử chỉ pinch-to-zoom trên iOS Safari.
  * Thiết lập font-size tối thiểu là `16px` cho các thẻ `input, select, textarea` trên các thiết bị màn hình nhỏ (<768px) để ngăn iOS tự động phóng to (auto-zoom) khi focus vào ô nhập liệu.
- `[x]` **Tái cấu trúc mã nguồn Frontend** - *Hoàn thành ngày 10/06/2026*:
  * Tạo dịch vụ API client tập trung tại [api.js](file:///c:/Workspace/Web06_smart-link-finder/frontend/src/services/api.js) tự động quản lý Authorization header và bắt lỗi.
  * Tạo file tiện ích dùng chung [helpers.js](file:///c:/Workspace/Web06_smart-link-finder/frontend/src/utils/helpers.js) xử lý ngày tháng, domain.
  * Tối ưu hóa các Modal, Form và Component trong project để loại bỏ prop drilling cho `backendUrl`/`token` và sử dụng lại các hàm dùng chung.
- `[x]` **Thiết lập kế hoạch "Mắt xem và độ ưu tiên hiển thị"** (Tạo và lưu trữ chi tiết phương án thiết kế trong [plan.md](file:///c:/Workspace/Web06_smart-link-finder/AI%20env/plan.md)) - *Hoàn thành ngày 09/06/2026*.
- `[x]` **Thiết lập AI Environment** (Tạo thư mục `AI env/` chứa `master.md`, `structure.md`, `rules.md`, `tasks.md`) - *Hoàn thành ngày 09/06/2026*.
- `[x]` **Làm đẹp giao diện Modal chi tiết liên kết** (`LinkDetailModal.jsx`) - *Hoàn thành ngày 09/06/2026*:
  * Bổ sung hiển thị Tiêu đề liên kết (`title`) dạng gradient bắt mắt.
  * Thiết kế lại khung mô tả (`content`) hỗ trợ xuống dòng và có viền trái nổi bật.
  * Tái cấu trúc thông tin thời gian thành lưới 2 cột (Ngày tạo & Hạn chót).
  * Làm đẹp và hiển thị động các trạng thái deadline (quá hạn, hôm nay, gấp, bình thường).
- `[x]` **Phân quyền người dùng (Role-based Authentication)** - *Đã tích hợp phân quyền Guest, Manager và Admin*.

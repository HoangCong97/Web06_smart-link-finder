# Kế hoạch Triển khai: Mắt xem & Độ ưu tiên hiển thị (Smart Link Finder)

Tài liệu này chi tiết hóa giải pháp kỹ thuật và kế hoạch tích hợp tính năng **Mắt xem (Views/Traffic Tracking)** và **Độ ưu tiên hiển thị (Display Priority)** cho hai loại liên kết: **Cố định (Permanent)** và **Có thời hạn (Temporary)**.

---

## 1. Phân loại Liên kết (Link Classification)

Hệ thống sẽ quản lý hai loại liên kết:
1. **Link cố định (`permanent`)**: Không hết hạn (`deadline = NULL`), lượt truy cập dàn trải đều theo thời gian.
2. **Link có thời hạn (`temporary`)**: Có hạn chót (`deadline NOT NULL`), cần đẩy mạnh hiển thị và có lượng truy cập cao trong khoảng thời gian nhất định trước khi hết hạn.

### Thay đổi Cấu trúc Database (Supabase PostgreSQL)
Chúng ta sẽ bổ sung các cột mới vào bảng `fl_links` trong cơ sở dữ liệu:
* **`link_type`** (`text`, mặc định `'permanent'`): Lưu loại link, có kiểm tra điều kiện `CHECK (link_type IN ('permanent', 'temporary'))`.
* **`click_count`** (`integer`, mặc định `0`): Theo dõi tổng số lượt click truy cập vào liên kết.
* **`views_today`** (`integer`, mặc định `0`): Lượt click tích lũy trong ngày (được reset tự động hàng ngày bằng Cron Job hoặc tính toán động).

*Để phục vụ việc tính toán mức độ "Hot" chính xác hơn theo thời gian, đề xuất thêm một bảng ghi nhận log click:*
```sql
CREATE TABLE public.fl_link_clicks (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    link_id bigint REFERENCES public.fl_links(id) ON DELETE CASCADE,
    clicked_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

---

## 2. Giải pháp "Mắt xem" (Traffic Tracking)

Giải pháp theo dõi truy cập sẽ được triển khai theo 2 cấp độ:

### Cấp độ 1: Lượt truy cập tích lũy (Total Clicks) & Lượt click gần đây
* **Khi click**: Khi người dùng nhấn nút **"Truy cập liên kết"** trên UI hoặc click trực tiếp vào URL trên thẻ LinkCard:
  1. Frontend gọi API `POST /api/links/:id/click` (không yêu cầu token đăng nhập).
  2. Backend cập nhật tăng `click_count` trong bảng `fl_links` và chèn một bản ghi vào bảng `fl_link_clicks`.
* **Tính toán độ "Hot" (Hotness Score)**:
  Số lượt click trong 24 giờ qua sẽ được tính bằng cách đếm số dòng trong `fl_link_clicks` thuộc về `link_id` đó trong vòng 24h qua.

### Cấp độ 2: Số người đang xem trực tiếp (Realtime Live Viewers - Tùy chọn)
* **Công nghệ**: Sử dụng **Supabase Broadcast & Presence**.
* **Luồng xử lý**:
  1. Khi người dùng mở [LinkDetailModal.jsx](file:///c:/Workspace/Web06_smart-link-finder/frontend/src/components/LinkDetailModal.jsx), client sẽ đăng ký vào một channel realtime của Supabase với định danh `link:detail:[id]`.
  2. Supabase tự động theo dõi số lượng kết nối đang active (Presence) trong channel này.
  3. Frontend lắng nghe sự kiện thay đổi trạng thái của Presence để cập nhật số lượng mắt xem trực tuyến theo thời gian thực (ví dụ: `👁️ 3 người đang xem`).

---

## 3. Giải pháp "Độ ưu tiên hiển thị" (Display Priority)

Khi hiển thị danh sách, hệ thống sẽ tự động tính toán và phân bổ liên kết vào các Tầng ưu tiên (Tiers) dưới đây để đảm bảo hiển thị hợp lý:

### Bảng phân tầng ưu tiên (Sorting Priority Tiers)

| Tầng (Tier) | Mô tả Nhóm liên kết | Điều kiện xác định | Thứ tự sắp xếp trong cùng tầng |
| :---: | :--- | :--- | :--- |
| **Tier 1** | Link sắp hết hạn | Có deadline và `0 < deadline - hiện tại <= 2 ngày` | `deadline` tăng dần (sắp hết hạn nhất lên trước) |
| **Tier 2** | Link hot 3 ngày gần đây | Số click trong 3 ngày qua `clicks_3d > 0` | Số click `clicks_3d` giảm dần |
| **Tier 3** | Link mới thêm| `created_at` trong vòng 1 giờ qua | `created_at` giảm dần (mới nhất lên trước) |
| **Tier 4** | Link mới hết hạn | Có deadline và `0 <= hiện tại - deadline <= 1 ngày` | `deadline` giảm dần (mới hết hạn nhất lên trước) |
| **Tier 5** | Link có thời hạn còn hạn dài | Có deadline và `deadline - hiện tại > 2 ngày` | `deadline` tăng dần (sắp hết hạn nhất lên trước) |
| **Tier 6** | Link click nhiều không thời hạn | Không deadline và tổng `click_count > 0` | `click_count` giảm dần |
| **Tier 7** | Link không thời hạn | Không deadline và tổng `click_count = 0` | `created_at` giảm dần |
| **Tier 8** | Link quá hạn | Có deadline và `hiện tại - deadline > 1 ngày` | `deadline` giảm dần (mới quá hạn lên trước) |

### Sắp xếp chi tiết (Sorting Logic)
* **Mặc định (Smart Sorting)**: Hệ thống sẽ phân nhóm tất cả các liên kết vào các Tier từ 1 đến 8 ở trên, sau đó sắp xếp theo `Tier ASC` (Tầng nhỏ hiển thị trước). Đối với các liên kết cùng tầng, áp dụng thứ tự sắp xếp phụ được quy định ở cột cuối cùng trong bảng.
* **Khi tìm kiếm ngữ nghĩa AI**: Kết quả tìm kiếm sẽ được sắp xếp dựa trên điểm tương đồng (Similarity) từ cao xuống thấp. Nếu có những liên kết có điểm tương đồng bằng nhau, hệ thống sẽ ưu tiên liên kết thuộc Tier cao hơn (Tier số nhỏ hơn).

---

## 4. Đề xuất Thiết kế & Trải nghiệm Người dùng (UI/UX)

Giao diện sẽ được cập nhật để mang lại cảm giác hiện đại, sinh động bằng Vanilla CSS (Glassmorphism):

### Trên Thẻ [LinkCard.jsx](file:///c:/Workspace/Web06_smart-link-finder/frontend/src/components/LinkCard.jsx)
* **Badge Loại Link**:
  * **Link cố định**: Hiển thị badge màu xanh dương ngọc dịu nhẹ (`--cyan-glow`) với icon cái ghim hoặc vô cực.
  * **Link có hạn**: Hiển thị badge màu cam sáng (`--orange-glow`) với icon đồng hồ cát.
* **Số lượt click**: Hiển thị icon mắt xem nhỏ `👁️ 152 lượt truy cập` tinh tế ở góc dưới.
* **Hiệu ứng đặc biệt (Hot/Urgent Link)**:
  * Nếu link có hạn sắp hết hạn trong 24h và có lượt click cao, thẻ card sẽ có hiệu ứng viền phát sáng gradient loang màu nhẹ (`border-glow-pulse`) để thu hút sự chú ý của người dùng.

### Trên Modal chi tiết [LinkDetailModal.jsx](file:///c:/Workspace/Web06_smart-link-finder/frontend/src/components/LinkDetailModal.jsx)
* Bổ sung một khu vực thống kê lượt truy cập:
  * Tổng lượt click: `1,250`.
  * Xu hướng hôm nay: `🔥 84 lượt click (Hot)`.
  * Số lượng người đang xem trực tiếp (nếu dùng Realtime).

### Bộ lọc tại [SearchBar.jsx](file:///c:/Workspace/Web06_smart-link-finder/frontend/src/components/SearchBar.jsx)
* Thêm một danh sách lựa chọn (Dropdown) để người dùng chủ động chọn kiểu sắp xếp:
  * **Thông minh (Smart)**: Sắp xếp theo điểm ưu tiên động.
  * **Liên kết Hot**: Ưu tiên link có lượt truy cập cao nhất.
  * **Mới nhất**: Xếp theo ngày tạo giảm dần.
  * **Độ tương đồng**: Xếp theo mức độ khớp tìm kiếm AI.

---

## 5. Kế hoạch Triển khai Từng bước (Action Plan)

### Bước 1: Cập nhật Cơ sở dữ liệu (Supabase SQL)
1. Thêm các cột `link_type` và `click_count` vào bảng `fl_links`.
2. Tạo bảng `fl_link_clicks` để ghi nhận nhật ký click chi tiết.
3. Cập nhật hoặc viết lại hàm RPC `match_links` để hỗ trợ tính điểm và sắp xếp theo ưu tiên nếu cần.

### Bước 2: Nâng cấp Backend (Express Server - [server.js](file:///c:/Workspace/Web06_smart-link-finder/backend/server.js))
1. Cập nhật API lấy danh sách link: Tính toán `Priority Score` và trả về kèm thông tin lượt xem.
2. Thêm API endpoint `POST /api/links/:id/click` để ghi nhận lượt truy cập của người dùng.
3. Cập nhật API thêm/sửa link: Tự động phát hiện hoặc cho phép cấu hình `link_type`.

### Bước 3: Nâng cấp Frontend (React - [App.jsx](file:///c:/Workspace/Web06_smart-link-finder/frontend/src/App.jsx))
1. Tích hợp gọi API click khi người dùng truy cập liên kết.
2. Cập nhật giao diện [LinkCard.jsx](file:///c:/Workspace/Web06_smart-link-finder/frontend/src/components/LinkCard.jsx) để hiển thị badge loại link, số lượt click, và các hiệu ứng phát sáng.
3. Cập nhật [LinkDetailModal.jsx](file:///c:/Workspace/Web06_smart-link-finder/frontend/src/components/LinkDetailModal.jsx) hiển thị thông số chi tiết mắt xem.
4. Thêm chức năng lọc/sắp xếp thông minh ở [SearchBar.jsx](file:///c:/Workspace/Web06_smart-link-finder/frontend/src/components/SearchBar.jsx).

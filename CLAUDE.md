# HV-Pharmacy – Website Khoa Dược, BVĐK Hùng Vương

## Bối cảnh
- Làm lại website Khoa Dược (thay cho bản Google Sites cũ) với mục tiêu: **0đ, đẹp, nhanh**.
- Người dùng: bác sĩ, dược sĩ, điều dưỡng của bệnh viện. Ngôn ngữ giao diện: **tiếng Việt**.
- Chủ dự án muốn trả lời bằng tiếng Việt, ngắn gọn, có ví dụ cụ thể. Thông tin y khoa phải dẫn nguồn BYT hoặc hiệp hội chuyên khoa uy tín (kèm link).

## Kiến trúc đã chốt
- Web tĩnh: HTML/CSS/JS thuần, **không framework, không build step**. Mọi thứ trong `index.html`.
- Hosting: **Cloudflare Pages** (miễn phí, không giới hạn băng thông), deploy từ GitHub repo. Tên miền tạm `*.pages.dev`; sau xin subdomain từ CNTT bệnh viện.
- Các công cụ tra cứu hiện có là **Google Apps Script web app** → giữ nguyên, chỉ link sang.
- Tài liệu PDF để trên Google Drive; video trên YouTube; góp ý dùng Google Form.
- Giai đoạn sau: đọc danh sách tài liệu/tin từ **Google Sheets** (publish CSV) để khoa tự cập nhật không cần sửa code.

## Cấu trúc nội dung (`index.html`)
Nội dung nằm trong 3 mảng cấu hình ở cuối file, trong `<script>`:
- `TOOLS` – công cụ tra cứu `{name, desc, url, icon, tag?}`. `url:""` → hiện "Đang cập nhật".
- `DOCS` – tài liệu `{kind, name, note, url}`.
- `VIDEOS` – video hướng dẫn `{name, note, url}`.
Ô tìm kiếm lọc cả 3 mảng, không phân biệt dấu.

Thiết kế: font **Be Vietnam Pro** cho toàn trang (tiêu đề đậm 700, nội dung 400–600), dự phòng **Arial**; JetBrains Mono cho nhãn nhỏ. Không dùng font có chân (Times/Fraunces) – chốt 20/11/2026 để hợp nhận diện BV (Myriad Pro, không chân); có dark mode; responsive tới ~400px. Giữ nguyên phong cách này khi thêm trang.

## Nhận diện thương hiệu (chốt 20/11/2026)
- Theo nhận diện BVĐK Hùng Vương (benhvienhungvuong.vn): `--brand` xanh dương **#1577BC** (dark: #5AAEE8), `--accent` đỏ chữ thập **#D7262E** (dark: #FF7A6B), nền #F5F8FB.
- Logo: dùng file **chính thức** của BV (đã được phép, 20/11/2026), lưu trong `assets/`:
  - `assets/favicon-bvhv.png` (200×200, biểu trưng hình thoi) → logo góc trên trái kèm chữ "Khoa Dược / BVĐK Hùng Vương · HV-Pharmacy", favicon, apple-touch-icon.
  - `assets/logo-bvhv.png` (816×134, logo ngang có tên BV + khẩu hiệu) → chân trang, đặt trên nền trắng bo góc để đọc được ở dark mode.
  - Nguồn: benhvienhungvuong.vn/favicon.png và logo đầu trang của website BV.
  - Lưu ý: khung xem trước dạng data: không tải được ảnh tương đối; xem thử bằng server cục bộ hoặc sau khi deploy.
- Khẩu hiệu BV: "Thân thiện – Chuyên nghiệp – Chu đáo" (màu accent, chữ nghiêng).
- Ảnh: không dùng ảnh chụp; minh hoạ SVG (`.hero-art`: hình thoi, lọ thuốc, viên nang, vỉ thuốc), ẩn dưới 820px.
## Link đã biết
- Thông tin thuốc BVHV: https://script.google.com/macros/s/AKfycbw0rOd8davPK5fL-vFp8-aj3DEPztAGZ8WfGx-9Joi0q9zcZ37hXxZigjjtA6xWlhP7/exec
- Website BV: https://benhvienhungvuong.vn/
- Email khoa: khoaduochv@gmail.com
- Google Sites cũ (bản nháp, chưa xuất bản): https://sites.google.com/d/1daw07BidwpA8h0RJuidRTwJx54z0tCax/p/1vCNfTbeR9Q6kziYw2KVALjGT4-kw6ZRH/edit
  – có các trang nhúng Apps Script: "THÔNG TIN THUỐC BVHV", "THUỐC VÀ BIỆT DƯỢC" → lấy link /exec từ đó.

## Việc cần làm (TODO)
1. [~] Điền link công cụ: ĐÃ XONG Danh mục thuốc, Người bệnh đặc biệt, Thuốc tiêm truyền, Tương tác thuốc–thuốc, ICD-10 (lấy từ Google Sites 20/11/2026). CÒN THIẾU: Tương hợp–tương kỵ (Sites cũ không có trang riêng).
2. [ ] Điền link PDF: Bản tin thông tin thuốc số 1/2025; Danh mục LASA 2026. (20/11/2026: tìm trên Drive không thấy – chỉ có "LASA 2019.pdf" của BV khác và "BẢN TIN TTT số 1_2026" của kimlanbvdkbt, không phải của khoa. Cần chủ dự án gửi file/link.)
3. [x] Link 7 video: dùng file MP4 trên Google Drive của khoaduochv@gmail.com (chế độ "ai có link đều xem được"), lấy từ trang "Hướng dẫn sử dụng thuốc" trên Sites cũ. (Sau) có thể đưa lên YouTube để xem mượt hơn – Rapihaler & Turbuhaler nặng ~460MB/file.
4. [ ] Tạo Google Form góp ý, thay dòng "Góp ý" ở mục Liên hệ.
5. [ ] `git init`, tạo repo GitHub `hv-pharmacy`, push.
6. [ ] Cloudflare Pages: Connect to Git → chọn repo → Framework: None, Build command: trống, Output dir: `/`.
7. [ ] (Sau) Nối Google Sheets cho mục Tài liệu/Bản tin.
8. [ ] (Sau) Thẻ Open Graph (cần ảnh og.png 1200×630), trang 404. Favicon đã xong.

## Quy ước
- Không thêm thư viện ngoài nếu không thật cần. Không dẫn ảnh từ nguồn bên ngoài (ảnh phải nằm trong `assets/`); icon dùng SVG inline.
- Mỗi thay đổi: commit ngắn gọn bằng tiếng Việt, ví dụ `Thêm link video Ellipta`.
- Kiểm tra lại trên mobile (DevTools 390px) và dark mode trước khi push.

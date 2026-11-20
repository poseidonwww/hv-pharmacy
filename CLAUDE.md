# HV-Pharmacy – Website Khoa Dược, BVĐK Hùng Vương

## Bối cảnh
- Làm lại website Khoa Dược (thay cho bản Google Sites cũ) với mục tiêu: **0đ, đẹp, nhanh**.
- Người dùng: bác sĩ, dược sĩ, điều dưỡng của bệnh viện. Ngôn ngữ giao diện: **tiếng Việt**.
- Chủ dự án muốn trả lời bằng tiếng Việt, ngắn gọn, có ví dụ cụ thể. Thông tin y khoa phải dẫn nguồn BYT hoặc hiệp hội chuyên khoa uy tín (kèm link).

## Kiến trúc đã chốt
- Web tĩnh: HTML/CSS/JS thuần, **không framework, không build step**. CSS dùng chung ở `assets/site.css`; mỗi trang là 1 file `.html` ở thư mục gốc (`index.html`, `danh-muc.html`), CSS/JS riêng của trang để inline trong trang đó.
- Hosting: **Cloudflare Pages** (miễn phí, không giới hạn băng thông), deploy từ GitHub repo. Tên miền tạm `*.pages.dev`; sau xin subdomain từ CNTT bệnh viện.
- Các công cụ tra cứu cũ là **Google Apps Script web app** (chậm 3–5s, có dải cảnh báo Google, khác giao diện).
  **Hướng chốt (20/11/2026):** chuyển dần sang trang con trong site, **Google Sheets vẫn là nơi khoa sửa dữ liệu**. Trang con đọc Sheet qua endpoint gviz (`/gviz/tq?tqx=out:csv&headers=1&gid=..&tq=<truy vấn>`), Sheet chỉ cần chia sẻ "Bất kỳ ai có link – Người xem" (không cần "Xuất bản lên web"). Danh sách chỉ lấy vài cột (nhẹ), chi tiết lấy 1 dòng khi bấm. Công cụ có logic phức tạp (Tương tác thuốc) giữ Apps Script.
  **Không** đưa lên Sheet công khai các cột giá, nhà thầu, tồn kho, dữ liệu người bệnh.
- Trang con đã làm:
  - `danh-muc.html` – Danh mục thuốc. Nguồn: Sheet "Thông tin thuốc" `1mFGQKHG6SrsI9V4O6YgNWhxnuIOtr6Fmj4pARdzhdi0` (chủ: khoaduochv), `Sheet1` (gid 0), cột A–O (INN, biệt dược, bảo quản, chỉ định, liều, CCĐ, cảnh báo, PNCT/CCB, ADR, tương tác, quá liều, dược lực, dược động, ATC, link HDSD). ~930 thuốc; danh sách 147KB/~0,5s, chi tiết ~2KB/~0,3s. Danh sách lưu localStorage `hv-dm-list-v1` để mở lại tức thì. Link chia sẻ: `danh-muc.html#t=<tên biệt dược>`. Ô trong Sheet ngăn ý bằng ` | ` → hiển thị thành gạch đầu dòng.
  - `dac-biet.html` – Người bệnh đặc biệt. Nguồn: cùng file, `Sheet2` (gid 545322599): A INN · B biệt dược · F liều suy gan · G liều suy thận · I CCĐ suy gan · J CCĐ suy thận · L PNCT & CCB · R ATC · S link HDSD. Danh sách tải cột A,B,F,G,I,J,R,S (~324KB, ~0,4s, cache `hv-db-list-v1`); cột L tải theo từng thuốc.
    - Tính CrCl: Cockcroft–Gault (≥16 tuổi, ×0,85 nữ), Schwartz bedside 0,413×cao/creatinin (<16 tuổi); creatinin µmol/L ÷ 88,4 = mg/dL. Mức: ≥90 / 60–89 / 30–59 / 15–29 / <15. Child-Pugh 5 tiêu chí: A 5–6, B 7–9, C 10–15. Đã đối chiếu tay: nam 70t 60kg Cr 150 µmol/L → 34 ml/ph.
    - Chọn suy thận/suy gan mà không gõ tên → chỉ hiện thuốc có ghi CCĐ/chỉnh liều (CCĐ lên trước). Ô trống → hiện "Tờ HDSD không ghi khuyến cáo riêng" (KHÔNG ghi "an toàn").
    - Số liệu người bệnh chỉ tính trên trình duyệt, không lưu, không gửi đi.
    - Sheet1 và Sheet2 là 2 bản riêng – khoa sửa thông tin chung cần sửa cả hai (hoặc gộp về 1 trang tính sau).
  - `tiem-truyen.html` – Pha thuốc tiêm truyền. Nguồn: Sheet **"Pha truyền"** `1w29urr_OiIs4MAurEwM8oLKdVMpq3k9z699i_WWNEJs` (chủ: khoaduochv; có Apps Script gắn kèm "Pha chế thuốc tiêm truyền" `1u9zJha709CjDjJAk4bAkFvHQgi3vnxbfVqVNhoTYqSTSPKRxa3p4__31` – chính là công cụ cũ). Trang tính đầu, 2 dòng tiêu đề; dòng chỉ có cột A = tên nhóm ("Thuốc kháng sinh", "Thuốc tiêm truyền khác"). Cột A–N: tên, biệt dược, dạng bào chế, bảo quản, cảm quan, cách hoàn nguyên, BQ sau hoàn nguyên, cách pha loãng, **nồng độ khuyến cáo**, **tốc độ truyền** (2 cột này tô đỏ), đặc điểm dd, BQ sau pha loãng, đường ngoài TM, lưu ý. 62 thuốc, ~34KB → tải hết 1 lần (cache `hv-tt-v1`). Link chia sẻ `#t=<tên> – <biệt dược>`; có nút In.
  - KHÔNG dùng file "Hướng dẫn pha - bảo quản kháng sinh" (11/2024) – nội dung cũ, khác bảng "Pha truyền".
  - `icd10.html` – Mã ICD-10 (TT 06/2026/TT-BYT). Công cụ Apps Script cũ **đã hỏng** (lỗi "Không tìm thấy tệp HTML Index") → thay hẳn. Nguồn: file Excel **"Danh muc ICD TT06 2026.xlsx"** trên Drive (`19fzxO5eW7AC71tWp_E-qkrRWKYIoA1V6`) → chạy `python tools/build-icd.py <file.xlsx>` tạo `data/icd10.json` (15.844 mã, ~2,1MB, ~300KB nén) và `data/icd10-hd.json` (hướng dẫn mã hoá WHO, tải khi mở chi tiết). Dữ liệu TĨNH trong repo – khi BYT cập nhật: tải Excel mới, chạy lại script, commit.
    - Cờ mã (bit): 1 không dùng làm bệnh chính · 2 không khuyến khích làm BC · 4 có mã chi tiết hơn · 8 chỉ mã hoá tử vong · 16 nữ · 32 nam.
    - Tìm: mã (bỏ dấu chấm được, "j189"), tên Việt không dấu, tên Anh. Xếp hạng: khớp mã > cụm từ ở đầu một từ > chứa > từng từ; mã cờ 1/2 bị đẩy xuống. Sao chép mã bỏ ký hiệu †/* (để dán HIS). Link `icd10.html#m=J18.9`.
- CSS trang con dùng chung (page-hero, crumb, dialog chi tiết, nút…) nằm trong `assets/site.css` mục "TRANG CON". Menu trang con: Danh mục thuốc · Tiêm truyền · Người bệnh đặc biệt · ICD-10.
- Lưu ý CSS: `site.css` có rule chung cho thẻ `section` (padding 80px) → trong trang con KHÔNG dùng `<section>` cho khối nhỏ, dùng `<div>`.
- Tài liệu PDF để trên Google Drive; video trên YouTube; góp ý dùng Google Form.
- Giai đoạn sau: đọc danh sách tài liệu/tin từ **Google Sheets** (publish CSV) để khoa tự cập nhật không cần sửa code.

## Cấu trúc nội dung (`index.html`)
Nội dung nằm trong 3 mảng cấu hình ở cuối file, trong `<script>`:
- `TOOLS` – công cụ tra cứu `{name, desc, url, icon, tag?, quick?}`. `url:""` → hiện "Đang cập nhật". `url` là trang trong site (vd `danh-muc.html`) thì mở cùng tab, link `http…` mở tab mới.
- `DOCS` – tài liệu `{kind, name, note, url}`.
- `VIDEOS` – video hướng dẫn `{name, note, url}`.
Ô tìm kiếm lọc cả 3 mảng, không phân biệt dấu.

Thiết kế: font **Be Vietnam Pro** cho toàn trang (kể cả nhãn nhỏ), dự phòng **Arial**. Không dùng font có chân (Times/Fraunces) hay font mono – chốt 20/11/2026 để hợp nhận diện BV (Myriad Pro, không chân); có dark mode; responsive tới ~390px. Giữ nguyên phong cách này khi thêm trang.
- **Thang cỡ chữ** (biến CSS, chỉ dùng các biến này): `--fs-xs` 12.5px (nhãn, chú thích) · `--fs-sm` 14.5px (mô tả thẻ) · `--fs-base` 16px (nội dung) · `--fs-md` 18px (đoạn dẫn, tiêu đề thẻ) · `--fs-lg` 24→32px (h2) · `--fs-xl` 30→46px (h1).
- Bố cục: thanh trên navy → header trắng dính → hero dải xanh BV (tiêu đề + ô tìm + khung "Truy cập nhanh" có số liệu) → các mục 01–04 (nhãn đỏ-xanh + h2 + mô tả) → footer navy 3 cột.
- Khung "Truy cập nhanh" lấy công cụ có `quick:true` trong mảng `TOOLS`; số liệu tự đếm.
- Xem thử trên máy: `python -m http.server 5173 --directory hv-pharmacy` rồi mở http://localhost:5173.

## Nhận diện thương hiệu (chốt 20/11/2026)
- Theo nhận diện BVĐK Hùng Vương (benhvienhungvuong.vn): `--brand` xanh dương **#1577BC** (dark: #5AAEE8), `--accent` đỏ chữ thập **#D7262E** (dark: #FF7A6B), nền #F5F8FB.
- Logo: dùng file **chính thức** của BV (đã được phép, 20/11/2026), lưu trong `assets/`:
  - `assets/favicon-bvhv.png` (200×200, biểu trưng hình thoi) → logo góc trên trái kèm chữ "Khoa Dược / BVĐK Hùng Vương · HV-Pharmacy", favicon, apple-touch-icon.
  - `assets/logo-bvhv.png` (816×134, logo ngang có tên BV + khẩu hiệu) → chân trang, đặt trên nền trắng bo góc để đọc được ở dark mode.
  - Nguồn: benhvienhungvuong.vn/favicon.png và logo đầu trang của website BV.
  - Lưu ý: khung xem trước dạng data: không tải được ảnh tương đối; xem thử bằng server cục bộ hoặc sau khi deploy.
- Khẩu hiệu BV: "Thân thiện – Chuyên nghiệp – Chu đáo" (màu accent, chữ nghiêng).
- Ảnh thật của BV (nguồn: website BV + Google Sites cũ), nén WebP trong `assets/`:
  - `bv-toan-canh.webp` (1920×1080, ~270KB) – ảnh flycam toàn cảnh, làm nền hero dưới lớp phủ xanh.
  - `bv-cong-chinh.webp` (1200×800, ~160KB) – cổng chính & toà nhà A, ở mục "Về Khoa Dược", kèm nút "Video giới thiệu" → YouTube bCUnUgNY9gw.
  - Không dùng ảnh minh hoạ AI/stock của Sites cũ (bác sĩ cầm bảng, lọ thuốc) và ảnh cơ sở Gia Lai/Thanh Ba.
  - Ảnh mới: resize ≤1920px, WebP q55–78, giữ mỗi ảnh < 300KB.
  - (Sau) Cần ảnh thật của **Khoa Dược** (kho thuốc, quầy cấp phát, tập thể khoa) – chưa có.
## Link đã biết
- "Thông tin thuốc BVHV" (AKfycbw0rOd8…/exec) thực chất là công cụ **QUẢN TRỊ** "Quản lý danh mục thuốc" (569 thuốc, có nút Thêm/Sửa/Xoá/Làm mới dữ liệu). **Đã gỡ khỏi trang chủ (20/11/2026)** – KHÔNG đưa lại lên site công khai. Phần tra cứu đã có `danh-muc.html`. Cần chủ dự án giới hạn quyền truy cập bản triển khai Apps Script (chỉ tài khoản khoa).
- **Danh mục chuẩn của khoa = bảng "Thông tin thuốc" 930 thuốc** (`1mFGQKHG6SrsI9V4O6YgNWhxnuIOtr6Fmj4pARdzhdi0`, chốt 20/11/2026). Bảng 569 thuốc của công cụ quản trị KHÔNG dùng làm nguồn cho site.
- Website BV: https://benhvienhungvuong.vn/
- Email khoa: khoaduochv@gmail.com
- Google Sites cũ (bản nháp, chưa xuất bản): https://sites.google.com/d/1daw07BidwpA8h0RJuidRTwJx54z0tCax/p/1vCNfTbeR9Q6kziYw2KVALjGT4-kw6ZRH/edit
  – có các trang nhúng Apps Script: "THÔNG TIN THUỐC BVHV", "THUỐC VÀ BIỆT DƯỢC" → lấy link /exec từ đó.

## Việc cần làm (TODO)
1. [~] Điền link công cụ: ĐÃ XONG Danh mục thuốc, Người bệnh đặc biệt, Thuốc tiêm truyền, Tương tác thuốc–thuốc, ICD-10 (lấy từ Google Sites 20/11/2026). Tương hợp–tương kỵ: **tạm ẩn khỏi trang chủ** (chưa có dữ liệu; chủ dự án sẽ bổ sung). Hướng đã bàn: Sheet theo cặp thuốc (Thuốc A, Thuốc B, Y-site/bơm tiêm/túi dịch, kết quả, điều kiện, nguồn, ngày, DS duyệt) + trang ma trận; "chưa có dữ liệu" = không trộn chung.
2. [ ] Điền link PDF: Bản tin thông tin thuốc số 1/2025; Danh mục LASA 2026. (20/11/2026: tìm trên Drive không thấy – chỉ có "LASA 2019.pdf" của BV khác và "BẢN TIN TTT số 1_2026" của kimlanbvdkbt, không phải của khoa. Cần chủ dự án gửi file/link.)
3. [x] Link 7 video: dùng file MP4 trên Google Drive của khoaduochv@gmail.com (chế độ "ai có link đều xem được"), lấy từ trang "Hướng dẫn sử dụng thuốc" trên Sites cũ. (Sau) có thể đưa lên YouTube để xem mượt hơn – Rapihaler & Turbuhaler nặng ~460MB/file.
4. [x] Google Form góp ý (20/11/2026, chủ: khoaduochv@gmail.com):
   – Điền: https://docs.google.com/forms/d/e/1FAIpQLSf9UKCRkBBMIAIP0fAv91ys_OSCQNon6elGApa5aiQl8sa_lg/viewform
   – Sửa Form: https://docs.google.com/forms/d/1JcRXmTDT8Z2yK-qPzL7RT-Kdy54Wnpx9U-uuSiiSku8/edit
   – Câu trả lời: Sheet "Góp ý HV-Pharmacy (câu trả lời)" https://docs.google.com/spreadsheets/d/1V2fwTdqm0xxpzbyn3uUfT7-muz0LE5qzDfMprravbyQ/edit
   – Tạo bằng `tools/tao-form-gop-y.gs` (dự án Apps Script "Tao Form gop y HV-Pharmacy" của khoaduochv). Không bắt đăng nhập, không thu email.
   – Link + mã câu hỏi (entry) nằm trong `assets/site.js` (`gopYUrl()` tạo link điền sẵn loại góp ý/trang/tên thuốc). Sửa câu hỏi trong Form → kiểm tra lại entry.
   – Nút "Báo thông tin chưa đúng" có trong chi tiết của danh-muc, dac-biet, tiem-truyen, icd10; trang chủ: thẻ Liên hệ + chân trang.
5. [x] Repo GitHub riêng tư: https://github.com/poseidonwww/hv-pharmacy (nhánh `main`).
6. [x] Cloudflare Pages (20/11/2026): **https://hv-pharmacy.pages.dev** – mỗi lần push lên `main` tự deploy lại sau ~1 phút.
   – App "Cloudflare Workers and Pages" trên GitHub đang được cài; nên giới hạn chỉ repo hv-pharmacy (GitHub → Settings → Applications → Configure).
   – (Sau) Xin subdomain từ CNTT BV, thêm ở Pages → Custom domains.
7. [ ] (Sau) Nối Google Sheets cho mục Tài liệu/Bản tin.
8. [ ] (Sau) Thẻ Open Graph (cần ảnh og.png 1200×630), trang 404. Favicon đã xong.

## Quy ước
- JS dùng chung ở `assets/site.js` (nạp trước script riêng của trang). Không thêm thư viện ngoài nếu không thật cần. Không dẫn ảnh từ nguồn bên ngoài (ảnh phải nằm trong `assets/`); icon dùng SVG inline.
- Mỗi thay đổi: commit ngắn gọn bằng tiếng Việt, ví dụ `Thêm link video Ellipta`.
- Kiểm tra lại trên mobile (DevTools 390px) và dark mode trước khi push.

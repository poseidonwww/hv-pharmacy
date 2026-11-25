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
- `tuong-tac.html` – **Tương tác thuốc** (thay Apps Script `AKfycbwAg5…/exec`; công cụ cũ vẫn chạy, làm dự phòng). Nguồn: Sheet **"Copy of DANH MỤC TƯƠNG TÁC THUỐC"** `1HkVvMD7qrwI3BvvCqPe-bW_gduQwBf4BE181XRh0l6o`, trang tính `DANH MỤC` (đọc bằng `&sheet=`), dòng 1 tiêu đề: A STT · B/D tên Việt · **C/E hoạt chất chuẩn (khoá nhận diện)** · F tuổi · G mã bệnh ICD · H eGFR · I khoảng cách (thuốc 2 sau thuốc 1; số trơn = ngày) · J mức độ · K cơ chế · L hậu quả · M xử trí. 767 cặp / 248 hoạt chất, ~393KB (~0,5s), cache `hv-tt2-v1`.
    - Nhập nhiều hoạt chất → dò mọi cặp; 1 hoạt chất → mọi thuốc tương tác với nó. Người bệnh (tuỳ chọn): tuổi, eGFR, mã ICD (gõ, đối chiếu tên từ data/icd10.json).
    - Điều kiện xét theo AND: tất cả khớp → "Áp dụng"; có điều kiện không khớp → "Không áp dụng" (vẫn hiện, mờ); thiếu số liệu → "Cần kiểm tra". Không có điều kiện → "Luôn áp dụng". KHÔNG ẩn cặp nào.
    - Mức độ "1"/"2"/trống (30 dòng) → hiện "Chưa phân loại" – không tự đoán. Lỗi gõ ICD "E12..9" tự sửa khi đọc.
    - Tên Việt lấy tên xuất hiện nhiều nhất cho mỗi hoạt chất chuẩn (cột B/D có lỗi gõ kiểu "Lopinavir/rito avir").
    - (Sau) tìm theo biệt dược: cần cột ánh xạ biệt dược → hoạt chất chuẩn (bảng Thông tin thuốc ghi INN kiểu Việt).
    - Dự án Apps Script cũ: "Untitled project" `1NszVmnSeUMofKY3pn4e2qBGJ1jBavVKr67aHot_v4w0Ytu-Yye3IsD0H` (khoaduochv).
- Hướng dẫn khoa tự cập nhật dữ liệu: **README.md** mục "Cập nhật dữ liệu".
- CSS trang con dùng chung (page-hero, crumb, dialog chi tiết, nút…) nằm trong `assets/site.css` mục "TRANG CON". Menu trang con: Danh mục thuốc · Tương tác · Tiêm truyền · Người bệnh đặc biệt · ICD-10.
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
2. [x] Bản tin & LASA: lấy từ thư mục Drive "Thông tin Dược" (thẻ Bản tin thông tin thuốc). Bản tin số 1/2025 chưa có trong thư mục. (20/11/2026: tìm trên Drive không thấy – chỉ có "LASA 2019.pdf" của BV khác và "BẢN TIN TTT số 1_2026" của kimlanbvdkbt, không phải của khoa. Cần chủ dự án gửi file/link.)
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

## Trang Quy trình dược `quy-trinh.html` (23/11/2026)
- Thẻ quy trình (mã QT, nhóm GSP/NVD/DLS/Văn bản chung) + khung chi tiết 2 tab: **Video thuyết minh** (iframe Drive `/preview`) và **Văn bản quy trình** (PDF preview). Link `quy-trinh.html#qt=QT.01`, video lẻ `#v=<id>`. Đóng khung → xoá iframe (dừng video).
- Video: thư mục Drive "Bộ quy trình đang lưu hành tại khoa / **Videos**" `1dV8Fk444ooO3jw6xPU61bcg3CT2OQCcp` (khoaduochv, chia sẻ link). API nhóm `video-qt` (đã thêm vào `tools/api-tai-lieu.gs`, cache `tai-lieu-v3`) – ĐÃ triển khai **Phiên bản 5** (23/11/2026): đọc thêm thư mục Videos; đọc Drive bằng **dịch vụ nâng cao Drive API v3** (`docNhanh_`, ~9 giây cho ~320 file; lỗi thì về DriveApp `docCham_` ~80 giây); bộ nhớ đệm 25 phút chia phần 30.000 ký tự (`layCache_`/`luuCache_`, danh sách ~91KB); **hẹn giờ `lamMoiCache` mỗi 10 phút** (cài bằng `caiHenGio`, khoaduochv đã cấp quyền) → người dùng luôn lấy từ bộ nhớ đệm (~1,5–2,5 giây). Bản dự phòng `data/video-quy-trinh.json` chỉ dùng khi API lỗi.
- Gắn video → quy trình: tên video dạng "QT.xx - Tên.mp4" (khoa đã đổi tên 23/11/2026: 20 video, QT.01–QT.20; QT.19 = rà soát đơn ngoại trú chưa lấy – mã gán qua `DOC_TEN`). Không có mã thì khớp từ khoá `VIDEO_KHOP`; không khớp → mục "Video tổng quan & đào tạo". Tên hiển thị bỏ tiền tố mã; video có "(bản cũ)" xếp sau bản mới (QT.02, QT.08 có 2 video). Chỉ "Quyết định ban hành" chưa có video.
- `TAI_LIEU_API` và `DOC_TEN` chuyển sang `assets/site.js` (dùng chung index + quy-trinh). Menu trang con thêm "Quy trình"; trang chủ: thẻ công cụ "Quy trình dược" + banner trong thẻ Quy trình.

## Trang Lịch làm việc dược `lich-lam-viec.html` (25/11/2026)
- Nguồn: thư mục Drive **"LỊCH LÀM VIỆC"** của khoaduochv (ID chỉ ghi trong dự án Apps Script – KHÔNG đưa vào repo: thư mục đang chia sẻ "ai có link đều SỬA được" và Cloudflare Pages đăng công khai cả CLAUDE.md, tools/). Thư mục năm "2026"…; mỗi tháng 1 Google Sheet, tên có "Tháng N"/"THÁNG N" hoặc "LichTruc_KhoaDuoc_T12_2026". **Trang tính ĐẦU TIÊN** dạng lưới tuần: dòng ngày ("30/11" hoặc "01") + các dòng vai trò (cột A: TRỰC CẤP PHÁT, TRỰC KHO, KÈM BUỔI TRƯA, NHÀ THUỐC (CA 1/2), … (LÀM), … (NGHỈ)).
- API (Phiên bản 7, `lichLamViec_` trong `tools/api-tai-lieu.gs`, dùng **SpreadsheetApp** – quyền xem bảng tính đã cấp): lịch tháng trước/này/sau (file mới sửa nhất mỗi tháng) → trường `lich` = {capNhat, thang:[{nam,thang,ten,sua}], vaiTro, ngay:{"YYYY-MM-DD":{nhãn: giá trị}}}. Ghi chú nghỉ lọt vào dòng làm việc bị lọc; lịch nghỉ trả riêng ở `lich.nghi` (xem dưới). **Không trả id/link file.**
- **Mẫu lịch mới (từ T12/2026, 25/11/2026)**: file tháng có thêm sheet **"Nhân viên khoa"** (tên + vị trí: Ngoại trú/Kho vật tư/Kho thuốc/Nhà thuốc/Hành chính/Khác + trực chính), **"Đăng ký nghỉ"** (Từ ngày–Đến ngày chọn lịch, Nhân viên chọn danh sách, Vị trí tự động, Kiểu nghỉ: Nghỉ sáng/chiều/trực cả ngày/trực sáng/phép năm/phép ốm/Đi học/Công tác), **"Tổng hợp nghỉ"** (công thức LET/MAP: đăng ký + **tự động "Nghỉ trực cả ngày" cho người trực cấp phát/trực kho hôm trước** – đăng ký kiểu khác cho người đó ngày đó thì đăng ký thắng). Lưới: ô LÀM/nhà thuốc/trực **chỉ chọn tên** (data validation ONE_OF_RANGE 'Nhân viên khoa'!A2:A100, strict); dòng NGHỈ = công thức TEXTJOIN từ "Tổng hợp nghỉ" (cột F hiển thị, G nhóm dòng, H ngày dd/mm khớp ô ngày của lưới), khoá cảnh báo. Tháng sau: nhân bản file này rồi đổi lưới/“Bảng trực”.
- API phiên bản 8 trả thêm `lich.nghi` = {"YYYY-MM-DD": [{ten, viTri, kieu}]}: mẫu mới đọc "Tổng hợp nghỉ"; mẫu cũ đọc chữ dòng NGHỈ ((f)/(p)/(pn)→phép, (s)→sáng, (c)→chiều, còn lại "Nghỉ"). **"Nghỉ phép ốm" công khai thành "Nghỉ phép".** Web: khối "Nghỉ" trong thẻ ngày, dòng "Nghỉ" trong bảng tuần, ngày nghỉ trong "Lịch của …".
- **Tự đăng ký nghỉ · đổi trực (26/11/2026, API phiên bản 10)** – quy trình: lãnh đạo phân lịch trực trong lưới; nhân viên tự đăng ký nghỉ, đổi trực trên web.
  - Đăng nhập: tên + **mã cá nhân**, ban đầu = mã nhân viên (lưu dạng chữ, giữ số 0 đầu); mỗi người tự **đổi mã** trên web (nút "Đổi mã", 4–20 chữ số/chữ cái; hd `doiMa`). Quyền lãnh đạo: Trưởng khoa và Phó trưởng khoa (không dùng tài khoản chung). Bảng mã = Google Sheet riêng của khoaduochv "Mã cá nhân – Lịch làm việc Khoa Dược (KHÔNG CHIA SẺ)" (ID ở Thuộc tính tập lệnh `MA_SHEET`, KHÔNG ghi vào repo); cột Quyền "Lãnh đạo" = được duyệt. Người mới: thêm vào "Nhân viên khoa" rồi ghi mã nhân viên vào bảng mã (hoặc chạy `taoMaCaNhan` để tạo mã ngẫu nhiên). Sai mã 5 lần → khoá 15 phút.
  - Sheet thêm trong file tháng: **Định mức** (bộ phận · buổi · tối thiểu · không tính), **Làm thay** (người chuyển sang vị trí khác theo buổi), **Đổi trực**, **Nhật ký** (web ghi tự động); "Đăng ký nghỉ" thêm cột G–K (Trạng thái, Người làm thay, Gửi lúc, Mã đơn, Ghi chú duyệt). "Tổng hợp nghỉ" chỉ lấy đơn Trạng thái trống/"Đã duyệt". "Bảng trực" C–E = công thức MAP lấy từ lưới (lưới là nơi sửa duy nhất; Q = dòng tuần, R = cột ngày).
  - Định mức (lãnh đạo chốt 26/11/2026): ngoại trú sáng ≥3, chiều ≥2; kho thuốc ≥3 (không tính Dũng); kho vật tư ≥1; áp dụng mọi ngày kể cả T7/CN/lễ. Đếm theo **vị trí cố định** ("Nhân viên khoa"), người đang trực VẪN tính, trừ người nghỉ theo buổi (sáng/chiều/cả ngày) và người làm thay chỗ khác.
  - Giao diện "Lịch nghỉ của tôi" (API phiên bản 15): lịch tháng tô màu theo loại (phép tháng xanh dương, phép năm xanh lá, ốm/con ốm cam, đi học/công tác/khác tím, nghỉ trực xám; nửa trên = sáng, dưới = chiều; nét đứt = chờ duyệt/đang lưu), chấm • = số người cùng vị trí nghỉ (đỏ khi nhóm vừa đủ định mức), góc đỏ = có lịch trực. Bấm 1 ngày → khung chi tiết: trạng thái, nhóm, nút "Nghỉ cả ngày/sáng/chiều" (loại chọn sẵn, mặc định phép tháng) và "Huỷ nghỉ" – **tự lưu**, hiện ngay; hàng đợi gửi lần lượt, gộp lệnh cùng loại liền nhau (`xep`/`chayHang`). Huỷ đơn của mình chưa bắt đầu không cần duyệt; hd `huy` nhận `mas` (nhiều mã).
  - Tốc độ (API phiên bản 14): dữ liệu file tháng đệm ở CacheService "T2-<id>" (25 phút; file không phải mẫu mới đệm "null" 6 giờ); đọc (dangNhap, cuaToi, thongKe) lấy từ đệm (~0,3 giây); ghi đọc thẳng file (`FRESH_`) rồi cập nhật đệm + `capNhatLich_` chỉ sửa phần lịch của file vừa ghi (~5–7 giây). Hẹn giờ 10 phút / `?fresh=1` gọi `xoaDemLich_` rồi đọc lại toàn bộ → sửa tay trong Sheet lên web sau tối đa ~10 phút. Thống kê tách riêng (hd `thongKe`), chỉ từ T10/2026. Web: hiện đơn ngay khi gửi (trả lại nếu lỗi), "Ghi nhớ" lưu cả dữ liệu lần trước (localStorage `hv-lich-dn`) để mở lại hiện ngay rồi cập nhật ngầm.
  - Loại nghỉ (API phiên bản 13): Phép tháng (mặc định, cả ngày) · Phép năm · Phép ốm · Phép con ốm · Đi học · Công tác · Nghỉ trực · Phép khác (bắt buộc ghi loại, lưu ở cột Ghi chú); mỗi loại chọn buổi cả ngày/sáng/chiều → kiểu "Phép tháng (sáng)". Cùng ngày được 2 đơn nửa ngày khác buổi (`vangCua_` gộp buổi; "Tổng hợp nghỉ" nối bằng " + "). Thống kê: phép tháng theo tháng (½ cho buổi; lịch mẫu cũ T10–T11 quy hết về phép tháng, bỏ ngày sau trực – `nghiCu_`), phép năm / phép ốm / phép con ốm tính riêng theo năm. Công khai: ốm → "Nghỉ phép".
  - Nghỉ (API phiên bản 12): **chỉ đăng ký cho bản thân**, chọn từng ngày trên lịch (nhiều ngày 1 lần, `ngays`), mỗi ngày 1 đơn riêng (`nghiMotNgay_`). Khung thống kê: ngày nghỉ trong tháng (sáng/chiều = ½; không tính nghỉ trực, đi học, công tác) và phép năm trong năm (`cuaToi.nghiNam` – chỉ trả cho chính người đó, đọc mọi file tháng mẫu mới của năm). Đổi trực: đổi lấy ca ở tháng khác được (`xemDoi_` gộp 2 file). Mỗi ngày:
    đủ định mức → "Đã duyệt" ngay; thiếu → "Chờ duyệt" (lãnh đạo duyệt trên web); có người làm thay → "Chờ người làm thay", người đó đồng ý → tính lại. Chỉ báo thiếu MỚI do đơn gây ra (so với trước khi nghỉ).
  - Đổi trực: A đề nghị → B đồng ý → kiểm tra (B không trùng vai/nghỉ, không trực 2 ngày liền, trực chính phải có "Trực chính = Có") → đủ định mức thì **tự ghi vào lưới**, thiếu thì chờ lãnh đạo. "Đổi lại" = A nhận 1 ca của B.
  - API: `doPost` (text/plain JSON `{hd, ten, ma, …}`; hd: dangNhap, cuaToi, guiNghi, huy, guiDoiTruc, traLoi, duyet), LockService; sau khi ghi làm mới bộ nhớ đệm `lich`. `lich` công khai thêm: dangKy, nhanVien, dinhMuc, nhanSu {ngày: [[bộ phận, S/C, có, tối thiểu]]}, lamThay. Lưới = sheet tên "Lịch T12" (file cũ: trang đầu). Đã chạy thử đủ luồng trên file thật 25/11/2026 rồi xoá dữ liệu thử.
- Trang: "Hôm nay & ngày mai"; chọn tên ("Xem lịch của", nhớ localStorage `hv-lich-toi`) → "Lịch của …" + tô sáng tên + xuất `.ics`; lịch tuần (bảng vị trí × 7 ngày; điện thoại → thẻ theo ngày), In. Thứ tự/tên dòng: `VAI_UU_TIEN`; dòng trùng tên hiển thị được gộp.
- Trang chủ: dải "Hôm nay trực" dưới hero (`veHomNayTruc`, lấy `lich` khi tải API tài liệu); menu thêm "Lịch làm việc" (trang chủ + mọi trang con).
- (Nên làm) Cloudflare Pages đang phục vụ cả file nội bộ (CLAUDE.md, README.md, tools/) – cân nhắc chuyển web vào thư mục con và đặt "Build output directory".

## Trang chủ: 02 · Tài liệu dược / 03 · Tài liệu y khoa (tách 23/11/2026)
- **02 · Tài liệu dược** (`#tai-lieu`, thẻ): "Quy trình dược" (banner → quy-trinh.html, nhóm GSP/NVD/DLS thu gọn mặc định) + các thẻ từ thư mục "Thông tin Dược" (API nhóm `ban-tin`). Thẻ cố định `DUOC_MUC` (Bản tin thông tin thuốc · Danh mục LASA & cảnh báo · Báo cáo đề kháng kháng sinh – hiện cả khi trống, "Đang cập nhật"); **thư mục con cấp 1 trong "Thông tin Dược" = 1 thẻ** (tên thư mục khớp từ khoá `tu` thì gộp vào thẻ cố định, không khớp thì thành thẻ mới cùng tên); file ở gốc xếp theo từ khoá tên, không khớp → "Tài liệu dược khác". Hàm `mucDuoc`, `duocTabs`, `renderDuoc`.
- **03 · Tài liệu y khoa** (`#y-khoa`): guideline (API nhóm `guideline`), lọc nguồn, nhóm chuyên khoa thu gọn 2 cột – `renderYK`. Ô tìm riêng mỗi mục (`doc-q`, `yk-q`); ô tìm ở hero lọc cả hai. CSS danh sách dùng class `.doc-list`.
- Menu đầu trang: Tra cứu · Tài liệu dược · Tài liệu y khoa · Hướng dẫn · Liên hệ; nhãn mục 01–05.

## Tài liệu chuyên môn (mục 02 trang chủ, 21/11/2026)
- 3 thẻ con: **Quy trình dược** · **Guideline điều trị** · **Bản tin thông tin thuốc** (thư mục Drive "Thông tin Dược" `1Fb6xNTXmUHgCfI6PXK6dWdBboqF_zxwf`: bản tin, Danh mục LASA 2026, mẫu thông tin thuốc; tự chia nhóm theo tên file: "bản tin" / "danh mục|LASA" / khác; bản tin số lớn nhất lên đầu + nhãn "Mới nhất"). Mảng `DOCS` giờ để trống (chỉ dùng cho link ngoài Drive). API script đã thêm thư mục này (phiên bản 2, 21/11/2026). Cấu hình `DOC_TABS`, `DOC_TEN`, `TAI_LIEU_API` trong `index.html`.
- Quy trình: thư mục Drive "Bộ quy trình đang lưu hành tại khoa" → CHỈ đọc thư mục con **"Bản ký đóng dấu"** `1lyaR7N9-3VpkLRP2gkvrUCQnNJrwKnS0` (19 PDF). KHÔNG đưa "Bản word + excel" lên web. Nhóm theo đuôi mã: GSP / NVD / DLS / Văn bản chung.
- Guideline: thư mục "Tài liệu y khoa" `1zrxNfSoJDxo_HCVU3XYnAjUGEQ9cicet`, đọc cả thư mục con ("Hướng dẫn của BYT", "Hiệp hội chuyên khoa") → nhóm theo tên thư mục con ("Hướng dẫn của BYT / Tim mạch" hiển thị "Bộ Y tế · Tim mạch").
  - 21/11/2026: "Hướng dẫn của BYT" (`1q7dNZy_YjNNKBIW9diP6trx6WrpyqyDh`) chia theo chuyên khoa, tên file `NNN - <số hiệu> - <tên>.pdf|.docx` (NNN = STT trong danh mục Medinet 132 hướng dẫn) → web tách mã "2187/QĐ-BYT", bỏ "Về/tài liệu chuyên môn" đầu tên. Cùng tên có PDF + Word → 1 dòng (mở PDF, nút "Word"). Chỉ hiện PDF/Word/Google Docs (CSV, Excel bị ẩn).
  - 21/11/2026 (2): "Tài liệu y khoa" có 3 nguồn: "Hướng dẫn của BYT" (theo chuyên khoa), "Hướng dẫn bộ y tế" (phẳng, tên `YYYYMMDD <số> HDCDDT <tên>`), "Hiệp hội chuyên khoa" (phẳng, năm trong tên "(2022)"). Web GỘP: văn bản BYT khớp danh mục 132 (theo ngày+số; sai số nhưng đúng ngày vẫn nhận) → 1 dòng, chọn PDF nhẹ nhất + nút Word. Nhóm = chuyên khoa (Medinet; tài liệu ngoài danh mục/hiệp hội đoán bằng từ khoá `CK_DOAN`), BYT và hiệp hội chung nhóm, nhãn nguồn ở dòng phụ. Viết tắt tên file mở rộng bằng `TU_TAT`; tìm kiếm hiểu viết tắt `DONG_NGHIA` (THA, ĐTĐ, COPD…). Thẻ Guideline: lọc nguồn (Tất cả/Bộ Y tế/Hiệp hội), nhóm thu gọn (2 cột trên máy tính) khi không tìm kiếm, nhãn "Mới" (ban hành <12 tháng), cảnh báo file >20MB; không có kết quả → gợi ý thẻ khác.
  - Ngày ban hành: `data/huong-dan-byt.json` ({STT: [số hiệu, dd/mm/yyyy, chuyên khoa]}, tạo từ CSV danh sách 132) → hiện "ban hành dd/mm/yyyy" thay "cập nhật", và trong mỗi nhóm xếp văn bản mới nhất lên đầu. Chỉ gắn ngày khi số hiệu trong tên file khớp STT. Thêm hướng dẫn mới ngoài danh sách → thêm dòng vào file JSON này (STT mới ≥133).
  - Bản gốc tải về + `danh-sach-132-huong-dan-BYT.csv` (tình trạng từng văn bản) ở `dự án web/huong-dan-BYT`. Đã có 64/132 (kcb.vn + thuvienphapluat); thuvienphapluat chặn chống robot sau ~10–50 lượt/ngày, còn STT 62–132 chưa tải.
- Nguồn danh sách (ĐÃ TRIỂN KHAI 21/11/2026): Apps Script **"API tai lieu HV-Pharmacy"** (dự án `1QHJZno139aRZQdlnStB5hx0OLbIW5riy_QC7LQuEHIlmVLKbYGyNTqSo` của khoaduochv, Web app: chạy bằng khoaduochv, truy cập Anyone; /exec `AKfycbyiRh9dVk1i3QqookVn3azZu3AzQQqnv0cbdW17FOyVFGhzw_8L4lopzEsI79r5A00uug`; ~1,3s/lần, cache 10 phút, `?fresh=1` để đọc lại ngay). Trước đây là (`tools/api-tai-lieu.gs`, chỉ đọc, cache 10 phút) → điền link /exec vào `TAI_LIEU_API`. Chưa triển khai thì dùng bản tạm `data/tai-lieu.json` (chụp 21/11/2026).
- Tên file lộn xộn/không dấu → sửa bằng `DOC_TEN` (id → [tên, mã]); tốt nhất khoa đổi tên file trên Drive theo mẫu "QT.01.DUOC.GSP Quy trình kiểm nhập.pdf".

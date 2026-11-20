# HV-Pharmacy

Website tra cứu thông tin thuốc của Khoa Dược – Bệnh viện Đa khoa Hùng Vương.
Địa chỉ: https://hv-pharmacy.pages.dev

## Cập nhật dữ liệu (dành cho Khoa Dược – không cần sửa code)

Phần lớn dữ liệu nằm trong **Google Sheets của tài khoản khoaduochv@gmail.com**. Sửa bảng xong là website tự cập nhật
(người dùng thấy bản mới khi mở lại trang, tối đa vài giây sau).

| Muốn bổ sung | Mở bảng | Làm gì | Hiện ở |
|---|---|---|---|
| **Thuốc mới** – thông tin chung | **"Thông tin thuốc"** → trang tính **Sheet1** | Thêm 1 dòng, điền cột A–O (hoạt chất, biệt dược, bảo quản, chỉ định, liều, chống chỉ định, cảnh báo, PNCT/CCB, ADR, tương tác, quá liều, dược lực, dược động, ATC, link tờ HDSD) | Danh mục thuốc |
| **Thuốc mới** – suy gan, suy thận, có thai | Cùng file → trang tính **Sheet2** | Thêm 1 dòng, cột A–S; chú ý cột F (liều suy gan), G (liều suy thận), I (CCĐ suy gan), J (CCĐ suy thận), L (PNCT & CCB) | Người bệnh đặc biệt |
| **Thuốc tiêm truyền** | **"Pha truyền"** | Thêm dòng **bên dưới đúng nhóm** ("Thuốc kháng sinh" / "Thuốc tiêm truyền khác"), cột A–N | Tiêm truyền |
| **Cặp tương tác** | **"Copy of DANH MỤC TƯƠNG TÁC THUỐC"** → trang tính **DANH MỤC** | Thêm 1 dòng: B/D tên Việt · C hoạt chất 1 · E hoạt chất 2 · F điều kiện tuổi · G mã bệnh · H eGFR · I khoảng cách dùng · J mức độ cảnh báo · K cơ chế · L hậu quả · M xử trí. Cột C/E (tên chuẩn) phải viết giống nhau cho cùng 1 hoạt chất. Cột J ghi đúng "Chống chỉ định tuyệt đối" hoặc "Chống chỉ định tương đối". Mã bệnh cột G cách nhau dấu phẩy, eGFR/tuổi ghi dạng "<30 ml/phút/1,73m2", "<28 ngày tuổi" | Trang Tương tác thuốc (và công cụ Apps Script cũ) |
| **Góp ý đã nhận** | **"Góp ý HV-Pharmacy (câu trả lời)"** | Chỉ đọc / xử lý | – |

### Quy tắc khi sửa bảng (để website không lỗi)
1. **Không** đổi thứ tự cột, **không** xoá/đổi tên dòng tiêu đề, **không** đổi tên trang tính (Sheet1, Sheet2, DANH MỤC…).
2. Mỗi ý trong một ô ngăn bằng ` | ` (dấu cách – gạch đứng – dấu cách) → website hiện thành gạch đầu dòng.
3. Tên biệt dược (cột B) **không trùng** với thuốc khác – website dùng tên này làm link chia sẻ.
4. Ô không có thông tin: để trống hoặc ghi `-`. Website ghi "Tờ HDSD không ghi khuyến cáo riêng" – **không** ghi "an toàn".
5. Link tờ HDSD: file PDF trên Drive, chia sẻ **"Bất kỳ ai có đường liên kết – Người xem"**.
6. Giữ chia sẻ của các bảng ở **"Bất kỳ ai có đường liên kết – Người xem"** (website đọc theo cách này).
7. **Không** đưa lên các bảng này: giá, nhà thầu, tồn kho, thông tin người bệnh.
8. Thuốc mới vào danh mục: thêm ở **cả Sheet1 và Sheet2** (hai trang tính đang tách riêng).

### Dữ liệu cần nhờ người phụ trách kỹ thuật (Claude Code / CNTT)
- **Mã ICD-10**: khi Bộ Y tế ban hành danh mục mới → tải file Excel → `python tools/build-icd.py "<file>.xlsx"` → commit.
- **Tài liệu PDF, video, công cụ trên trang chủ**: sửa mảng `DOCS`, `VIDEOS`, `TOOLS` trong khối `CẤU HÌNH` cuối `index.html` → commit.
- Mỗi lần commit lên nhánh `main` (GitHub `poseidonwww/hv-pharmacy`), Cloudflare Pages tự đưa lên mạng sau ~1 phút.

## Làm việc với Claude Code
Mở Terminal tại thư mục `hv-pharmacy`, chạy `claude`, ví dụ:
- `Đọc CLAUDE.md rồi cho tôi biết việc tiếp theo`
- `Thêm video hướng dẫn bút tiêm mới: <link>`

## Xem thử trên máy
`python -m http.server 5173` trong thư mục `hv-pharmacy`, rồi mở http://localhost:5173
(mở thẳng file `index.html` sẽ không tải được dữ liệu và ảnh).

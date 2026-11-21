/**
 * API danh sách tài liệu cho website HV-Pharmacy (CHỈ ĐỌC – không sửa/xoá file nào).
 * Dự án Apps Script "API tai lieu HV-Pharmacy" của khoaduochv@gmail.com,
 * triển khai Web app: Thực thi với tư cách "Tôi", Người có quyền truy cập "Bất kỳ ai".
 * Website gọi: <link /exec>  → JSON { t, nhom: { "quy-trinh": [...], "guideline": [...] } }
 *
 * Muốn thêm/bớt tài liệu: chỉ cần thả/xoá file trong thư mục Drive tương ứng (tối đa ~10 phút sau website cập nhật).
 * Muốn thêm một nhóm tài liệu mới: thêm 1 dòng vào THU_MUC rồi Triển khai → Quản lý → Sửa → Phiên bản mới.
 */
const THU_MUC = {
  'quy-trinh': '1lyaR7N9-3VpkLRP2gkvrUCQnNJrwKnS0', // Bộ quy trình đang lưu hành tại khoa / Bản ký đóng dấu (KHÔNG dùng "Bản word + excel")
  'guideline': '1zrxNfSoJDxo_HCVU3XYnAjUGEQ9cicet', // Tài liệu y khoa (đọc cả thư mục con: Hướng dẫn của BYT, Hiệp hội chuyên khoa…)
  'ban-tin': '1Fb6xNTXmUHgCfI6PXK6dWdBboqF_zxwf'    // Thông tin Dược: bản tin thông tin thuốc, danh mục LASA…

};
const CACHE_GIAY = 600; // lưu tạm 10 phút cho nhanh

function doGet(e) {
  const cache = CacheService.getScriptCache();
  const fresh = e && e.parameter && e.parameter.fresh === '1';
  let out = fresh ? null : cache.get('tai-lieu-v2');
  if (!out) {
    const nhom = {};
    for (const [k, id] of Object.entries(THU_MUC)) nhom[k] = docThuMuc_(DriveApp.getFolderById(id), '');
    out = JSON.stringify({ t: new Date().toISOString(), nhom });
    if (out.length < 90000) cache.put('tai-lieu-v2', out, CACHE_GIAY);
  }
  return ContentService.createTextOutput(out).setMimeType(ContentService.MimeType.JSON);
}

function docThuMuc_(folder, duongDan) {
  const res = [];
  const files = folder.getFiles();
  while (files.hasNext()) {
    const f = files.next();
    if (f.isTrashed()) continue;
    let congKhai = true;
    try { congKhai = [DriveApp.Access.ANYONE, DriveApp.Access.ANYONE_WITH_LINK].includes(f.getSharingAccess()); } catch (err) {}
    res.push({
      id: f.getId(),
      ten: f.getName(),
      loai: f.getMimeType(),
      kb: Math.round(f.getSize() / 1024),
      capNhat: f.getLastUpdated().toISOString(),
      nhomCon: duongDan,
      congKhai: congKhai
    });
  }
  const subs = folder.getFolders();
  while (subs.hasNext()) {
    const s = subs.next();
    if (s.isTrashed()) continue;
    res.push(...docThuMuc_(s, duongDan ? duongDan + ' / ' + s.getName() : s.getName()));
  }
  return res;
}

/* Chạy thử trong trình soạn thảo để cấp quyền và xem kết quả */
function thu() { Logger.log(doGet({ parameter: { fresh: '1' } }).getContent().slice(0, 500)); }

/**
 * API danh sách tài liệu cho website HV-Pharmacy (CHỈ ĐỌC – không sửa/xoá file nào).
 * Dự án Apps Script "API tai lieu HV-Pharmacy" của khoaduochv@gmail.com,
 * triển khai Web app: Thực thi với tư cách "Tôi", Người có quyền truy cập "Bất kỳ ai".
 * Website gọi: <link /exec>  → JSON { t, nhom: { "quy-trinh": [...], "guideline": [...], "ban-tin": [...], "video-qt": [...] } }
 *
 * Muốn thêm/bớt tài liệu: chỉ cần thả/xoá file trong thư mục Drive tương ứng (tối đa ~10 phút sau website cập nhật).
 * Muốn thêm một nhóm tài liệu mới: thêm 1 dòng vào THU_MUC rồi Triển khai → Quản lý → Sửa → Phiên bản mới.
 */
const THU_MUC = {
  'quy-trinh': '1lyaR7N9-3VpkLRP2gkvrUCQnNJrwKnS0', // Bộ quy trình đang lưu hành tại khoa / Bản ký đóng dấu (KHÔNG dùng "Bản word + excel")
  'guideline': '1zrxNfSoJDxo_HCVU3XYnAjUGEQ9cicet', // Tài liệu y khoa (đọc cả thư mục con: Hướng dẫn của BYT, Hiệp hội chuyên khoa…)
  'ban-tin': '1Fb6xNTXmUHgCfI6PXK6dWdBboqF_zxwf',   // Thông tin Dược: bản tin thông tin thuốc, danh mục LASA…
  'video-qt': '1dV8Fk444ooO3jw6xPU61bcg3CT2OQCcp'   // Bộ quy trình đang lưu hành tại khoa / Videos – video thuyết minh (trang quy-trinh.html)

};
const CACHE_GIAY = 600; // lưu tạm 10 phút cho nhanh

function doGet(e) {
  const cache = CacheService.getScriptCache();
  const fresh = e && e.parameter && e.parameter.fresh === '1';
  let out = fresh ? null : layCache_(cache);
  if (!out) {
    const nhom = {};
    for (const [k, id] of Object.entries(THU_MUC)) nhom[k] = docThuMuc_(DriveApp.getFolderById(id), '');
    out = JSON.stringify({ t: new Date().toISOString(), nhom });
    luuCache_(cache, out);
  }
  return ContentService.createTextOutput(out).setMimeType(ContentService.MimeType.JSON);
}

/* Bộ nhớ đệm chia nhiều phần (mỗi phần ≤ 100KB) – danh sách đã > 90KB (23/11/2026) */
const KHOA_CACHE = 'tai-lieu-v3';
function layCache_(c) {
  const n = +c.get(KHOA_CACHE + '-n');
  if (!n) return null;
  const ks = Array.from({ length: n }, (_, i) => KHOA_CACHE + '-' + i);
  const m = c.getAll(ks);
  if (ks.some(k => m[k] == null)) return null;
  return ks.map(k => m[k]).join('');
}
function luuCache_(c, s) {
  const o = {}, N = 30000; let i = 0;
  for (let p = 0; p < s.length; p += N) o[KHOA_CACHE + '-' + (i++)] = s.slice(p, p + N);
  o[KHOA_CACHE + '-n'] = String(i);
  try { c.putAll(o, CACHE_GIAY); } catch (err) {}
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

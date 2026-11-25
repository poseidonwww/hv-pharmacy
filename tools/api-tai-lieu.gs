/**
 * API danh sách tài liệu cho website HV-Pharmacy (CHỈ ĐỌC – không sửa/xoá file nào).
 * Dự án Apps Script "API tai lieu HV-Pharmacy" của khoaduochv@gmail.com (bật dịch vụ nâng cao Drive API v3, mã nhận dạng "Drive"),
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
const CACHE_GIAY = 1500; // 25 phút – hẹn giờ lamMoiCache làm mới mỗi 10 phút nên người dùng luôn lấy từ bộ nhớ đệm

function doGet(e) {
  const cache = CacheService.getScriptCache();
  const fresh = e && e.parameter && e.parameter.fresh === '1';
  let out = fresh ? null : layCache_(cache);
  if (!out) {
    const nhom = {};
    for (const [k, id] of Object.entries(THU_MUC)) nhom[k] = docThuMuc_(id, '');
    let lich = null;
    try { lich = lichLamViec_(); } catch (err) { lich = { loi: String(err) }; }
    out = JSON.stringify({ t: new Date().toISOString(), nhom, lich });
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

/* Đọc thư mục: ưu tiên Drive API (dịch vụ nâng cao "Drive" v3, 1 lệnh/thư mục – ~9 giây cho ~320 file); lỗi thì dùng DriveApp (~80 giây) */
function docThuMuc_(id, duongDan) {
  try { return docNhanh_(id, duongDan); } catch (err) { return docCham_(DriveApp.getFolderById(id), duongDan); }
}
function docNhanh_(id, duongDan) {
  const res = [], subs = [];
  let token;
  do {
    const r = Drive.Files.list({ q: "'" + id + "' in parents and trashed = false", pageSize: 1000, pageToken: token,
      fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, permissionIds)' });
    for (const f of r.files || []) {
      if (f.mimeType === 'application/vnd.google-apps.folder') { subs.push(f); continue; }
      const p = f.permissionIds;
      res.push({ id: f.id, ten: f.name, loai: f.mimeType, kb: Math.round((+f.size || 0) / 1024), capNhat: f.modifiedTime,
        nhomCon: duongDan, congKhai: !p || p.includes('anyoneWithLink') || p.includes('anyone') });
    }
    token = r.nextPageToken;
  } while (token);
  for (const s of subs) res.push(...docNhanh_(s.id, duongDan ? duongDan + ' / ' + s.name : s.name));
  return res;
}

/* Hẹn giờ: tự làm mới danh sách mỗi 10 phút. Chạy caiHenGio() MỘT lần trong trình soạn thảo (cần cấp quyền). Đã cài 23/11/2026. */
function lamMoiCache() { doGet({ parameter: { fresh: '1' } }); }
function caiHenGio() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'lamMoiCache').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('lamMoiCache').timeBased().everyMinutes(10).create();
}

/* Cách cũ (dự phòng) */
function docCham_(folder, duongDan) {
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
    res.push(...docCham_(s, duongDan ? duongDan + ' / ' + s.getName() : s.getName()));
  }
  return res;
}

/* Chạy thử trong trình soạn thảo để cấp quyền và xem kết quả */
function thu() { Logger.log(doGet({ parameter: { fresh: '1' } }).getContent().slice(0, 500)); }

/* ===== Lịch làm việc dược (25/11/2026) =====
   Đọc thư mục "LỊCH LÀM VIỆC": mỗi tháng 1 Google Sheet (tên có "Tháng N" hoặc "_TN_YYYY", năm lấy từ tên hoặc thư mục "2026"),
   trang tính ĐẦU TIÊN dạng lưới theo tuần (dòng ngày + các dòng vai trò).
   Trả về lịch tháng trước / tháng này / tháng sau. BỎ mọi dòng có chữ "NGHỈ" (không công khai thông tin nghỉ của nhân viên).
   KHÔNG trả id/link file (thư mục đang chia sẻ quyền sửa). */
const THU_MUC_LICH = '<ID thư mục LỊCH LÀM VIỆC – chỉ ghi trong dự án Apps Script, KHÔNG đưa vào repo vì thư mục đang chia sẻ quyền sửa>';
const TZ_VN = 'Asia/Ho_Chi_Minh';
function boDau_(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase(); }
function dsSheetLich_(id, tenCha, out) {
  let token;
  do {
    const r = Drive.Files.list({ q: "'" + id + "' in parents and trashed = false", pageSize: 1000, pageToken: token,
      fields: 'nextPageToken, files(id, name, mimeType, modifiedTime)' });
    for (const f of r.files || []) {
      if (f.mimeType === 'application/vnd.google-apps.folder') dsSheetLich_(f.id, f.name, out);
      else if (f.mimeType === 'application/vnd.google-apps.spreadsheet') out.push({ id: f.id, ten: f.name, cha: tenCha, sua: f.modifiedTime });
    }
    token = r.nextPageToken;
  } while (token);
  return out;
}
function thangCuaFile_(f) {
  const t = boDau_(f.ten);
  const m = t.match(/thang\s*(\d{1,2})/) || t.match(/(?:^|[_\s-])t(\d{1,2})(?=[_\s-]|$)/);
  if (!m) return null;
  const thang = +m[1];
  if (thang < 1 || thang > 12) return null;
  const nam = +((t.match(/20\d\d/) || [])[0] || (String(f.cha).match(/^\s*(20\d\d)\s*$/) || [])[1] || 0);
  return nam ? { thang: thang, nam: nam } : null;
}
function lichLamViec_() {
  const hom = new Date(), y = +Utilities.formatDate(hom, TZ_VN, 'yyyy'), m = +Utilities.formatDate(hom, TZ_VN, 'M');
  const can = [-1, 0, 1].map(d => { const x = new Date(y, m - 1 + d, 1); return { nam: x.getFullYear(), thang: x.getMonth() + 1 }; });
  const files = dsSheetLich_(THU_MUC_LICH, '', []).map(f => ({ f: f, tm: thangCuaFile_(f) })).filter(o => o.tm);
  const chon = [];
  for (const c of can) {
    const ds = files.filter(o => o.tm.nam === c.nam && o.tm.thang === c.thang).sort((a, b) => String(b.f.sua).localeCompare(String(a.f.sua)));
    if (ds.length) chon.push({ nam: c.nam, thang: c.thang, f: ds[0].f });
  }
  const ngay = {}, chu = {}, vai = [];
  /* SpreadsheetApp (quyền xem bảng tính, đã cấp 25/11/2026): giá trị hiển thị ("30/11", "01"…) của trang tính đầu tiên */
  for (const c of chon) docLuoi_(SpreadsheetApp.openById(c.f.id).getSheets()[0].getDataRange().getDisplayValues(), c, ngay, chu, vai);
  return { capNhat: new Date().toISOString(), thang: chon.map(c => ({ nam: c.nam, thang: c.thang, ten: c.f.ten, sua: c.f.sua })), vaiTro: vai, ngay: ngay };
}
/* Lưới tuần: dòng có >= 3 ô dạng "dd" hoặc "dd/mm" = dòng ngày; các dòng sau = vai trò (cột A) × ngày (cùng cột) */
function docLuoi_(rows, c, ngay, chu, vai) {
  let cot = null, thangHT = c.thang, truoc = 0, dau = true;
  for (const r of rows) {
    const o = r.map(x => String(x).replace(/\s+/g, ' ').trim());
    const ds = [];
    o.forEach((x, i) => { const mm = x.match(/^(\d{1,2})(?:\/(\d{1,2}))?$/); if (i > 0 && mm && +mm[1] >= 1 && +mm[1] <= 31 && (!mm[2] || +mm[2] <= 12)) ds.push([i, +mm[1], mm[2] ? +mm[2] : 0]); });
    if (ds.length >= 3) {
      cot = ds.map(([i, d, mo]) => {
        let th, nm = c.nam;
        if (mo) { th = mo; if (th - c.thang > 6) nm--; else if (c.thang - th > 6) nm++; }
        else {
          if (dau && d > 20) thangHT = c.thang - 1; else if (!dau && d < truoc) thangHT++;
          truoc = d; dau = false; th = thangHT;
          if (th < 1) { th += 12; nm--; } else if (th > 12) { th -= 12; nm++; }
        }
        return [i, nm + '-' + String(th).padStart(2, '0') + '-' + String(d).padStart(2, '0'), th === c.thang && nm === c.nam];
      });
      continue;
    }
    if (!cot) continue;
    const nhan = o[0];
    if (!nhan || /nghi/.test(boDau_(nhan))) continue;
    if (vai.indexOf(nhan) < 0) vai.push(nhan);
    for (const [i, k, cuaThang] of cot) {
      /* bỏ phần ghi chú nghỉ lọt vào dòng làm việc: (f), (F), (pn), (p), "nghỉ" */
      const v = String(o[i] || '').split(/\s*,\s*/).filter(p => p && !/\((?:f|pn|p|om|ốm)\)|nghỉ|\bnghi\b/i.test(p)).join(', ');
      if (!v) continue;
      ngay[k] = ngay[k] || {}; chu[k] = chu[k] || {};
      if (cuaThang || !chu[k][nhan]) { ngay[k][nhan] = v; chu[k][nhan] = cuaThang; }
    }
  }
}
/* Chạy thử trong trình soạn thảo */
function thuLich() { const l = lichLamViec_(); Logger.log(JSON.stringify({ thang: l.thang, vaiTro: l.vaiTro, soNgay: Object.keys(l.ngay).length, mau: l.ngay[Object.keys(l.ngay).sort()[30]] })); }

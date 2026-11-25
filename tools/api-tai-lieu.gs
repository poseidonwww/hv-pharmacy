/**
 * API danh sách tài liệu cho website HV-Pharmacy. doGet CHỈ ĐỌC; doPost chỉ ghi vào file lịch làm việc (đăng ký nghỉ/đổi trực – xem cuối file).
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
   trang tính lưới (tên dạng "Lịch T12", không có thì trang đầu tiên) dạng lưới theo tuần (dòng ngày + các dòng vai trò).
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
  const ngay = {}, chu = {}, vai = [], nghi = {}, chuNghi = {}, nhanSu = {}, lamThay = {};
  let nhanVien = [], dinhMuc = [], dangKy = false;
  /* SpreadsheetApp (quyền xem bảng tính): giá trị hiển thị ("30/11", "01"…) của trang tính đầu tiên.
     Lịch nghỉ: file có sheet "Tổng hợp nghỉ" (mẫu mới, 25/11/2026) → đọc sheet đó; file cũ → đọc chữ trong các dòng NGHỈ của lưới. */
  for (const c of chon) {
    const ss = SpreadsheetApp.openById(c.f.id), th = ss.getSheetByName('Tổng hợp nghỉ');
    docLuoi_(luoi_(ss).getDataRange().getDisplayValues(), c, ngay, chu, vai, th ? null : { nghi: nghi, chuNghi: chuNghi });
    const T = taiThang_(c.f.id);
    if (th && !T) docNghiTongHop_(th.getDataRange().getDisplayValues(), c, nghi, chuNghi);
    /* Mẫu tự đăng ký (26/11/2026): nhân sự theo buổi so với định mức, làm thay đã duyệt */
    if (T) {
      nghiTuT_(T, c, nghi, chuNghi);   /* tính thẳng từ đơn (không chờ công thức "Tổng hợp nghỉ" tính lại) */
      dangKy = true; nhanVien = T.nv.map(x => ({ ten: x.ten, viTri: x.viTri, chinh: x.chinh })); dinhMuc = T.dm.map(d => ({ boPhan: d.boPhan, buoi: d.buoi, can: d.can, khong: d.khong }));
      const ns = nhanSuCongKhai_(T);
      for (const k of Object.keys(ns)) if (!nhanSu[k] || +k.slice(5, 7) === c.thang) nhanSu[k] = ns[k];
      for (const r of T.lt) if (dkHL_(r) && r.ngay && r.viTri) (lamThay[r.ngay] = lamThay[r.ngay] || []).push({ ten: r.ten, buoi: r.buoi, viTri: r.viTri });
    }
  }
  return { capNhat: new Date().toISOString(), thang: chon.map(c => ({ nam: c.nam, thang: c.thang, ten: c.f.ten, sua: c.f.sua })), vaiTro: vai, ngay: ngay, nghi: nghi,
    dangKy: dangKy, nhanVien: nhanVien, dinhMuc: dinhMuc, nhanSu: nhanSu, lamThay: lamThay };
}
/* Lưới tuần: dòng có >= 3 ô dạng "dd" hoặc "dd/mm" = dòng ngày; các dòng sau = vai trò (cột A) × ngày (cùng cột) */
function docLuoi_(rows, c, ngay, chu, vai, cu) {
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
    if (!nhan) continue;
    if (/nghi/.test(boDau_(nhan))) {   /* dòng NGHỈ: chỉ đọc ở file mẫu cũ (cu != null) */
      if (cu) for (const [i, k, cuaThang] of cot) {
        const v = o[i]; if (!v) continue;
        if (cu.chuNghi[k] && !cuaThang) continue;
        for (const p of v.split(/\s*,\s*/)) {
          const ten = p.replace(/\(.*?\)/g, '').trim();
          if (!ten || ten.split(/\s+/).length > 3 || /\d/.test(ten)) continue;
          (cu.nghi[k] = cu.nghi[k] || []).push({ ten: ten, viTri: viTriTuNhan_(nhan), kieu: kieuTuGhiChu_(p) });
          if (cuaThang) cu.chuNghi[k] = true;
        }
      }
      continue;
    }
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

/* ===== Lịch nghỉ (25/11/2026) ===== */
/* Công khai: "Nghỉ phép ốm" hiện là "Nghỉ phép" (không công khai lý do sức khoẻ) */
function kieuCongKhai_(k) {
  /* "Phép ốm", "Phép con ốm" công khai thành "Nghỉ phép" (giữ buổi); nhiều đơn cùng ngày nối bằng " + " */
  return String(k).split(' + ').map(x => /ốm|\bom\b/i.test(x) ? 'Nghỉ phép' + (/sáng/i.test(x) ? ' (sáng)' : /chiều/i.test(x) ? ' (chiều)' : '') : x.trim()).join(' + ');
}
function viTriTuNhan_(nhan) {
  const t = boDau_(nhan);
  return /ngoai tru/.test(t) ? 'Ngoại trú' : /kho vat tu/.test(t) ? 'Kho vật tư' : /kho thuoc/.test(t) ? 'Kho thuốc' : /hanh chinh/.test(t) ? 'Hành chính' : 'Khác';
}
/* Ghi chú tay ở mẫu cũ: (f)/(p)/(pn) phép · (s)/(sáng) sáng · (c)/(chiều) chiều */
function kieuTuGhiChu_(p) {
  const t = boDau_(p);
  if (/\((?:f|p|pn)\)/.test(t)) return 'Nghỉ phép';
  if (/\(\s*(?:s|sang)\s*\)|\bsang\b/.test(t)) return 'Nghỉ sáng';
  if (/\(\s*(?:c|chieu)\s*\)|\bchieu\b/.test(t)) return 'Nghỉ chiều';
  if (/\bom\b/.test(t)) return 'Nghỉ phép';
  return 'Nghỉ';
}
/* Mẫu mới: sheet "Tổng hợp nghỉ" – A Ngày (dd/mm/yyyy) · B Nhân viên · C Vị trí · D Kiểu nghỉ · E Nguồn */
function docNghiTongHop_(rows, c, nghi, chuNghi) {
  const moi = {};
  for (const r of rows.slice(1)) {
    const m = String(r[0]).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m || !r[1] || !r[3]) continue;
    const k = m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
    const cuaThang = +m[2] === c.thang && +m[3] === c.nam;
    if (chuNghi[k] && !cuaThang) continue;
    if (cuaThang && !moi[k]) { nghi[k] = []; moi[k] = true; }
    (nghi[k] = nghi[k] || []).push({ ten: String(r[1]).trim(), viTri: String(r[2]).trim(), kieu: kieuCongKhai_(r[3]) });
    if (cuaThang) chuNghi[k] = true;
  }
}

/* ===== Nhân viên tự đăng ký nghỉ · đổi trực · làm thay (26/11/2026) =====
   Web gửi POST (Content-Type text/plain, nội dung JSON) → doPost. Đăng nhập = tên + MÃ CÁ NHÂN (ban đầu = mã nhân viên, vd 00123; tự đổi được trên web).
   Bảng mã: Google Sheet riêng của khoaduochv, KHÔNG chia sẻ (tạo bằng taoMaCaNhan; ID lưu ở Thuộc tính tập lệnh "MA_SHEET").
   File tháng (mẫu mới) cần các sheet: Nhân viên khoa · Đăng ký nghỉ · Làm thay · Đổi trực · Định mức · Bảng trực · Nhật ký.
   - Nhân sự theo VỊ TRÍ CỐ ĐỊNH (Nhân viên khoa), người đang trực vẫn tính; "Làm thay" chuyển 1 người sang vị trí khác theo buổi.
   - Thiếu định mức → đơn "Chờ duyệt" (lãnh đạo duyệt trên web). Đổi trực: người nhận đồng ý → tự ghi vào lưới (nếu vẫn đủ định mức). */
/* Loại nghỉ (26/11/2026): mặc định "Phép tháng" cả ngày; mỗi loại chọn được buổi: cả ngày / (sáng) / (chiều).
   "Phép khác" phải ghi nội dung (cột Ghi chú). Các kiểu cũ (Nghỉ sáng/chiều/phép năm/phép ốm) vẫn đọc được. */
const LOAI_NGHI = ['Phép tháng', 'Phép năm', 'Phép ốm', 'Phép con ốm', 'Đi học', 'Công tác', 'Phép khác'];
const KIEU_NGHI = [].concat(...LOAI_NGHI.map(l => [l, l + ' (sáng)', l + ' (chiều)']), ['Nghỉ trực cả ngày', 'Nghỉ trực sáng', 'Nghỉ trực chiều']);
const KIEU_CU = ['Nghỉ sáng', 'Nghỉ chiều', 'Nghỉ phép năm', 'Nghỉ phép ốm'];
const VAI_TRUC = { cp: ['Trực cấp phát', 'truc cap phat'], kho: ['Trực kho', 'truc kho'], kem: ['Kèm buổi trưa', 'kem'] };
const LANH_DAO = 'Lãnh đạo';
const nn_ = s => boDau_(s).replace(/\s+/g, ' ').trim();
const dmy_ = k => k ? k.slice(8, 10) + '/' + k.slice(5, 7) + '/' + k.slice(0, 4) : '';
const homNay_ = () => Utilities.formatDate(new Date(), TZ_VN, 'yyyy-MM-dd');
function buoiCua_(k) { const t = boDau_(k); return /sang/.test(t) ? ['S'] : /chieu/.test(t) ? ['C'] : ['S', 'C']; }
function isoCua_(v, tz) {
  if (v instanceof Date) return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
  const m = String(v || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/) || String(v || '').match(/^(\d{4})-(\d\d)-(\d\d)$/);
  if (!m) return '';
  return m[1].length === 4 ? m[0] : m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
}
function ngayCua_(k) { const [y, m, d] = k.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d, 5)); } // 12:00 giờ VN
function congNgay_(k, n) { const [y, m, d] = k.split('-').map(Number); return Utilities.formatDate(new Date(Date.UTC(y, m - 1, d + n, 5)), TZ_VN, 'yyyy-MM-dd'); }
function dsNgay_(tu, den) { const o = []; for (let k = tu; k <= den && o.length < 62; k = congNgay_(k, 1)) o.push(k); return o; }
function maDon_(p) { return p + Utilities.formatDate(new Date(), TZ_VN, 'MMdd') + '-' + Utilities.getUuid().slice(0, 4).toUpperCase(); }
function maVai_(s) { const t = nn_(s); return Object.keys(VAI_TRUC).find(k => k === s || t.indexOf(VAI_TRUC[k][1]) === 0) || ''; }
function luoi_(ss) { return ss.getSheets().find(s => /^lich t\d{1,2}\b/.test(nn_(s.getName()))) || ss.getSheets()[0]; } // mẫu mới: "Lịch T12"; file cũ: trang đầu
const dkHL_ = r => r.tt === '' || r.tt === 'Đã duyệt';

/* ---- Đọc file tháng ---- */
function baThang_() {
  const hom = new Date(), y = +Utilities.formatDate(hom, TZ_VN, 'yyyy'), m = +Utilities.formatDate(hom, TZ_VN, 'M');
  return [-1, 0, 1].map(d => { const x = new Date(y, m - 1 + d, 1); return { nam: x.getFullYear(), thang: x.getMonth() + 1 }; });
}
function fileThang_(nam, thang) {
  const c = CacheService.getScriptCache(), k = 'file-lich-' + nam + '-' + thang;
  let id = c.get(k);
  if (id === null) {
    const ds = dsFileLich_().filter(f => { const t = thangCuaFile_(f); return t && t.nam === nam && t.thang === thang; })
      .sort((a, b) => String(b.sua).localeCompare(String(a.sua)));
    id = ds.length ? ds[0].id : '';
    c.put(k, id, 600);
  }
  return id || null;
}
const MEMO_ = {};
function taiThang_(id) {
  if (!id) return null;
  if (MEMO_[id] !== undefined) return MEMO_[id];
  const ss = SpreadsheetApp.openById(id), tz = ss.getSpreadsheetTimeZone(), sh = n => ss.getSheetByName(n);
  if (!sh('Đăng ký nghỉ') || !sh('Định mức') || !sh('Bảng trực') || !sh('Làm thay') || !sh('Đổi trực')) return (MEMO_[id] = null);
  const T = { id, ss, tz, nv: [], dm: [], truc: {}, oLuoi: {}, ngays: [], dk: [], lt: [], dt: [] };
  for (const r of sh('Nhân viên khoa').getDataRange().getValues().slice(1))
    if (String(r[0]).trim()) T.nv.push({ ten: String(r[0]).trim(), viTri: String(r[1]).trim() || 'Khác', chinh: nn_(r[2]) === 'co' });
  for (const r of sh('Định mức').getDataRange().getValues().slice(1))
    if (String(r[0]).trim() && String(r[1]).trim() && r[2] !== '')
      T.dm.push({ boPhan: String(r[0]).trim(), buoi: /chieu/.test(nn_(r[1])) ? 'C' : 'S', can: +r[2], khong: String(r[3] || '').split(',').map(nn_).filter(Boolean) });
  for (const r of sh('Bảng trực').getDataRange().getValues().slice(1)) {
    const k = isoCua_(r[0], tz); if (!k) continue;
    T.truc[k] = { cp: String(r[2]).trim(), kho: String(r[3]).trim(), kem: String(r[4]).trim() };
    if (r[16] !== '' && r[17] !== '') { T.oLuoi[k] = { hang: +r[16], cot: +r[17] }; T.ngays.push(k); }
  }
  sh('Đăng ký nghỉ').getRange(4, 1, 200, 11).getValues().forEach((r, i) => {
    if (!r[0] && !String(r[2]).trim()) return;
    const tu = isoCua_(r[0], tz);
    T.dk.push({ hang: i + 4, tu: tu, den: isoCua_(r[1], tz) || tu, ten: String(r[2]).trim(), kieu: String(r[4]).trim(), ghiChu: String(r[5]),
      tt: String(r[6]).trim(), thay: String(r[7]).trim(), ma: String(r[9]).trim(), note: String(r[10]) });
  });
  sh('Làm thay').getRange(2, 1, 299, 9).getValues().forEach((r, i) => {
    if (!r[0] || !String(r[2]).trim()) return;
    T.lt.push({ hang: i + 2, ngay: isoCua_(r[0], tz), buoi: String(r[1]).trim() || 'Cả ngày', ten: String(r[2]).trim(), viTri: String(r[4]).trim(),
      ghiChu: String(r[5]), tt: String(r[6]).trim(), ma: String(r[7]).trim() });
  });
  sh('Đổi trực').getRange(2, 1, 299, 10).getValues().forEach((r, i) => {
    if (!String(r[0]).trim()) return;
    T.dt.push({ hang: i + 2, ma: String(r[0]).trim(), ngay: isoCua_(r[2], tz), vai: maVai_(r[3]), nguoi: String(r[4]).trim(), nhan: String(r[5]).trim(),
      ngayDoi: isoCua_(r[6], tz), tt: String(r[7]).trim(), note: String(r[8]) });
  });
  return (MEMO_[id] = T);
}
/* File tháng chứa ngày k (thử tháng của ngày, tháng sau, tháng trước – lưới tháng sau có thể chứa vài ngày cuối tháng trước) */
function thangCuaNgay_(k) {
  const y = +k.slice(0, 4), m = +k.slice(5, 7);
  for (const d of [0, 1, -1]) {
    const x = new Date(y, m - 1 + d, 1), T = taiThang_(fileThang_(x.getFullYear(), x.getMonth() + 1));
    if (T && T.ngays.indexOf(k) >= 0) return T;
  }
  throw new Error('Ngày ' + dmy_(k) + ' chưa có lịch theo mẫu mới – báo lãnh đạo khoa');
}
function cacThang_() { const o = []; for (const c of baThang_()) { const T = taiThang_(fileThang_(c.nam, c.thang)); if (T) o.push(T); } return o; }

/* ---- Tính nhân sự ---- g = giả định: { dk:[đơn thêm], bo:{mã đơn nghỉ bỏ qua}, lt:[làm thay thêm], boLt:{mã}, truc:{ngày:{cp,kho,kem}} } */
function trucNgay_(T, k, g) { return (g && g.truc && g.truc[k]) || T.truc[k] || {}; }
function kieuNghi_(T, ten, k, g) {
  const n = nn_(ten);
  for (const r of T.dk.concat(g && g.dk || []))
    if (dkHL_(r) && !(g && g.bo && g.bo[r.ma]) && nn_(r.ten) === n && r.kieu && r.tu <= k && k <= r.den) return r.kieu;
  const t = trucNgay_(T, congNgay_(k, -1), g);
  return (nn_(t.cp) === n || nn_(t.kho) === n) ? 'Nghỉ trực cả ngày' : '';
}
function viTriLam_(T, ten, k, b, g) {
  const n = nn_(ten);
  for (const r of T.lt.concat(g && g.lt || []))
    if (dkHL_(r) && !(g && g.boLt && g.boLt[r.ma]) && nn_(r.ten) === n && r.ngay === k && buoiCua_(r.buoi).indexOf(b) >= 0 && r.viTri) return r.viTri;
  return null;
}
/* Các buổi vắng của 1 người trong ngày: gộp mọi đơn đã duyệt (vd sáng phép tháng + chiều phép ốm); không có đơn thì nghỉ trực tự động */
function vangCua_(T, ten, k, g) {
  const n = nn_(ten), v = {};
  for (const r of T.dk.concat(g && g.dk || []))
    if (dkHL_(r) && !(g && g.bo && g.bo[r.ma]) && nn_(r.ten) === n && r.kieu && r.tu <= k && k <= r.den) buoiCua_(r.kieu).forEach(b => { v[b] = 1; });
  if (!Object.keys(v).length) { const kn = kieuNghi_(T, ten, k, g); if (kn) buoiCua_(kn).forEach(b => { v[b] = 1; }); }
  return Object.keys(v);
}
function demNguoi_(T, k, g) {
  const co = {};
  for (const x of T.nv) {
    const vang = vangCua_(T, x.ten, k, g);
    for (const b of ['S', 'C']) {
      if (vang.indexOf(b) >= 0) continue;
      const p = viTriLam_(T, x.ten, k, b, g) || x.viTri;
      if (T.dm.some(d => d.boPhan === p && d.buoi === b && d.khong.indexOf(nn_(x.ten)) >= 0)) continue;
      co[p + '|' + b] = (co[p + '|' + b] || 0) + 1;
    }
  }
  return co;
}
/* Chỗ thiếu định mức MỚI do thay đổi g gây ra (so với g0) */
function thieuMoi_(T, ks, g, g0) {
  const out = [];
  for (const k of ks.filter((x, i) => ks.indexOf(x) === i && T.ngays.indexOf(x) >= 0)) {
    const sau = demNguoi_(T, k, g), truoc = demNguoi_(T, k, g0 || null);
    for (const d of T.dm) {
      const key = d.boPhan + '|' + d.buoi, c = sau[key] || 0;
      if (c < d.can && c < (truoc[key] || 0)) out.push({ ngay: k, boPhan: d.boPhan, buoi: d.buoi, co: c, can: d.can });
    }
  }
  return out;
}
const moTaThieu_ = ds => ds.map(x => x.boPhan + ' ' + (x.buoi === 'S' ? 'sáng' : 'chiều') + ' ' + dmy_(x.ngay).slice(0, 5) + ' còn ' + x.co + '/' + x.can).join('; ');
function nhanSuCongKhai_(T) {
  const o = {};
  for (const k of T.ngays) { const co = demNguoi_(T, k, null); o[k] = T.dm.map(d => [d.boPhan, d.buoi, co[d.boPhan + '|' + d.buoi] || 0, d.can]); }
  return o;
}

/* Lịch nghỉ công khai của file mẫu mới: đơn đã duyệt (nhiều đơn/ngày nối " + "), không có đơn thì nghỉ trực tự động */
function nghiTuT_(T, c, nghi, chuNghi) {
  for (const k of T.ngays) {
    const cuaThang = +k.slice(5, 7) === c.thang && +k.slice(0, 4) === c.nam;
    if (chuNghi[k] && !cuaThang) continue;
    const ds = [];
    for (const x of T.nv) {
      const n = nn_(x.ten), dk = T.dk.filter(r => dkHL_(r) && nn_(r.ten) === n && r.kieu && r.tu <= k && k <= r.den).map(r => r.kieu);
      const kieu = dk.length ? dk.join(' + ') : kieuNghi_(T, x.ten, k, null);
      if (kieu) ds.push({ ten: x.ten, viTri: x.viTri, kieu: kieuCongKhai_(kieu) });
    }
    if (cuaThang || !nghi[k]) { nghi[k] = ds; if (cuaThang) chuNghi[k] = true; }
  }
}
/* ---- Mã cá nhân ---- */
function bangMa_() {
  const id = PropertiesService.getScriptProperties().getProperty('MA_SHEET');
  if (!id) throw new Error('Chưa có bảng mã cá nhân – lãnh đạo chạy taoMaCaNhan trong Apps Script');
  return SpreadsheetApp.openById(id).getSheets()[0];
}
function dsMa_() {
  const c = CacheService.getScriptCache(); let s = c.get('ds-ma');
  if (!s) { s = JSON.stringify(bangMa_().getDataRange().getValues().slice(1).filter(r => String(r[0]).trim() && String(r[1]).trim()).map(r => [String(r[0]).trim(), String(r[1]).trim(), String(r[2]).trim()])); c.put('ds-ma', s, 300); }
  return JSON.parse(s);
}
function xacThuc_(ten, ma) {
  const c = CacheService.getScriptCache(), k = 'sai-ma-' + nn_(ten), sai = +c.get(k) || 0;
  if (sai >= 5) throw new Error('Nhập sai mã quá 5 lần – thử lại sau 15 phút');
  const r = dsMa_().find(x => nn_(x[0]) === nn_(ten) && x[1] === String(ma || '').trim());
  if (!r) { c.put(k, String(sai + 1), 900); throw new Error('Sai tên hoặc mã cá nhân'); }
  return { ten: r[0], laLD: nn_(r[2]) === nn_(LANH_DAO) };
}
/* Chạy trong trình soạn thảo: tạo bảng mã (lần đầu) + thêm mã cho người mới trong "Nhân viên khoa". Mã KHÔNG hiện ở nhật ký. */
function taoMaCaNhan() {
  const p = PropertiesService.getScriptProperties();
  let id = p.getProperty('MA_SHEET'), sh;
  if (id) sh = SpreadsheetApp.openById(id).getSheets()[0];
  else {
    const ss = SpreadsheetApp.create('Mã cá nhân – Lịch làm việc Khoa Dược (KHÔNG CHIA SẺ)');
    sh = ss.getSheets()[0]; sh.setName('Mã cá nhân');
    sh.getRange(1, 1, 1, 4).setValues([['Nhân viên (đúng tên trong lịch)', 'Mã cá nhân (6 số)', 'Quyền (Nhân viên / Lãnh đạo)', 'Ghi chú']]).setFontWeight('bold');
    sh.setFrozenRows(1); sh.getRange('B:B').setNumberFormat('@'); sh.setColumnWidths(1, 4, 200);
    id = ss.getId(); p.setProperty('MA_SHEET', id);
  }
  const cu = sh.getDataRange().getValues().slice(1), co = {};
  cu.forEach(r => { co[nn_(r[0])] = 1; });
  const ma = () => String(100000 + parseInt(Utilities.getUuid().replace(/-/g, '').slice(0, 10), 16) % 900000);
  const moi = [];
  if (!cu.some(r => nn_(r[2]) === nn_(LANH_DAO))) moi.push(['Lãnh đạo khoa', ma(), LANH_DAO, 'Có thể đổi thành tên mình (giữ Quyền = Lãnh đạo)']);
  for (const T of cacThang_()) for (const x of T.nv) if (!co[nn_(x.ten)]) { co[nn_(x.ten)] = 1; moi.push([x.ten, ma(), 'Nhân viên', '']); }
  if (moi.length) sh.getRange(sh.getLastRow() + 1, 1, moi.length, 4).setValues(moi);
  CacheService.getScriptCache().remove('ds-ma');
  Logger.log('Bảng mã cá nhân: ' + SpreadsheetApp.openById(id).getUrl() + ' – thêm ' + moi.length + ' người');
}

/* ---- Ghi sheet ---- */
function dongTrong_(T, ten, tu, dung, het) { const s = {}; dung.forEach(h => { s[h] = 1; }); let h = tu; while (s[h] && h <= het) h++; if (h > het) throw new Error('Sheet "' + ten + '" đã hết dòng – báo lãnh đạo'); return h; }
function ghiDon_(T, o) {
  const sh = T.ss.getSheetByName('Đăng ký nghỉ'), h = dongTrong_(T, 'Đăng ký nghỉ', 4, T.dk.map(r => r.hang), 203);
  sh.getRange(h, 1, 1, 3).setValues([[ngayCua_(o.tu), o.den !== o.tu ? ngayCua_(o.den) : '', o.ten]]);
  sh.getRange(h, 5, 1, 7).setValues([[o.kieu, o.ghiChu || '', o.tt, o.thay || '', new Date(), o.ma, o.note || '']]);
  o.hang = h; T.dk.push(o);
}
function ghiLamThay_(T, o) {
  const sh = T.ss.getSheetByName('Làm thay'), h = dongTrong_(T, 'Làm thay', 2, T.lt.map(r => r.hang), 300);
  sh.getRange(h, 1, 1, 3).setValues([[ngayCua_(o.ngay), o.buoi, o.ten]]);
  sh.getRange(h, 5, 1, 5).setValues([[o.viTri, o.ghiChu || '', o.tt, o.ma, new Date()]]);
  o.hang = h; T.lt.push(o);
}
function ghiDoi_(T, o) {
  const sh = T.ss.getSheetByName('Đổi trực'), h = dongTrong_(T, 'Đổi trực', 2, T.dt.map(r => r.hang), 300);
  sh.getRange(h, 1, 1, 10).setValues([[o.ma, new Date(), ngayCua_(o.ngay), VAI_TRUC[o.vai][0], o.nguoi, o.nhan, o.ngayDoi ? ngayCua_(o.ngayDoi) : '', o.tt, o.note || '', '']]);
  o.hang = h; T.dt.push(o);
}
function datTT_(T, ten, o, tt, note) {
  const sh = T.ss.getSheetByName(ten), col = { 'Đăng ký nghỉ': [7, 11], 'Làm thay': [7, 6], 'Đổi trực': [8, 9] }[ten];
  sh.getRange(o.hang, col[0]).setValue(tt); o.tt = tt;
  if (note != null) { const v = (o.note && ten !== 'Làm thay' ? o.note + ' · ' : '') + note; sh.getRange(o.hang, col[1]).setValue(v); o.note = v; }
  if (ten === 'Đổi trực') sh.getRange(o.hang, 10).setValue(new Date());
}
function nhatKy_(T, ai, hd, ct) { T.ss.getSheetByName('Nhật ký').appendRow([new Date(), ai, hd, ct]); }
function ghiTruc_(T, k, vai, ten) {
  const o = T.oLuoi[k]; if (!o) throw new Error('Không tìm thấy ô lịch ngày ' + dmy_(k));
  const g = luoi_(T.ss), nhan = g.getRange(o.hang + 1, 1, 16, 1).getValues();
  const i = nhan.findIndex(x => nn_(x[0]).indexOf(VAI_TRUC[vai][1]) === 0);
  if (i < 0) throw new Error('Không tìm thấy dòng ' + VAI_TRUC[vai][0] + ' trong lịch');
  g.getRange(o.hang + 1 + i, o.cot).setValue(ten);
  T.truc[k] = Object.assign({}, T.truc[k]); T.truc[k][vai] = ten;
}

/* ---- Kiểm tra đổi trực ---- */
function loiTruc_(T, P, vai, k, g) {
  const t = trucNgay_(T, k, g), n = nn_(P), loi = [];
  for (const v of Object.keys(VAI_TRUC)) if (v !== vai && nn_(t[v]) === n) loi.push(P + ' đã ' + VAI_TRUC[v][0].toLowerCase() + ' ngày ' + dmy_(k).slice(0, 5));
  const kn = kieuNghi_(T, P, k, g);
  if (kn) loi.push(P + ' nghỉ ngày ' + dmy_(k).slice(0, 5) + ' (' + kieuCongKhai_(kn).toLowerCase() + ')');
  if (vai !== 'kem') {
    const s = trucNgay_(T, congNgay_(k, 1), g);
    if (['cp', 'kho', 'kem'].some(v => nn_(s[v]) === n)) loi.push(P + ' có lịch trực ngày ' + dmy_(congNgay_(k, 1)).slice(0, 5) + ' (là ngày nghỉ sau trực)');
  }
  return loi;
}
function kiemDoi_(T, r) {
  const loi = [], t = T.truc[r.ngay] || {}, nvB = T.nv.find(x => nn_(x.ten) === nn_(r.nhan)), nvA = T.nv.find(x => nn_(x.ten) === nn_(r.nguoi));
  if (!nvB) loi.push(r.nhan + ' không có trong danh sách nhân viên');
  if (nn_(t[r.vai]) !== nn_(r.nguoi)) loi.push('Lịch đã thay đổi: ' + r.nguoi + ' không còn ' + VAI_TRUC[r.vai][0].toLowerCase() + ' ngày ' + dmy_(r.ngay).slice(0, 5));
  if (nvB && r.vai !== 'kem' && !nvB.chinh) loi.push(r.nhan + ' không thuộc danh sách trực chính');
  const g = { truc: {} }; g.truc[r.ngay] = Object.assign({}, t); g.truc[r.ngay][r.vai] = r.nhan;
  let vaiE = '';
  if (r.ngayDoi) {
    const e = Object.assign({}, trucNgay_(T, r.ngayDoi, g));
    vaiE = Object.keys(VAI_TRUC).find(v => nn_(e[v]) === nn_(r.nhan)) || '';
    if (!vaiE) loi.push(r.nhan + ' không có lịch trực ngày ' + dmy_(r.ngayDoi).slice(0, 5));
    else { if (vaiE !== 'kem' && nvA && !nvA.chinh) loi.push(r.nguoi + ' không thuộc danh sách trực chính'); e[vaiE] = r.nguoi; g.truc[r.ngayDoi] = e; }
  }
  if (!loi.length) { loi.push(...loiTruc_(T, r.nhan, r.vai, r.ngay, g)); if (vaiE) loi.push(...loiTruc_(T, r.nguoi, vaiE, r.ngayDoi, g)); }
  const ks = [r.ngay, congNgay_(r.ngay, 1)].concat(r.ngayDoi ? [r.ngayDoi, congNgay_(r.ngayDoi, 1)] : []);
  return { loi: loi, thieu: loi.length ? [] : thieuMoi_(T, ks, g, null), vaiE: vaiE };
}
function apDungDoi_(r, k) { ghiTruc_(thangCuaNgay_(r.ngay), r.ngay, r.vai, r.nhan); if (r.ngayDoi && k.vaiE) ghiTruc_(thangCuaNgay_(r.ngayDoi), r.ngayDoi, k.vaiE, r.nguoi); }

/* ---- Thao tác ---- */
function timTheoMa_(ma) {
  for (const T of cacThang_()) {
    const dk = T.dk.find(r => r.ma === ma); if (dk) return { T, loai: 'nghi', r: dk };
    const dt = T.dt.find(r => r.ma === ma); if (dt) return { T, loai: 'doi', r: dt };
  }
  throw new Error('Không tìm thấy đơn ' + ma);
}
function canhBaoTruc_(T, ten, ks) {
  const n = nn_(ten), o = [];
  for (const k of ks) { const t = T.truc[k] || {}; for (const v of Object.keys(VAI_TRUC)) if (nn_(t[v]) === n) o.push(VAI_TRUC[v][0].toLowerCase() + ' ' + dmy_(k).slice(0, 5)); }
  return o.length ? 'Đang có lịch ' + o.join(', ') + ' – nhớ nhờ người trực thay' : '';
}
const HANH_DONG_ = {
  dangNhap: (ai) => ({ cuaToi: cuaToi_(ai) }),
  /* Đổi mã đăng nhập (mã ban đầu = mã nhân viên) */
  doiMa: (ai, b) => {
    const moi = String(b.maMoi || '').trim();
    if (!/^[0-9A-Za-z]{4,20}$/.test(moi)) throw new Error('Mã mới gồm 4–20 chữ số hoặc chữ cái không dấu');
    const sh = bangMa_(), v = sh.getDataRange().getValues();
    const i = v.findIndex((r, j) => j > 0 && nn_(r[0]) === nn_(ai.ten));
    if (i < 0) throw new Error('Không tìm thấy tên trong bảng mã');
    sh.getRange(i + 1, 2).setNumberFormat('@').setValue(moi);
    sh.getRange(i + 1, 4).setValue('Tự đổi mã trên web ' + Utilities.formatDate(new Date(), TZ_VN, 'dd/MM/yyyy HH:mm'));
    CacheService.getScriptCache().remove('ds-ma');
    return { thongBao: 'Đã đổi mã. Lần sau đăng nhập bằng mã mới.' };
  },
  cuaToi: (ai) => ({ cuaToi: cuaToi_(ai) }),
  /* Đăng ký nghỉ CỦA BẢN THÂN, chọn từng ngày (nhiều ngày 1 lần) – mỗi ngày 1 đơn riêng (duyệt/huỷ riêng) */
  guiNghi: (ai, b) => {
    const kieu = String(b.kieu || '');
    let ks = Array.isArray(b.ngays) ? b.ngays.map(String) : dsNgay_(String(b.tu || ''), String(b.den || b.tu || ''));
    ks = ks.filter((k, i) => /^\d{4}-\d\d-\d\d$/.test(k) && ks.indexOf(k) === i).sort();
    if (!ks.length) throw new Error('Chọn ít nhất 1 ngày nghỉ');
    if (ks.length > 31) throw new Error('Mỗi lần tối đa 31 ngày');
    if (KIEU_NGHI.indexOf(kieu) < 0) throw new Error('Kiểu nghỉ không hợp lệ');
    if (ks[0] < homNay_()) throw new Error('Không đăng ký được ngày đã qua – báo lãnh đạo khoa');
    const kq = [];
    for (const k of ks) {
      try { kq.push(dmy_(k).slice(0, 5) + ': ' + nghiMotNgay_(ai, k, kieu, b)); }
      catch (e) { kq.push(dmy_(k).slice(0, 5) + ': KHÔNG ghi được – ' + e.message); }
    }
    return { thongBao: kq.join('\n') };
  },
  huy: (ai, b) => {
    const f = timTheoMa_(String(b.ma || '')), T = f.T, r = f.r;
    if (f.loai === 'nghi') {
      if (!ai.laLD && nn_(r.ten) !== nn_(ai.ten)) throw new Error('Chỉ huỷ được đơn của mình');
      if (!/^(Đã duyệt|Chờ duyệt|Chờ người làm thay)$/.test(r.tt)) throw new Error('Đơn đã ' + (r.tt || 'xử lý').toLowerCase());
      if (!ai.laLD && r.tu < homNay_()) throw new Error('Đơn đã bắt đầu – báo lãnh đạo khoa để huỷ');
      datTT_(T, 'Đăng ký nghỉ', r, 'Đã huỷ', 'Huỷ bởi ' + ai.ten);
      T.lt.filter(x => x.ma === r.ma && x.tt !== 'Từ chối').forEach(x => datTT_(T, 'Làm thay', x, 'Đã huỷ'));
    } else {
      if (!ai.laLD && nn_(r.nguoi) !== nn_(ai.ten)) throw new Error('Chỉ huỷ được đề nghị của mình');
      if (!/^Chờ/.test(r.tt)) throw new Error('Đề nghị đã ' + r.tt.toLowerCase());
      datTT_(T, 'Đổi trực', r, 'Đã huỷ', 'Huỷ bởi ' + ai.ten);
    }
    nhatKy_(T, ai.ten, 'Huỷ', r.ma);
    return { thongBao: 'Đã huỷ.' };
  },
  guiDoiTruc: (ai, b) => {
    const ngay = String(b.ngay || ''), vai = maVai_(String(b.vai || ''));
    if (!vai) throw new Error('Vai trò không hợp lệ');
    if (ngay < homNay_()) throw new Error('Không đổi được ca đã qua');
    const T = thangCuaNgay_(ngay);
    const nhan = T.nv.find(x => nn_(x.ten) === nn_(b.nguoiNhan));
    if (!nhan) throw new Error('Chọn người nhận trong danh sách');
    if (nn_(nhan.ten) === nn_(ai.ten)) throw new Error('Người nhận phải là người khác');
    const ngayDoi = String(b.ngayDoi || '');
    if (ngayDoi) { if (ngayDoi < homNay_()) throw new Error('Ca đổi lại đã qua'); thangCuaNgay_(ngayDoi); }
    if (T.dt.some(x => x.ngay === ngay && x.vai === vai && /^Chờ/.test(x.tt))) throw new Error('Ca này đang có đề nghị đổi chờ xử lý');
    const me = T.nv.find(x => nn_(x.ten) === nn_(ai.ten)) || { ten: ai.ten };
    const r = { ma: maDon_('D'), ngay: ngay, vai: vai, nguoi: me.ten, nhan: nhan.ten, ngayDoi: ngayDoi, tt: 'Chờ xác nhận', note: '' };
    const k = kiemDoi_(xemDoi_(r), r);
    if (k.loi.length) throw new Error(k.loi.join('; '));
    if (k.thieu.length) r.note = 'Lưu ý thiếu định mức: ' + moTaThieu_(k.thieu);
    ghiDoi_(T, r);
    nhatKy_(T, ai.ten, 'Đề nghị đổi trực', r.ma + ' · ' + VAI_TRUC[vai][0] + ' ' + dmy_(ngay) + ' → ' + nhan.ten + (ngayDoi ? ' (đổi lấy ' + dmy_(ngayDoi) + ')' : ''));
    return { thongBao: 'Đã gửi tới ' + nhan.ten + '. Khi ' + nhan.ten + ' đồng ý, lịch tự cập nhật' + (k.thieu.length ? ' (riêng ca này cần lãnh đạo duyệt vì thiếu định mức)' : '') + '.' };
  },
  traLoi: (ai, b) => {
    const ma = String(b.ma || ''), dongY = !!b.dongY;
    for (const T of cacThang_()) {
      const r = T.dt.find(x => x.ma === ma);
      if (r) {
        if (nn_(r.nhan) !== nn_(ai.ten) || r.tt !== 'Chờ xác nhận') throw new Error('Đề nghị không còn chờ bạn');
        if (!dongY) { datTT_(T, 'Đổi trực', r, 'Từ chối', ai.ten + ' từ chối'); nhatKy_(T, ai.ten, 'Từ chối đổi trực', ma); return { thongBao: 'Đã từ chối.' }; }
        const k = kiemDoi_(xemDoi_(r), r);
        if (k.loi.length) { datTT_(T, 'Đổi trực', r, 'Từ chối', 'Không hợp lệ: ' + k.loi.join('; ')); nhatKy_(T, ai.ten, 'Đổi trực không hợp lệ', ma); return { thongBao: 'Không đổi được: ' + k.loi.join('; ') }; }
        if (k.thieu.length) { datTT_(T, 'Đổi trực', r, 'Chờ duyệt', 'Thiếu định mức: ' + moTaThieu_(k.thieu)); nhatKy_(T, ai.ten, 'Đồng ý đổi trực → chờ duyệt', ma); return { thongBao: 'Đã đồng ý. Vì thiếu định mức (' + moTaThieu_(k.thieu) + ') nên chờ lãnh đạo duyệt.' }; }
        apDungDoi_(r, k); datTT_(T, 'Đổi trực', r, 'Đã áp dụng', ai.ten + ' đồng ý');
        nhatKy_(T, ai.ten, 'Đổi trực đã áp dụng', ma);
        return { thongBao: 'Đã đổi trực – lịch đã cập nhật.' };
      }
      const rows = T.lt.filter(x => x.ma === ma && nn_(x.ten) === nn_(ai.ten) && x.tt === 'Chờ xác nhận');
      if (rows.length) {
        rows.forEach(x => datTT_(T, 'Làm thay', x, dongY ? 'Đã duyệt' : 'Từ chối'));
        const don = T.dk.find(x => x.ma === ma);
        let tb = dongY ? 'Đã nhận làm thay.' : 'Đã từ chối làm thay.';
        if (don && don.tt === 'Chờ người làm thay') {
          const thieu = thieuMoi_(T, dsNgay_(don.tu, don.den), { dk: [Object.assign({}, don, { tt: 'Đã duyệt', ma: '' })] }, { boLt: { [ma]: 1 } });
          if (thieu.length) datTT_(T, 'Đăng ký nghỉ', don, 'Chờ duyệt', (dongY ? '' : ai.ten + ' từ chối làm thay – ') + 'thiếu định mức: ' + moTaThieu_(thieu));
          else datTT_(T, 'Đăng ký nghỉ', don, 'Đã duyệt', dongY ? ai.ten + ' làm thay' : 'Đủ định mức');
          tb += thieu.length ? ' Đơn nghỉ của ' + don.ten + ' chuyển lãnh đạo duyệt.' : ' Đơn nghỉ của ' + don.ten + ' đã được duyệt.';
        }
        nhatKy_(T, ai.ten, dongY ? 'Nhận làm thay' : 'Từ chối làm thay', ma);
        return { thongBao: tb };
      }
    }
    throw new Error('Không tìm thấy yêu cầu');
  },
  duyet: (ai, b) => {
    if (!ai.laLD) throw new Error('Chỉ lãnh đạo khoa được duyệt');
    const f = timTheoMa_(String(b.ma || '')), T = f.T, r = f.r, dongY = !!b.dongY, gc = String(b.ghiChu || '').slice(0, 200);
    if (f.loai === 'nghi') {
      if (!/^Chờ/.test(r.tt)) throw new Error('Đơn đã ' + (r.tt || 'duyệt').toLowerCase());
      datTT_(T, 'Đăng ký nghỉ', r, dongY ? 'Đã duyệt' : 'Từ chối', (dongY ? 'Lãnh đạo duyệt' : 'Lãnh đạo không duyệt') + (gc ? ': ' + gc : ''));
      T.lt.filter(x => x.ma === r.ma && x.tt === 'Chờ xác nhận').forEach(x => datTT_(T, 'Làm thay', x, 'Đã huỷ'));
    } else {
      if (r.tt !== 'Chờ duyệt' && r.tt !== 'Chờ xác nhận') throw new Error('Đề nghị đã ' + r.tt.toLowerCase());
      if (dongY) {
        const k = kiemDoi_(xemDoi_(r), r);
        if (k.loi.length) throw new Error('Không áp dụng được: ' + k.loi.join('; '));
        apDungDoi_(r, k);
      }
      datTT_(T, 'Đổi trực', r, dongY ? 'Đã áp dụng' : 'Từ chối', (dongY ? 'Lãnh đạo duyệt' : 'Lãnh đạo không duyệt') + (gc ? ': ' + gc : ''));
    }
    nhatKy_(T, ai.ten, dongY ? 'Duyệt' : 'Không duyệt', r.ma + (gc ? ' · ' + gc : ''));
    return { thongBao: dongY ? 'Đã duyệt.' : 'Đã từ chối.' };
  }
};
function nghiMotNgay_(ai, k, kieu, b) {
  const T = thangCuaNgay_(k), nv = T.nv.find(x => nn_(x.ten) === nn_(ai.ten));
  if (!nv) throw new Error(ai.ten + ' không có trong danh sách "Nhân viên khoa"');
  if (/^Phép khác/.test(kieu) && !String(b.ghiChu || '').trim()) throw new Error('"Phép khác" cần ghi rõ loại phép');
  const bu0 = buoiCua_(kieu);
  const trung = T.dk.find(r => nn_(r.ten) === nn_(nv.ten) && /^(|Đã duyệt|Chờ duyệt|Chờ người làm thay)$/.test(r.tt) && r.tu <= k && k <= r.den && buoiCua_(r.kieu).some(x => bu0.indexOf(x) >= 0));
  if (trung) throw new Error('đã có đơn "' + trung.kieu + '" ngày này');
  const ks = [k], don = { tu: k, den: k, ten: nv.ten, kieu: kieu, ghiChu: String(b.ghiChu || '').slice(0, 200), tt: 'Đã duyệt', ma: maDon_('N'), note: '' };
  const thieu = thieuMoi_(T, ks, { dk: [don] }, null), cb = canhBaoTruc_(T, nv.ten, ks);
  let thay = null; const lts = [];
  if (b.nguoiThay) {
    thay = T.nv.find(x => nn_(x.ten) === nn_(b.nguoiThay));
    if (!thay || thay === nv) throw new Error('người làm thay không hợp lệ');
    const bu = buoiCua_(kieu), buoi = bu.length === 2 ? 'Cả ngày' : bu[0] === 'S' ? 'Sáng' : 'Chiều';
    const kn = kieuNghi_(T, thay.ten, k, null);
    if (kn && buoiCua_(kn).some(x => bu.indexOf(x) >= 0)) throw new Error(thay.ten + ' cũng nghỉ ngày này');
    lts.push({ ngay: k, buoi: buoi, ten: thay.ten, viTri: nv.viTri, ghiChu: 'Làm thay ' + nv.ten, tt: 'Chờ xác nhận', ma: don.ma });
  }
  let tb;
  if (ai.laLD) { don.note = 'Lãnh đạo tự đăng ký' + (thieu.length ? ' – lưu ý: ' + moTaThieu_(thieu) : ''); tb = 'đã duyệt'; if (thay) lts.forEach(x => { x.tt = 'Đã duyệt'; }); }
  else if (thay) { don.tt = 'Chờ người làm thay'; don.thay = thay.ten; don.note = thieu.length ? 'Nếu không có người làm thay: ' + moTaThieu_(thieu) : ''; tb = 'chờ ' + thay.ten + ' xác nhận làm thay'; }
  else if (thieu.length) { don.tt = 'Chờ duyệt'; don.note = 'Thiếu định mức: ' + moTaThieu_(thieu); tb = 'chờ lãnh đạo duyệt (thiếu người: ' + moTaThieu_(thieu) + ')'; }
  else tb = 'đã duyệt (đủ định mức)';
  if (cb) { don.note = (don.note ? don.note + ' · ' : '') + cb; tb += ' – ' + cb.charAt(0).toLowerCase() + cb.slice(1); }
  ghiDon_(T, don); lts.forEach(x => ghiLamThay_(T, x));
  nhatKy_(T, ai.ten, 'Đăng ký nghỉ', don.ma + ' · ' + nv.ten + ' · ' + kieu + ' ' + dmy_(k) + ' → ' + don.tt + (thay ? ' · làm thay: ' + thay.ten : ''));
  return tb;
}
/* Đổi trực có thể khác tháng (ca của mình tháng này, đổi lấy ca tháng sau): gộp dữ liệu 2 file để kiểm tra */
function xemDoi_(r) {
  const T1 = thangCuaNgay_(r.ngay), T2 = r.ngayDoi ? thangCuaNgay_(r.ngayDoi) : T1;
  if (T1 === T2) return T1;
  const truc = {};
  for (const T of [T2, T1]) for (const k of Object.keys(T.truc)) if (!truc[k] || T.ngays.indexOf(k) >= 0) truc[k] = T.truc[k];
  return { nv: T1.nv, dm: T1.dm, truc: truc, ngays: T1.ngays.concat(T2.ngays), dk: T1.dk.concat(T2.dk), lt: T1.lt.concat(T2.lt) };
}
/* Danh sách file lịch (bộ nhớ đệm 10 phút) */
function dsFileLich_() {
  const c = CacheService.getScriptCache(); let s = c.get('ds-file-lich');
  if (!s) { s = JSON.stringify(dsSheetLich_(THU_MUC_LICH, '', [])); c.put('ds-file-lich', s, 600); }
  return JSON.parse(s);
}
/* Các ngày nghỉ đã đăng ký của 1 người trong năm nay (mọi file tháng mẫu mới) – chỉ trả cho chính người đó */
function nghiNam_(ten) {
  const nam = homNay_().slice(0, 4), n = nn_(ten), moi = {}, out = [], co = {};
  for (const f of dsFileLich_()) { const t = thangCuaFile_(f); if (t && String(t.nam) === nam && (!moi[t.thang] || String(f.sua) > String(moi[t.thang].f.sua))) moi[t.thang] = { f: f, t: t }; }
  for (const o of Object.values(moi)) {
    const T = taiThang_(o.f.id);
    if (T) {
      for (const r of T.dk) if (nn_(r.ten) === n && r.kieu && /^(|Đã duyệt|Chờ duyệt|Chờ người làm thay)$/.test(r.tt))
        for (const k of dsNgay_(r.tu, r.den)) if (k.slice(0, 4) === nam && !co[k + r.kieu]) { co[k + r.kieu] = 1; out.push({ ngay: k, kieu: r.kieu, tt: r.tt || 'Đã duyệt' }); }
      continue;
    }
    /* Lịch mẫu cũ từ T10/2026: mọi ngày nghỉ quy về "Phép tháng" (sáng/chiều = ½), bỏ ngày nghỉ sau trực cấp phát/trực kho */
    if (o.t.nam * 100 + o.t.thang < 202610) continue;
    const d = nghiCu_(o.f, o.t), thg = nam + '-' + String(o.t.thang).padStart(2, '0');
    for (const k of Object.keys(d.nghi)) {
      if (k.slice(0, 7) !== thg) continue;
      for (const x of d.nghi[k]) {
        if (nn_(x.ten) !== n) continue;
        if (String(d.truc[congNgay_(k, -1)] || '').split(/\s*[,;+]\s*/).some(p => nn_(p.replace(/\(.*?\)/g, '')) === n)) continue;
        const kieu = 'Phép tháng' + (/sang/.test(nn_(x.kieu)) ? ' (sáng)' : /chieu/.test(nn_(x.kieu)) ? ' (chiều)' : '');
        if (!co[k + kieu]) { co[k + kieu] = 1; out.push({ ngay: k, kieu: kieu, tt: 'Đã duyệt', cu: 1 }); }
      }
    }
  }
  return out.sort((a, b) => a.ngay.localeCompare(b.ngay));
}
/* Đọc ngày nghỉ + người trực chính của file mẫu cũ (bộ nhớ đệm 6 giờ theo phiên bản file) */
function nghiCu_(f, t) {
  const c = CacheService.getScriptCache(), key = 'nghi-cu-' + f.id + '-' + f.sua;
  let s = c.get(key);
  if (!s) {
    const ngay = {}, cu = { nghi: {}, chuNghi: {} };
    docLuoi_(luoi_(SpreadsheetApp.openById(f.id)).getDataRange().getDisplayValues(), { nam: t.nam, thang: t.thang }, ngay, {}, [], cu);
    const truc = {};
    for (const k of Object.keys(ngay)) truc[k] = Object.keys(ngay[k]).filter(l => /^truc (cap phat|kho)/.test(nn_(l))).map(l => ngay[k][l]).join(', ');
    s = JSON.stringify({ nghi: cu.nghi, truc: truc });
    try { c.put(key, s, 21600); } catch (e) {}
  }
  return JSON.parse(s);
}
function cuaToi_(ai) {
  const hom = homNay_(), tu = congNgay_(hom, -31), n = nn_(ai.ten), o = { don: [], doi: [], choToi: [], truc: [], choDuyet: [], nghiNam: nghiNam_(ai.ten) };
  for (const T of cacThang_()) {
    for (const r of T.dk) if (nn_(r.ten) === n && r.den >= tu)
      o.don.push({ ma: r.ma, tu: r.tu, den: r.den, kieu: r.kieu, tt: r.tt || 'Đã duyệt', thay: r.thay, note: r.note, huy: !!r.ma && r.tu >= hom && /^(Đã duyệt|Chờ duyệt|Chờ người làm thay)$/.test(r.tt) });
    for (const r of T.dt) if (nn_(r.nguoi) === n && r.ngay >= tu)
      o.doi.push({ ma: r.ma, ngay: r.ngay, vai: VAI_TRUC[r.vai] ? VAI_TRUC[r.vai][0] : '', nhan: r.nhan, ngayDoi: r.ngayDoi, tt: r.tt, note: r.note, huy: /^Chờ/.test(r.tt) });
    for (const r of T.dt) if (nn_(r.nhan) === n && r.tt === 'Chờ xác nhận')
      o.choToi.push({ loai: 'doi', ma: r.ma, ngay: r.ngay, vai: VAI_TRUC[r.vai] ? VAI_TRUC[r.vai][0] : '', nguoi: r.nguoi, ngayDoi: r.ngayDoi, note: r.note });
    const nhom = {};
    for (const r of T.lt) if (nn_(r.ten) === n && r.tt === 'Chờ xác nhận') (nhom[r.ma] = nhom[r.ma] || []).push(r);
    for (const ma of Object.keys(nhom)) {
      const don = T.dk.find(x => x.ma === ma) || {};
      o.choToi.push({ loai: 'lamThay', ma: ma, ngays: nhom[ma].map(x => x.ngay), buoi: nhom[ma][0].buoi, viTri: nhom[ma][0].viTri, nguoi: don.ten || '' });
    }
    for (const k of T.ngays) if (k >= hom) for (const v of Object.keys(VAI_TRUC)) if (nn_((T.truc[k] || {})[v]) === n) o.truc.push({ ngay: k, vai: v, ten: VAI_TRUC[v][0] });
    if (ai.laLD) {
      for (const r of T.dk) if (/^Chờ/.test(r.tt)) o.choDuyet.push({ loai: 'nghi', ma: r.ma, ten: r.ten, tu: r.tu, den: r.den, kieu: r.kieu, tt: r.tt, thay: r.thay, ghiChu: r.ghiChu, note: r.note });
      for (const r of T.dt) if (/^Chờ/.test(r.tt)) o.choDuyet.push({ loai: 'doi', ma: r.ma, ngay: r.ngay, vai: VAI_TRUC[r.vai] ? VAI_TRUC[r.vai][0] : '', nguoi: r.nguoi, nhan: r.nhan, ngayDoi: r.ngayDoi, tt: r.tt, note: r.note });
    }
  }
  const s = (a, b) => String(a.tu || a.ngay).localeCompare(String(b.tu || b.ngay));
  o.don.sort(s); o.doi.sort(s); o.choDuyet.sort(s); o.truc.sort(s);
  return o;
}
function lamMoiLich_() {
  const lich = lichLamViec_(), c = CacheService.getScriptCache(), s = layCache_(c);
  if (s) { try { const o = JSON.parse(s); o.lich = lich; luuCache_(c, JSON.stringify(o)); } catch (err) {} }
  return lich;
}
function doPost(e) {
  let out;
  try {
    const b = JSON.parse((e && e.postData && e.postData.contents) || '{}'), f = HANH_DONG_[b.hd];
    if (!f) throw new Error('Thao tác không hợp lệ');
    const ai = xacThuc_(b.ten, b.ma);
    if (b.hd === 'dangNhap' || b.hd === 'cuaToi') out = Object.assign({ ok: true, ten: ai.ten, laLD: ai.laLD }, f(ai, b));
    else if (b.hd === 'doiMa') {
      const lock = LockService.getScriptLock(); lock.waitLock(25000);
      try { out = Object.assign({ ok: true, ten: ai.ten, laLD: ai.laLD }, f(ai, b)); } finally { lock.releaseLock(); }
    } else {
      const lock = LockService.getScriptLock(); lock.waitLock(25000);
      try { out = Object.assign({ ok: true, ten: ai.ten, laLD: ai.laLD }, f(ai, b)); SpreadsheetApp.flush(); } finally { lock.releaseLock(); }
      for (const k of Object.keys(MEMO_)) delete MEMO_[k];
      out.lich = lamMoiLich_();
      out.cuaToi = cuaToi_(ai);
    }
  } catch (err) { out = { ok: false, loi: String(err && err.message || err) }; }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}
/* Chạy thử trong trình soạn thảo (không ghi gì): định mức + kiểm tra một đơn nghỉ giả định */
function thuDangKy() {
  const T = cacThang_().slice(-1)[0] || cacThang_()[0];
  if (!T) { Logger.log('Chưa có file tháng theo mẫu mới'); return; }
  const k = T.ngays[3], x = T.nv.find(v => v.viTri === 'Ngoại trú');
  Logger.log(JSON.stringify({ nv: T.nv.length, dm: T.dm, ngay: k, nhanSu: demNguoi_(T, k, null),
    thuNghi: x && thieuMoi_(T, [k], { dk: [{ tu: k, den: k, ten: x.ten, kieu: 'Nghỉ phép năm', tt: 'Đã duyệt', ma: 'thu' }] }, null) }));
}

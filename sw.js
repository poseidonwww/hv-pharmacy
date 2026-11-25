/* Service worker HV-Pharmacy: cài như ứng dụng, mở nhanh, xem lại được khi mạng yếu.
   Trang (HTML): lấy mạng trước, lỗi mạng thì dùng bản đã lưu. Tệp tĩnh cùng tên miền: dùng bản lưu ngay rồi cập nhật ngầm.
   Không can thiệp yêu cầu tới máy chủ khác (API Google Apps Script, Google Fonts…). Đổi V khi muốn xoá bộ nhớ cũ. */
const V = 'hv-v1', CO_BAN = ['/', '/assets/site.css', '/assets/site.js', '/assets/favicon-bvhv.png', '/assets/icon-192.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(CO_BAN)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).then(res => { const c = res.clone(); caches.open(V).then(x => x.put(r, c)); return res; })
      .catch(() => caches.match(r).then(x => x || caches.match('/'))));
    return;
  }
  e.respondWith(caches.match(r).then(x => {
    const f = fetch(r).then(res => { if (res.ok) { const c = res.clone(); caches.open(V).then(y => y.put(r, c)); } return res; }).catch(() => x);
    return x || f;
  }));
});

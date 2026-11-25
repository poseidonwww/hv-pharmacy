/* Cloudflare Pages: chặn các tệp nội bộ trong repo (ghi chú, mã Apps Script…) – chỉ chạy cho các đường dẫn trong _routes.json */
export const onRequest = () => new Response('Không tìm thấy', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });

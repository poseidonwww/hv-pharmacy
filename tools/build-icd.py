"""Chuyển file Excel danh mục ICD-10 (Thông tư 06/2026/TT-BYT) thành dữ liệu cho trang icd10.html.

Cách dùng (chạy ở thư mục hv-pharmacy):
    python tools/build-icd.py "đường/dẫn/Danh muc ICD TT06 2026.xlsx"

Tạo ra:
    data/icd10.json     – chương, khối, danh sách mã (tìm kiếm)   ~2,1MB (~300KB khi nén)
    data/icd10-hd.json  – hướng dẫn mã hoá bổ sung của WHO (tải khi mở chi tiết)

Cột Excel (bắt đầu từ 0): 1 STT chương · 2 phạm vi mã · 3 tên chương EN · 4 tên chương VI
    5 mã khối · 6 tên khối EN · 7 tên khối VI · 17 mã bệnh · 19 tên EN · 21 tên VI · 22 hướng dẫn VI
    23 không dùng làm bệnh chính · 24 không khuyến khích làm bệnh chính
    25 không dùng vì có mã 4–5 ký tự · 26 chỉ mã hoá nguyên nhân tử vong · 27 chỉ/chủ yếu ở nữ · 28 ở nam
Cờ (flags) là số bit: 1, 2, 4, 8, 16, 32 theo đúng thứ tự cột 23 → 28.
"""
import json, re, sys
from pathlib import Path
import openpyxl

src = Path(sys.argv[1])
out = Path(__file__).resolve().parent.parent / "data"
out.mkdir(exist_ok=True)

S = lambda x: str(x).strip() if x is not None else ""
one_line = lambda s: re.sub(r"\s+", " ", s)

rows = list(openpyxl.load_workbook(src, read_only=True).worksheets[0].iter_rows(values_only=True))[1:]
chapters, ch_ix, blocks, bl_ix, codes, guides = [], {}, [], {}, [], []
for r in rows:
    r = list(r) + [None] * (30 - len(r))
    code = S(r[17])
    if not code:
        continue
    ch = S(r[1])
    if ch not in ch_ix:
        ch_ix[ch] = len(chapters)
        chapters.append([ch, S(r[2]), one_line(S(r[4])), one_line(S(r[3]))])
    bl = S(r[5])
    if bl not in bl_ix:
        bl_ix[bl] = len(blocks)
        blocks.append([bl, one_line(S(r[7])), one_line(S(r[6]))])
    flags = sum(1 << i for i, c in enumerate(range(23, 29)) if S(r[c]))
    codes.append([code, one_line(S(r[21])), one_line(S(r[19])), flags, ch_ix[ch], bl_ix[bl]])
    guides.append(S(r[22]).replace("\r", ""))

dump = lambda o: json.dumps(o, ensure_ascii=False, separators=(",", ":"))
(out / "icd10.json").write_text(dump({"v": "TT 06/2026/TT-BYT", "ch": chapters, "bl": blocks, "c": codes}), encoding="utf-8")
(out / "icd10-hd.json").write_text(dump(guides), encoding="utf-8")
print(f"{len(codes)} mã · {len(chapters)} chương · {len(blocks)} khối → {out}")

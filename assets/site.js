/* HV-Pharmacy – JS dùng chung cho mọi trang */

/* Google Form góp ý (chủ sở hữu: khoaduochv@gmail.com).
   Câu trả lời lưu ở Sheet "Góp ý HV-Pharmacy (câu trả lời)" trong Drive của khoa.
   Mã câu hỏi (entry) dùng để điền sẵn – lấy từ Form, đổi nếu sửa câu hỏi trong Form. */
const GOP_Y_FORM = "https://docs.google.com/forms/d/e/1FAIpQLSf9UKCRkBBMIAIP0fAv91ys_OSCQNon6elGApa5aiQl8sa_lg/viewform";
const GOP_Y_ENTRY = { loai: 1692505631, trang: 1083765739, thuoc: 475923277 };

/* Tạo link Form điền sẵn. trang: đúng 1 lựa chọn trong Form ("Danh mục thuốc", "Mã ICD-10"…) */
function gopYUrl({ loai = "", trang = "", thuoc = "" } = {}) {
  const p = new URLSearchParams({ usp: "pp_url" });
  if (loai) p.set("entry." + GOP_Y_ENTRY.loai, loai);
  if (trang) p.set("entry." + GOP_Y_ENTRY.trang, trang);
  if (thuoc) p.set("entry." + GOP_Y_ENTRY.thuoc, thuoc);
  return GOP_Y_FORM + "?" + p.toString();
}
const GOP_Y_SAI = "Thông tin thuốc chưa đúng / chưa khớp";

/* Gắn link cho mọi phần tử có data-gopy="Tên trang" (link chung, không điền thuốc) */
document.querySelectorAll("[data-gopy]").forEach(a => {
  a.href = gopYUrl({ trang: a.dataset.gopy });
  a.target = "_blank"; a.rel = "noopener";
});

/* ===== Tài liệu trên Google Drive (dùng chung: index.html, quy-trinh.html) ===== */
/* Tài liệu từ Google Drive (thư mục của khoaduochv). Khoa chỉ cần thả file PDF vào đúng thư mục.
   TAI_LIEU_API: link /exec của Apps Script "API tai lieu HV-Pharmacy" (tools/api-tai-lieu.gs).
   Để trống → dùng bản danh sách tạm data/tai-lieu.json. */
const TAI_LIEU_API = "https://script.google.com/macros/s/AKfycbyiRh9dVk1i3QqookVn3azZu3AzQQqnv0cbdW17FOyVFGhzw_8L4lopzEsI79r5A00uug/exec";
/* Tên hiển thị cho file đặt tên không dấu / lộn xộn trên Drive: {id file: ["Tên", "Mã quy trình"]}.
   Tốt nhất đổi tên file trên Drive theo mẫu "QT.01.DUOC.GSP Quy trình kiểm nhập.pdf" rồi xoá dòng tương ứng ở đây. */
const DOC_TEN = {
  "1hRXXZVLqBYhbKshS0GcjaQLR31TtmAFM":["Khuyến cáo của Hội Tim mạch học Việt Nam",""],
  "1Pt15DkkjVmZHsNGg7-Blfwn6I33W3So9":["Hướng dẫn chẩn đoán và điều trị rối loạn chuyển hoá lipid",""],
  "1efippis37b3lDk0QKqXlPr10_QZYkixK":["Bản tin thông tin thuốc số 2",""],
  "1vP5ZL5FjGbax2Hvr1uOJi372Jbl8pdlW":["Quy trình rà soát đơn thuốc ngoại trú chưa lấy","QT.19"],
  "19uZwEzTNXfBbgQ-GffHU_s_3bwkn1NNz":["Quy trình quản lý hàng hoá ký gửi tại bệnh viện","QT.20.DUOC.GSP"],
  "13bsVkXn_cf5GtJ6pHd1M7ayIaEwKfavI":["Quyết định ban hành quy trình",""],
  "1jAnm07RAwSwoPK4-u4JLm_iFBv1i_xcT":["Quy trình thực hiện 3 kiểm tra, 5 đối chiếu","QT.14.DUOC.NVD"],
  "1Ij2sHaz5jqLSLvORE4hQamJ-gFICXpq2":["Quy trình giám sát phản ứng có hại của thuốc (ADR)","QT.15.DUOC.DLS"],
  "1IjZVbkw6HAz1cARfG5BF7R-_dwhWspY9":["Quy trình quản lý thuốc có nguy cơ cao","QT.16.DUOC.DLS"],
};

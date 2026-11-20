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

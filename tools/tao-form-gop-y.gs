/**
 * Tạo Google Form "Góp ý HV-Pharmacy" cho Khoa Dược – BVĐK Hùng Vương.
 * Cách dùng: đăng nhập khoaduochv@gmail.com → mở https://script.new → dán toàn bộ file này
 * → chọn hàm taoFormGopY → Chạy → cho phép quyền. Link Form in ra ở "Nhật ký thực thi".
 * Chạy 1 lần là đủ; chạy lại sẽ tạo thêm 1 Form mới.
 */
function taoFormGopY() {
  const form = FormApp.create('Góp ý – HV-Pharmacy (Khoa Dược BVĐK Hùng Vương)');
  form.setDescription(
    'Góp ý cho trang tra cứu thông tin thuốc của Khoa Dược: báo thông tin chưa đúng, ' +
    'đề xuất thêm thuốc/tài liệu/công cụ, hoặc báo lỗi website. Mất khoảng 1 phút.\n' +
    'Không ghi thông tin định danh người bệnh (họ tên, mã bệnh án…) vào biểu mẫu này.')
    .setCollectEmail(false)
    .setLimitOneResponsePerUser(false)
    .setAllowResponseEdits(false)
    .setProgressBar(false)
    .setConfirmationMessage('Cảm ơn bạn! Khoa Dược đã nhận góp ý và sẽ xem xét sớm.');

  form.addMultipleChoiceItem()
    .setTitle('Loại góp ý')
    .setChoiceValues([
      'Thông tin thuốc chưa đúng / chưa khớp',
      'Đề xuất thêm thuốc, tài liệu hoặc công cụ',
      'Lỗi website (không mở được, hiển thị sai…)',
      'Góp ý khác'])
    .setRequired(true);

  form.addListItem()
    .setTitle('Trang / công cụ liên quan')
    .setChoiceValues(['Trang chủ', 'Danh mục thuốc', 'Thuốc tiêm truyền', 'Người bệnh đặc biệt',
                      'Mã ICD-10', 'Tương tác thuốc – thuốc', 'Tài liệu / video hướng dẫn', 'Khác'])
    .setRequired(false);

  form.addTextItem()
    .setTitle('Tên thuốc / mã ICD liên quan (nếu có)')
    .setHelpText('Ví dụ: Vancomycin (Vecmid 500mg), J18.9')
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('Nội dung góp ý')
    .setHelpText('Mô tả cụ thể: thông tin nào chưa đúng, nên sửa thành gì, nguồn tham khảo (tờ HDSD, Dược thư…)')
    .setRequired(true);

  form.addTextItem().setTitle('Khoa / phòng').setRequired(false);
  form.addTextItem()
    .setTitle('Họ tên và số điện thoại / email (nếu muốn Khoa Dược phản hồi)')
    .setRequired(false);

  // Lưu câu trả lời vào một Google Sheet để khoa theo dõi
  const ss = SpreadsheetApp.create('Góp ý HV-Pharmacy (câu trả lời)');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  Logger.log('Link điền Form (dán vào website): ' + form.getPublishedUrl());
  Logger.log('Link sửa Form: ' + form.getEditUrl());
  Logger.log('Bảng câu trả lời: ' + ss.getUrl());
}

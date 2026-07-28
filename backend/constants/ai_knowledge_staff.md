# CẨM NANG NGHIỆP VỤ NỘI BỘ DÀNH CHO NHÂN VIÊN POS

## 1. Quy trình Đóng/Kết ca trực (Shift Closing)

* Bước 1: Nhân viên kiểm đếm toàn bộ tiền mặt thực tế đang có trong két sắt bàn quầy.
* Bước 2: Nhập số tiền đếm được vào ô "closing_cash_actual" trên giao diện POS hệ thống.
* Bước 3: Bấm nút chốt ca để hệ thống tự động đối soát với số liệu máy tính (`system_cash_collected`).
* Bước 4: Nếu phát sinh lệch tiền mặt (`difference` khác 0), nhân viên phải báo ngay cho Admin/Quản lý ca kiểm tra camera đối soát, không tự ý rời vị trí.

## 2. Quy định về việc Hủy món / Giảm số lượng

* Nhân viên không có quyền tự bấm giảm hoặc xóa món trên hóa đơn khi khách đổi ý.
* Phải gọi Admin đến nhập mã PIN xác thực hệ thống mới thực hiện được lệnh ghi log chống thất thoát tiền.

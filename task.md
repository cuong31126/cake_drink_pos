# Danh sách công việc triển khai hệ thống Hàng đợi đơn hàng (Order Queue Kanban)

- [x] Cập nhật Database Model `Order.js` (Bổ sung trạng thái `pending_confirm` và `ready` vào `status` enum)
- [x] Viết các Controller xử lý trạng thái đơn hàng trong `orderController.js` (`acceptOrder`, `readyOrder`)
- [x] Bổ sung API cập nhật tình trạng hết hàng của sản phẩm (`toggleProductAvailability`)
- [x] Đăng ký các Route API Backend mới trong `routes/api.js`
- [x] Đăng ký tuyến đường `/queue` trên Frontend trong `App.jsx`
- [x] Thêm nút shortcut `📋 Hàng đợi đơn` vào `Topbar.jsx` cho staff và admin
- [x] Xây dựng trang giao diện `/queue` đầy đủ tính năng trong `OrderQueue.jsx` (Sidebar bộ lọc & Báo hết món, Kanban 3 cột Chờ xác nhận/Đang xử lý/Đã xong, popup chi tiết và nút transition trạng thái)
- [x] Kiểm thử thủ công quy trình đặt đơn ➔ nhận đơn ➔ chế biến xong ➔ hoàn thành đóng đơn để đảm bảo hoạt động trơn tru.

require('dotenv').config(); // Nạp các biến môi trường từ file .env lên hệ thống trước tiên
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middlewares/errorMiddleware');

const app = express();

// Kích hoạt kết nối tới cơ sở dữ liệu MongoDB Atlas
connectDB();

// Cấu hình Middleware hệ thống
app.use(cors()); // Cho phép Frontend từ Port khác (Ví dụ Vite React Port 5173) gọi API sang
app.use(express.json()); // Cho phép Express đọc cấu hình dữ liệu dạng JSON từ Request Body

// Đăng ký các phân cấp tuyến đường API hệ thống
app.use('/api/v1', require('./routes/api')); // Gom toàn bộ 49 API chức năng vào tiền tố v1
app.use('/api/webhooks', require('./routes/webhooks')); // Nhánh webhook công cộng nhận tín hiệu PayOS

// Định tuyến cơ bản kiểm tra trạng thái hoạt động của Server
app.get('/', (req, res) => {
  res.status(200).json({ status: 'active', message: 'Hệ thống POS Cake & Drink Backend đang chạy ổn định.' });
});

// Nhúng bộ đôi Middleware xử lý và bắt lỗi tập trung (Bắt buộc phải đặt ở cuối cùng sau các Routes)
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`[Server Ready] Máy chủ Express đang khởi chạy tại Port: ${PORT} trong chế độ: ${process.env.NODE_ENV || 'development'}`);
});
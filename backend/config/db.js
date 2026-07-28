const mongoose = require('mongoose');

/**
 * Hàm kết nối tới cơ sở dữ liệu MongoDB Atlas
 * Sử dụng async/await để xử lý bất đồng bộ và bắt lỗi tập trung
 */
const connectDB = async () => {
  try {
    // Lấy chuỗi kết nối từ biến môi trường
    const connURI = process.env.MONGO_URI;
    
    if (!connURI) {
      throw new Error("Cảnh báo: MONGO_URI chưa được định nghĩa trong file .env");
    }

    const conn = await mongoose.connect(connURI, {
      autoIndex: true, // Tự động xây dựng index (hữu ích cho thuộc tính unique như email)
    });

    console.log(`[Database] Kết nối thành công tới MongoDB Atlas: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[Database Lỗi] Không thể kết nối tới cơ sở dữ liệu: ${error.message}`);
    // Thoát chương trình với mã lỗi 1 nếu kết nối thất bại
    process.exit(1);
  }
};

module.exports = connectDB;
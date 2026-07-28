/**
 * Middleware xử lý các API Route không tồn tại trong hệ thống (404 Not Found)
 */
const notFound = (req, res, next) => {
  const error = new Error(`Đường dẫn API không tìm thấy trên hệ thống - [${req.method}] ${req.originalUrl}`);
  res.status(404);
  next(error); // Chuyển tiếp lỗi sang Middleware xử lý lỗi tổng chung bên dưới
};

/**
 * Middleware xử lý lỗi tập trung toàn hệ thống (Global Error Handler)
 * Đảm bảo hệ thống backend không bị crash bất ngờ và trả về cấu trúc lỗi đồng bộ dạng JSON
 */
const errorHandler = (err, req, res, next) => {
  // Nếu status code hiện tại là 200 (mặc định), ép về lỗi 500 (Internal Server Error)
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;

  // Xử lý trường hợp lỗi CastError của Mongoose (Ví dụ truyền sai cấu trúc định dạng ObjectId)
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 400;
    message = 'Định dạng ID dữ liệu gửi lên không đúng cấu trúc (Mongoose CastError).';
  }

  // Xử lý trường hợp lỗi trùng lặp thuộc tính unique trong MongoDB (Ví dụ đăng ký trùng email)
  if (err.code === 11000) {
    statusCode = 400;
    const duplicatedField = Object.keys(err.keyValue)[0];
    message = `Dữ liệu thuộc tính [${duplicatedField}] đã tồn tại trong hệ thống, không được phép trùng lặp.`;
  }

  // Xử lý lỗi kiểm tra ràng buộc Schema của Mongoose (Validation Error)
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(val => val.message).join(', ');
  }

  console.error(`[Global Error Log] Lỗi xảy ra tại đường dẫn: [${req.method}] ${req.originalUrl} | Nội dung: ${message}`);

  // Phản hồi lỗi về phía Client
  res.status(statusCode).json({
    success: false,
    message: message,
    // Chỉ hiển thị stack trace chi tiết khi hệ thống đang chạy trong môi trường phát triển (development)
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
};

module.exports = { notFound, errorHandler };
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware Xác thực người dùng bằng JSON Web Token (JWT)
 * Kiểm tra tính hợp lệ của Token gửi kèm trong Header của Request
 */
const protect = async (req, res, next) => {
  let token;

  // Kiểm tra token có nằm trong Header Authorization theo chuẩn Bearer không
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Tách lấy chuỗi token thô từ chuỗi "Bearer <token>"
      token = req.headers.authorization.split(' ')[1];

      // Giải mã và xác thực chữ ký của token bằng JWT_SECRET bí mật
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Tìm kiếm thông tin người dùng trong DB theo ID từ token, loại bỏ trường password mật khẩu
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Xác thực thất bại. Người dùng không tồn tại trên hệ thống.' });
      }

      if (!req.user.is_active) {
        return res.status(403).json({ success: false, message: 'Tài khoản của bạn đã bị khóa hoặc ngừng hoạt động.' });
      }

      // Hợp lệ, cho phép đi tiếp sang controller tiếp theo
      return next();
    } catch (error) {
      console.error(`[Auth Middleware Lỗi] Xác thực Token thất bại: ${error.message}`);
      return res.status(401).json({ success: false, message: 'Xác thực thất bại. Token không hợp lệ hoặc đã hết hạn.' });
    }
  }

  // Trường hợp hoàn toàn không gửi kèm token lên hệ thống
  if (!token) {
    return res.status(401).json({ success: false, message: 'Yêu cầu bị từ chối. Không tìm thấy Token xác thực Authorization trong Header.' });
  }
};

/**
 * Middleware Phân quyền truy cập dựa trên vai trò (Roles)
 * Cho phép truyền vào danh sách các quyền được chấp nhận (Ví dụ: authorize('admin', 'staff'))
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    // Đảm bảo middleware 'protect' đã chạy trước đó và nạp thông tin req.user thành công
    if (!req.user) {
      return res.status(500).json({ success: false, message: 'Lỗi hệ thống nghiêm trọng. Middleware phân quyền chạy trước khi xác thực thông tin.' });
    }

    // Kiểm tra vai trò của người dùng có nằm trong mảng quyền hợp lệ hay không
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: `Quyền truy cập bị từ chối. Vai trò [${req.user.role}] không đủ thẩm quyền thực hiện hành động này.` 
      });
    }

    // Quyền hợp lệ, cho phép xử lý tiếp
    next();
  };
};

module.exports = { protect, authorize };
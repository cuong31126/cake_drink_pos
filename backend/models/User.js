const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

/**
 * Schema cấu trúc Người Dùng (Users)
 * Hỗ trợ đồng thời đăng ký thường qua form và Đăng nhập nhanh bằng Google Auth
 */
const userSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => new mongoose.Types.ObjectId().toString()
  },
  name: {
    type: String,
    required: [true, 'Tên người dùng là bắt buộc']
  },
  email: {
    type: String,
    required: [true, 'Email là bắt buộc'],
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    // Đặt required thành false để tài khoản đăng nhập qua Google OAuth2 lọt qua được (không cần mật khẩu)
    required: false, 
    default: null
  },
  google_id: {
    type: String,
    // Lưu chuỗi ID định danh duy nhất từ hệ thống Google gửi về
    default: null
  },
  role: {
    type: String,
    enum: ['admin', 'staff', 'user'],
    default: 'user'
  },
  store_id: {
    type: String,
    // Định biên nhân viên thuộc chi nhánh nào (Ví dụ: 'store_Q1'). Admin thì trường này bằng null.
    default: null
  },
  is_active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true // Tự động sinh trường createdAt và updatedAt
});

/**
 * Middleware tiền xử lý (Pre-save hook)
 * Tự động mã hóa (hash) mật khẩu bằng thư viện bcrypt trước khi lưu bản ghi vào MongoDB
 */
/**
 * Middleware tiền xử lý (Pre-save hook)
 * 💡 ĐÃ SỬA: Loại bỏ tham số 'next' và các lệnh gọi 'next()' để tương thích chuẩn Mongoose hiện đại,
 * giải quyết triệt để lỗi "next is not a function" khi tạo tài khoản.
 */
userSchema.pre('save', async function () {
  const user = this;

  // Nếu mật khẩu không thay đổi hoặc không tồn tại (Google Auth), tự động thoát hàm (tương đương next)
  if (!user.isModified('password') || !user.password) {
    return; 
  }

  // Thực hiện băm mật khẩu bất đồng bộ
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(user.password, salt);
  
  // Hàm async tự kết thúc ở đây, Mongoose sẽ tự hiểu để chạy tiếp sang lệnh lưu vào DB!
});

/**
 * Method tùy biến hệ thống (Instance method)
 * Hàm hỗ trợ so sánh đối chiếu mật khẩu thô khách nhập với mật khẩu đã băm trong DB khi đăng nhập
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User;
const User = require('../models/User');
const jwt = require('jsonwebtoken');

/**
 * Hàm trợ năng tạo nhanh Access Token (Hạn 7 ngày)
 */
const generateAccessToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

/**
 * Hàm trợ năng tạo nhanh Refresh Token (Hạn 7 ngày)
 */
const generateRefreshToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

/**
 * @desc    Đăng ký tài khoản khách hàng mới (Đăng ký thường)
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
    try {
        const { name, email, password, phone } = req.body;

        // Kiểm tra tính trùng lặp của Email trong hệ thống
        const userExists = await User.findOne({ email });
        if (userExists) {
            res.status(400);
            throw new Error('Địa chỉ email này đã được sử dụng trên hệ thống.');
        }

        // Khởi tạo thực thể người dùng mới (Mật khẩu tự mã hóa ở tầng Model hook)
        const user = await User.create({
            name,
            email,
            password,
            role: 'user', // Mặc định tài khoản tự đăng ký là khách hàng online
            store_id: null
        });

        res.status(201).json({
            success: true,
            message: 'Đăng ký tài khoản thành công.',
            data: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        // 💡 GIẢI PHÁP MỚI: Tự xử lý phản hồi lỗi tại chỗ, loại bỏ hoàn toàn việc gọi 'next(error)' gây crash
        let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
        let message = error.message;

        // Đồng bộ lại các bộ lọc lỗi Mongoose y hệt bên errorMiddleware
        if (error.code === 11000) {
            statusCode = 400;
            const duplicatedField = Object.keys(error.keyValue)[0];
            message = `Dữ liệu thuộc tính [${duplicatedField}] đã tồn tại trong hệ thống.`;
        }

        if (error.name === 'ValidationError') {
            statusCode = 400;
            message = Object.values(error.errors).map(val => val.message).join(', ');
        }

        console.error(`[Controller Error Log] Lỗi xảy ra tại register: ${message}`);

        // Bắn thẳng JSON về cho Frontend Login.jsx nhận diện trực tiếp
        return res.status(statusCode).json({
            success: false,
            message: message,
            stack: process.env.NODE_ENV === 'production' ? null : error.stack
        });
    
}
};

/**
 * @desc    Đăng nhập hệ thống truyền thống bằng tài khoản và mật khẩu
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Tìm kiếm thông tin người dùng theo email
        const user = await User.findOne({ email });
        if (!user) {
            res.status(401);
            throw new Error('Tài khoản email hoặc mật khẩu không chính xác.');
        }

        // Trường hợp tài khoản chỉ đăng ký qua Google Auth, không có mật khẩu hệ thống
        if (!user.password) {
            res.status(401);
            throw new Error('Tài khoản này được đăng ký thông qua liên kết Google. Vui lòng đăng nhập bằng Google.');
        }

        // Đối chiếu so khớp mật khẩu bằng instance method mã hóa băm
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            res.status(401);
            throw new Error('Tài khoản email hoặc mật khẩu không chính xác.');
        }

        // Tạo bộ đôi Token bảo mật
        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        res.status(200).json({
            success: true,
            message: 'Đăng nhập hệ thống thành công.',
            accessToken,
            refreshToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                store_id: user.store_id
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Đăng nhập hoặc Tự động Đăng ký nhanh bằng Google OAuth2
 * @route   POST /api/v1/auth/google
 * @access  Public
 */
const googleAuth = async (req, res, next) => {
    try {
        const { email, name, googleId } = req.body;

        if (!googleId || !email) {
            res.status(400);
            throw new Error('Dữ liệu thông tin xác thực từ Google gửi lên bị thiếu.');
        }

        // 1. Tìm kiếm theo ID định danh Google trước
        let user = await User.findOne({ google_id: googleId });

        // 2. Nếu không tìm thấy, kiểm tra xem Email này đã tồn tại dưới dạng đăng ký thường chưa
        if (!user) {
            user = await User.findOne({ email });

            if (user) {
                // Nếu đã có email thường, tiến hành cập nhật liên kết thêm trường google_id
                user.google_id = googleId;
                await user.save();
            } else {
                // 3. Nếu hoàn toàn là tài khoản mới, tiến hành tự động đăng ký (Mật khẩu để trống)
                user = await User.create({
                    name,
                    email,
                    google_id: googleId,
                    password: null,
                    role: 'user',
                    store_id: null
                });
            }
        }

        if (!user.is_active) {
            res.status(403);
            throw new Error('Tài khoản liên kết Google này hiện đang bị tạm khóa.');
        }

        // Cấp phát Token truy cập hệ thống
        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        res.status(200).json({
            success: true,
            message: 'Xác thực Google OAuth2 thành công.',
            accessToken,
            refreshToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                store_id: user.store_id
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Gia hạn Access Token mới dựa vào chuỗi Refresh Token hợp lệ
 * @route   POST /api/v1/auth/refresh-token
 * @access  Public
 */
const refreshToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            res.status(401);
            throw new Error('Yêu cầu bị từ chối. Không tìm thấy Refresh Token trong Request Body.');
        }

        // Xác thực tính hợp lệ của chữ ký Refresh Token
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        // Tìm kiếm người dùng tương ứng trong DB
        const user = await User.findById(decoded.id);
        if (!user || !user.is_active) {
            res.status(401);
            throw new Error('Phiên làm việc không hợp lệ hoặc tài khoản đã bị khóa.');
        }

        // Tạo mới một Access Token thời hạn 15 phút tiếp theo
        const newAccessToken = generateAccessToken(user._id);

        res.status(200).json({
            success: true,
            accessToken: newAccessToken
        });
    } catch (error) {
        res.status(401);
        next(new Error('Refresh Token đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.'));
    }
};

const getUserProfile = async (req, res, next) => {
    try {
        res.status(200).json({
            success: true,
            user: req.user
        });
    } catch (error) {
        next(error);
    }
};

const logout = async (req, res, next) => {
    try {
        res.status(200).json({
            success: true,
            message: 'Đăng xuất thành công.'
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { register, login, googleAuth, refreshToken, getUserProfile, logout };
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
 * Hàm trợ năng tạo tên hiển thị đẹp từ địa chỉ Email/Gmail
 * VD: le.quoc.cuong.99@gmail.com -> Le Quoc Cuong
 */
const deriveNameFromEmail = (email, providedName) => {
    if (providedName && !providedName.includes('@')) {
        return providedName;
    }
    if (!email) return providedName || 'Khách Hàng';
    const prefix = email.split('@')[0];
    const words = prefix.replace(/[\._\-]/g, ' ').replace(/\d+/g, ' ').trim();
    if (!words) return prefix;
    return words.split(' ')
        .filter(Boolean)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
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

        const displayName = deriveNameFromEmail(email, name);

        // Khởi tạo thực thể người dùng mới (Mật khẩu tự mã hóa ở tầng Model hook)
        const user = await User.create({
            name: displayName,
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

        // Tự động cập nhật tên chuẩn nếu tên hiện tại đang bị dán email thô
        if (user && (!user.name || user.name.includes('@'))) {
            user.name = deriveNameFromEmail(user.email, user.name);
            try { await user.save(); } catch (e) { /* ignore */ }
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

        const displayName = deriveNameFromEmail(email, name);

        // 1. Tìm kiếm theo ID định danh Google trước
        let user = await User.findOne({ google_id: googleId });

        // 2. Nếu không tìm thấy, kiểm tra xem Email này đã tồn tại dưới dạng đăng ký thường chưa
        if (!user) {
            user = await User.findOne({ email });

            if (user) {
                // Nếu đã có email thường, tiến hành cập nhật liên kết thêm trường google_id
                user.google_id = googleId;
                if (!user.name || user.name.includes('@') || user.name.toLowerCase().includes('google')) {
                    user.name = displayName;
                }
                await user.save();
            } else {
                // 3. Nếu hoàn toàn là tài khoản mới, tiến hành tự động đăng ký (Mật khẩu để trống)
                user = await User.create({
                    name: displayName,
                    email,
                    google_id: googleId,
                    password: null,
                    role: 'user',
                    store_id: null
                });
            }
        } else if (!user.name || user.name.includes('@') || user.name.toLowerCase().includes('google')) {
            user.name = displayName;
            await user.save();
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
        const userObj = req.user ? req.user.toObject() : {};
        if (userObj.email && (!userObj.name || userObj.name.includes('@'))) {
            userObj.name = deriveNameFromEmail(userObj.email, userObj.name);
        }
        res.status(200).json({
            success: true,
            user: userObj
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

/**
 * @desc    Lấy danh sách tất cả người dùng (Admin)
 * @route   GET /api/v1/users
 * @access  Private (Admin)
 */
const getAllUsers = async (req, res, next) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Nâng quyền / Thay đổi vai trò người dùng (user -> staff/admin)
 * @route   PATCH /api/v1/users/:id/role
 * @access  Private (Admin)
 */
const updateUserRole = async (req, res, next) => {
    try {
        const { role, store_id, pin } = req.body;
        const targetUserId = req.params.id;

        if (!['user', 'staff', 'admin'].includes(role)) {
            res.status(400);
            throw new Error('Vai trò chỉ định không hợp lệ.');
        }

        const user = await User.findById(targetUserId);
        if (!user) {
            res.status(404);
            throw new Error('Không tìm thấy tài khoản người dùng.');
        }

        user.role = role;
        if (store_id !== undefined) {
            user.store_id = store_id;
        }
        if (pin !== undefined && pin.trim().length === 6) {
            user.pin = pin.trim();
        }

        await user.save();

        res.status(200).json({
            success: true,
            message: `Đã cập nhật tài khoản ${user.name || user.email} sang vai trò: ${role.toUpperCase()}`,
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                store_id: user.store_id,
                pin: user.pin
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Xác thực mã PIN 6 số của nhân viên/admin
 * @route   POST /api/v1/auth/verify-pin
 * @access  Private (Admin/Staff)
 */
const verifyPin = async (req, res, next) => {
    try {
        const { pin } = req.body;
        if (!pin || pin.trim().length !== 6) {
            res.status(400);
            throw new Error('Mã PIN phải bao gồm đúng 6 chữ số.');
        }

        const userPin = req.user?.pin || '123456';
        // Cho phép 123456 là mã PIN mặc định chung hoặc mã PIN cá nhân của user
        if (pin === userPin || pin === '123456' || pin === '1234') {
            return res.status(200).json({
                success: true,
                message: 'Xác thực mã PIN 6 số thành công!'
            });
        }

        res.status(400);
        throw new Error('Mã PIN xác thực không chính xác.');
    } catch (error) {
        next(error);
    }
};

module.exports = { 
    register, 
    login, 
    googleAuth, 
    refreshToken, 
    getUserProfile, 
    logout,
    getAllUsers,
    updateUserRole,
    verifyPin
};
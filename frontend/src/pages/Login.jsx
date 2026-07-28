import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { useAuth } from '../context/AuthContext'; 

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  
  // 💡 ĐÃ ĐỒNG BỘ: Đổi hoàn toàn state 'username' thành 'name' để khớp Schema User.js của bạn
  const [name, setName] = useState(''); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (isRegisterMode) {
      // ==========================================
      // 📝 LUỒNG ĐĂNG KÝ (REGISTER) KẾT NỐI DB THẬT
      // ==========================================
      if (!name || !email || !password || !confirmPassword) {
        setError('Vui lòng điền đầy đủ tất cả các trường dữ liệu!');
        return;
      }
      if (password !== confirmPassword) {
        setError('Mật khẩu nhập lại không trùng khớp!');
        return;
      }

      try {
        // Gửi chính xác payload lên Route của bạn
        const response = await API.post('/auth/register', {
          name, // Khớp với Schema: required: true
          email,
          password
        });

        if (response.data.success) {
          setSuccess(`Tài khoản [${name}] đã được ghi nhận vào MongoDB Atlas!`);
          setIsRegisterMode(false);
          setPassword('');
          setConfirmPassword('');
        }
      } catch (err) {
        // Bắt lỗi Validation phát ra từ Backend
        setError(err.response?.data?.message || 'Đăng ký thất bại. Email có thể đã tồn tại.');
      }

    } else {
      // ==========================================
      // 🔐 LUỒNG ĐĂNG NHẬP (LOGIN) ĐỐI SOÁT DB THẬT
      // ==========================================
      if (!email || !password) {
        setError('Vui lòng nhập đầy đủ Email và Mật khẩu đăng nhập!');
        return;
      }

      try {
        // Gọi API Login thực tế
        const response = await API.post('/auth/login', {
          email,
          password
        });

        // 💡 BỔ SUNG: In log ra Console để bắt quả tang cấu trúc thật của Backend trả về
        console.log("=== GÓI TIN ĐĂNG NHẬP THÀNH CÔNG ===", response.data);

        // 💡 BỔ SUNG: Bóc tách phòng vệ (Quét cả trường hợp Backend bọc thêm 1 lớp .data)
        const accessToken = response.data.accessToken || response.data.data?.accessToken;
        const user = response.data.user || response.data.data?.user;

        if (!accessToken) {
          console.error("❌ Backend không hề trả về biến accessToken!");
          setError("Lỗi cấu trúc dữ liệu xác thực từ Server.");
          return;
        }

        // Gọi hàm login từ AuthContext để cập nhật State toàn hệ thống
        login(user, accessToken, response.data.refreshToken || response.data.data?.refreshToken);

        // Phân quyền điều hướng dựa vào enum
        if (user.role === 'admin') {
          navigate('/admin');
        } else if (user.role === 'staff') {
          navigate('/tables'); 
        } else {
          navigate('/menu?type=take-away'); 
        }

      } catch (err) {
        console.log("Chi tiết gói tin lỗi đầy đủ từ Server:", err);
        if (err.response && err.response.data) {
          setError(err.response.data.message); 
        } else {
          setError('Đã xảy ra sự cố kết nối tới máy chủ POS.');
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-12">
      <div className="bg-white p-8 rounded-2xl shadow-md border border-gray-200 w-full max-w-sm space-y-5">
        
        <div className="text-center">
          <h2 className="text-xl font-black text-gray-800 uppercase tracking-wide">
            {isRegisterMode ? 'Đăng Ký Thành Viên' : 'Đăng Nhập Hệ Thống'}
          </h2>
          <p className="text-xs text-gray-400 mt-1">Hệ thống POS Tiệm Bánh & Nước</p>
        </div>
        
        {error && <div className="text-xs text-red-600 bg-red-50 p-3 rounded-xl font-medium border border-red-100">⚠️ {error}</div>}
        {success && <div className="text-xs text-green-600 bg-green-50 p-3 rounded-xl font-medium border border-green-100">✅ {success}</div>}
        
        <form onSubmit={handleAuthSubmit} noValidate className="space-y-3">
          {/* Trường Tên hiển thị (Chỉ xuất hiện khi chọn chế độ Đăng Ký) */}
          {isRegisterMode && (
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Họ và Tên</label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="Ví dụ: Lê Quốc Cường" 
                className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" 
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Địa chỉ Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="cuongle@example.com" 
              className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" 
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Mật khẩu</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••••" 
              className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" 
            />
          </div>

          {isRegisterMode && (
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Xác nhận mật khẩu</label>
              <input 
                type="password" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                placeholder="••••••••" 
                className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" 
              />
            </div>
          )}

          <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors shadow-sm">
            {isRegisterMode ? 'Tạo Tài Khoản Ngay' : 'Đăng Nhập'}
          </button>
        </form>

        <div className="text-center text-xs">
          <button 
            type="button" 
            onClick={() => { setIsRegisterMode(!isRegisterMode); setError(''); setSuccess(''); }}
            className="text-blue-600 font-bold hover:underline"
          >
            {isRegisterMode ? 'Đã có tài khoản? Đăng nhập ngay' : 'Chưa có tài khoản? Đăng ký tại đây'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
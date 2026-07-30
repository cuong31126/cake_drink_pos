import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { useAuth } from '../context/AuthContext'; 

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  
  const [name, setName] = useState(''); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAboutModal, setShowAboutModal] = useState(false);

  const STORE_LOGO = localStorage.getItem('customLogoUrl') || 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=160&auto=format&fit=crop&q=80';

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (isRegisterMode) {
      if (!name || !email || !password || !confirmPassword) {
        setError('Vui lòng điền đầy đủ tất cả các trường dữ liệu!');
        return;
      }
      if (password !== confirmPassword) {
        setError('Mật khẩu nhập lại không trùng khớp!');
        return;
      }

      try {
        const response = await API.post('/auth/register', { name, email, password });
        if (response.data.success) {
          setSuccess(`Tài khoản [${name}] đã được ghi nhận thành công!`);
          setIsRegisterMode(false);
          setPassword('');
          setConfirmPassword('');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Đăng ký thất bại. Email có thể đã tồn tại.');
      }

    } else {
      if (!email || !password) {
        setError('Vui lòng nhập đầy đủ Email và Mật khẩu đăng nhập!');
        return;
      }

      try {
        const response = await API.post('/auth/login', { email, password });
        const accessToken = response.data.accessToken || response.data.data?.accessToken;
        const user = response.data.user || response.data.data?.user;

        if (!accessToken) {
          setError("Lỗi cấu trúc dữ liệu xác thực từ Server.");
          return;
        }

        login(user, accessToken, response.data.refreshToken || response.data.data?.refreshToken);

        if (user.role === 'admin') navigate('/admin');
        else if (user.role === 'staff') navigate('/tables'); 
        else navigate('/menu?type=take-away'); 

      } catch (err) {
        if (err.response && err.response.data) setError(err.response.data.message); 
        else setError('Đã xảy ra sự cố kết nối tới máy chủ POS.');
      }
    }
  };

  // 🌐 Xử lý Đăng nhập Google Auth thật bằng Google Identity Services (GIS)
  // Không dùng Firebase — chỉ dùng script CDN accounts.google.com/gsi/client đã nhúng trong index.html
  const handleGoogleLogin = async () => {
    try {
      setError('');
      setSuccess('Đang mở cửa sổ xác thực Google...');

      const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
        setError('⚠️ Chưa cấu hình VITE_GOOGLE_CLIENT_ID trong file .env');
        setSuccess('');
        return;
      }

      // Chờ Google Identity Services script tải xong
      if (!window.google?.accounts?.id) {
        setError('Google Sign-In đang tải, vui lòng thử lại sau 2 giây.');
        setSuccess('');
        return;
      }

      // Hàm giải mã JWT credential từ Google để lấy thông tin user
      const decodeJwt = (token) => {
        try {
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(
            atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
          );
          return JSON.parse(jsonPayload);
        } catch (e) {
          return null;
        }
      };

      // Sử dụng Google Identity Services API để hiện popup đăng nhập
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          try {
            const payload = decodeJwt(response.credential);
            if (!payload || !payload.email) {
              setError('Không thể đọc thông tin từ Google. Vui lòng thử lại.');
              setSuccess('');
              return;
            }

            // Lấy thông tin thực tế từ Google Profile
            const googleEmail = payload.email;
            const googleName = payload.name || payload.given_name || googleEmail.split('@')[0];
            const googleId = payload.sub; // ID duy nhất của từng tài khoản Google

            setSuccess(`Xin chào ${googleName}! Đang đăng nhập...`);

            // Gửi đến Backend route POST /api/v1/auth/google (đã có sẵn)
            const res = await API.post('/auth/google', {
              email: googleEmail,
              name: googleName,
              googleId: googleId
            });

            const accessToken = res.data.accessToken || res.data.data?.accessToken;
            const user = res.data.user || res.data.data?.user;

            if (!accessToken || !user) {
              setError('Lỗi xác thực từ Server. Vui lòng thử lại.');
              setSuccess('');
              return;
            }

            login(user, accessToken, res.data.refreshToken || res.data.data?.refreshToken);

            if (user.role === 'admin') navigate('/admin');
            else if (user.role === 'staff') navigate('/tables');
            else navigate('/menu?type=take-away');

          } catch (err) {
            console.error('Lỗi Google Auth callback:', err);
            setError(err.response?.data?.message || 'Đăng nhập Google thất bại.');
            setSuccess('');
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true
      });

      // Hiển thị popup One Tap / chọn tài khoản Google
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // Fallback: Nếu One Tap bị chặn (ví dụ: browser policy), dùng OAuth2 popup thay thế
          const tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: 'email profile',
            callback: async (tokenResponse) => {
              try {
                // Lấy thông tin user từ Google UserInfo API
                const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                });
                const userInfo = await userInfoRes.json();

                const googleEmail = userInfo.email;
                const googleName = userInfo.name || userInfo.given_name || googleEmail.split('@')[0];
                const googleId = userInfo.sub;

                setSuccess(`Xin chào ${googleName}! Đang đăng nhập...`);

                const res = await API.post('/auth/google', {
                  email: googleEmail,
                  name: googleName,
                  googleId: googleId
                });

                const accessToken = res.data.accessToken || res.data.data?.accessToken;
                const user = res.data.user || res.data.data?.user;

                if (!accessToken || !user) {
                  setError('Lỗi xác thực từ Server.');
                  setSuccess('');
                  return;
                }

                login(user, accessToken, res.data.refreshToken || res.data.data?.refreshToken);

                if (user.role === 'admin') navigate('/admin');
                else if (user.role === 'staff') navigate('/tables');
                else navigate('/menu?type=take-away');

              } catch (err) {
                console.error('Lỗi OAuth2 fallback:', err);
                setError(err.response?.data?.message || 'Đăng nhập Google thất bại.');
                setSuccess('');
              }
            }
          });
          tokenClient.requestAccessToken();
        }
      });

    } catch (err) {
      console.error('Lỗi khởi tạo Google Login:', err);
      setError('Không thể khởi tạo đăng nhập Google. Kiểm tra lại cấu hình.');
      setSuccess('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Họa tiết trang trí nền */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl"></div>

      {/* 🏛️ KHUNG GIAO DIỆN CHÍNH SANH TRỌNG */}
      <div className="w-full max-w-4xl bg-slate-800/90 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2 backdrop-blur-md relative z-10">
        
        {/* CỘT TRÁI: BANNER THƯƠNG HIỆU TIỆM BÁNH */}
        <div className="relative hidden md:flex flex-col justify-between p-8 bg-gradient-to-br from-amber-900/60 via-slate-900/90 to-slate-950 text-white border-r border-slate-700/60">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <img 
                src={STORE_LOGO} 
                alt="Bakery Logo" 
                className="w-12 h-12 rounded-full object-cover border-2 border-amber-400 shadow-md"
              />
              <div>
                <h1 className="font-black text-amber-400 text-lg uppercase tracking-wider">SWEET BAKERY POS</h1>
                <p className="text-[11px] text-amber-200/80 font-medium">Bánh Tươi Mỗi Ngày • Cà Phê Chuẩn Vị</p>
              </div>
            </div>

            <div className="pt-6 space-y-3 text-xs text-slate-300">
              <div className="flex items-center space-x-2.5 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
                <span className="text-xl">🍰</span>
                <div>
                  <h4 className="font-bold text-amber-300">Thực Đơn Đa Dạng</h4>
                  <p className="text-[11px] text-slate-400">Bánh ngọt Pháp, Trà trái cây, Cà phê Muối</p>
                </div>
              </div>

              <div className="flex items-center space-x-2.5 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
                <span className="text-xl">⚡</span>
                <div>
                  <h4 className="font-bold text-amber-300">Đặt Món & Thanh Toán QR</h4>
                  <p className="text-[11px] text-slate-400">Trải nghiệm đặt món nhanh không chờ đợi</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800 flex justify-between items-center text-[11px] text-slate-400">
            <span>© 2026 Sweet Bakery POS</span>
            <button 
              onClick={() => setShowAboutModal(true)} 
              className="text-amber-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>ℹ️</span> Giới thiệu tiệm
            </button>
          </div>
        </div>

        {/* CỘT PHẢI: FORM ĐĂNG NHẬP / ĐĂNG KÝ */}
        <div className="p-8 flex flex-col justify-center space-y-5 bg-slate-900/40">
          
          <div className="text-center space-y-1">
            <div className="md:hidden flex justify-center mb-2">
              <img src={STORE_LOGO} alt="Logo" className="w-14 h-14 rounded-full object-cover border-2 border-amber-400 shadow-md" />
            </div>
            <h2 className="text-xl font-black text-white uppercase tracking-wide">
              {isRegisterMode ? 'Đăng Ký Thành Viên' : 'Đăng Nhập'}
            </h2>
            <p className="text-xs text-slate-400">Tiệm Bánh & Nước Uống POS</p>
          </div>

          {error && <div className="text-xs text-red-400 bg-red-950/60 p-3 rounded-xl font-medium border border-red-800/60">⚠️ {error}</div>}
          {success && <div className="text-xs text-emerald-400 bg-emerald-950/60 p-3 rounded-xl font-medium border border-emerald-800/60">✅ {success}</div>}

          {/* 🌐 NÚT ĐĂNG NHẬP VỚI GOOGLE */}
          {!isRegisterMode && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-800 font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center space-x-2.5 cursor-pointer border border-slate-200"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Đăng nhập với Google</span>
              </button>

              <div className="flex items-center space-x-2 text-[11px] text-slate-500 my-2">
                <div className="flex-1 h-px bg-slate-700"></div>
                <span>Hoặc đăng nhập bằng Email</span>
                <div className="flex-1 h-px bg-slate-700"></div>
              </div>
            </div>
          )}

          <form onSubmit={handleAuthSubmit} noValidate className="space-y-3">
            {isRegisterMode && (
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Họ và Tên</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="Ví dụ: Lê Quốc Cường" 
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors" 
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Địa chỉ Email</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="cuongle@example.com" 
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors" 
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Mật khẩu</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••" 
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors" 
              />
            </div>

            {isRegisterMode && (
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Xác nhận mật khẩu</label>
                <input 
                  type="password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  placeholder="••••••••" 
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors" 
                />
              </div>
            )}

            <button 
              type="submit" 
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md cursor-pointer"
            >
              {isRegisterMode ? '✨ Tạo Tài Khoản Ngay' : '🚪 Đăng Nhập'}
            </button>
          </form>

          <div className="text-center text-xs space-y-2 pt-2 border-t border-slate-800">
            <button 
              type="button" 
              onClick={() => { setIsRegisterMode(!isRegisterMode); setError(''); setSuccess(''); }}
              className="text-amber-400 font-bold hover:underline cursor-pointer"
            >
              {isRegisterMode ? 'Đã có tài khoản? Đăng nhập tại đây' : 'Chưa có tài khoản? Đăng ký mới ngay'}
            </button>

            <div className="md:hidden">
              <button 
                onClick={() => setShowAboutModal(true)} 
                className="text-slate-400 text-[11px] hover:text-amber-300 underline cursor-pointer"
              >
                ℹ️ Giới thiệu tiệm bánh Sweet POS
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ℹ️ MODAL GIỚI THIỆU SƠ CỬA HÀNG TIỆM BÁNH & NƯỚC */}
      {showAboutModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-lg w-full text-white shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <img src={STORE_LOGO} alt="Store" className="w-8 h-8 rounded-full object-cover border border-amber-400" />
                <h3 className="font-black text-amber-400 text-sm uppercase tracking-wide">GIỚI THIỆU SWEET BAKERY POS</h3>
              </div>
              <button onClick={() => setShowAboutModal(false)} className="text-slate-400 hover:text-white font-bold text-sm cursor-pointer">✕ Đóng</button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-slate-300 max-h-[60vh] overflow-y-auto pr-1">
              <p>
                🍰 <strong className="text-amber-300">Sweet Bakery POS</strong> là thương hiệu tiệm bánh ngọt & nước uống chuyên nghiệp với mong muốn mang đến những trải nghiệm ẩm thực tinh tế, nguyên liệu tươi mới 100% trong ngày.
              </p>
              
              <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700 space-y-1.5">
                <h4 className="font-bold text-amber-400">🌟 Món ăn & Nước uống Chuyên biệt:</h4>
                <ul className="list-disc pl-4 space-y-1 text-slate-300">
                  <li><strong>Bánh Ngọt Pháp:</strong> Tiramisu Cảo, Croissant Thụy Sĩ, Cake Matcha Phô mai.</li>
                  <li><strong>Thức Uống Chuẩn Vị:</strong> Trà Sữa Kem Trứng Nướng, Cà Phê Muối Cháy, Trà Trái Cây Tươi.</li>
                </ul>
              </div>

              <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700 space-y-1 text-slate-300">
                <h4 className="font-bold text-amber-400">🏪 Hệ thống Chi nhánh:</h4>
                <p>• <strong>Chi nhánh 1:</strong> 123 Đường Lê Lợi, Phường Bến Thành, Quận 1, TP.HCM</p>
                <p>• <strong>Chi nhánh 2:</strong> 456 Đường Võ Văn Ngân, Phường Linh Chiểu, TP. Thủ Đức, TP.HCM</p>
              </div>

              <div className="flex justify-between items-center pt-2 text-[11px] text-slate-400 border-t border-slate-800">
                <span>⏰ Giờ mở cửa: 07:00 - 22:30 hàng ngày</span>
                <span>☎️ Hotline: 1900 8888</span>
              </div>
            </div>

            <button
              onClick={() => setShowAboutModal(false)}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl transition-all shadow-md cursor-pointer text-center"
            >
              ✓ Đã hiểu, quay lại Đăng nhập
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
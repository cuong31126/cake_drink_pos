import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import StaffInventoryModal from './StaffInventoryModal';

const Topbar = ({ openChatModal, toggleCartDrawer }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isDarkMode, toggleDarkMode: toggleTheme } = useTheme();

  const [showOrderMenu, setShowOrderMenu] = useState(false);
  const dropdownRef = useRef(null);
  const [showStaffInventoryModal, setShowStaffInventoryModal] = useState(false);

  // States dành riêng cho Khách Hàng (User)
  const [showMyOrdersModal, setShowMyOrdersModal] = useState(false);
  const [myOrdersList, setMyOrdersList] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [showNotiModal, setShowNotiModal] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotiCount, setUnreadNotiCount] = useState(0);

  // 🖼️ State lưu trữ Logo góc phải (Cho phép đổi ảnh tùy ý)
  const DEFAULT_LOGO = 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=120&auto=format&fit=crop&q=80';
  const [logoUrl, setLogoUrl] = useState(localStorage.getItem('customLogoUrl') || DEFAULT_LOGO);
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [inputLogoUrl, setInputLogoUrl] = useState('');

  // Modal Giới thiệu Cửa hàng
  const [showAboutModal, setShowAboutModal] = useState(false);

  const handleSaveLogo = (newUrl) => {
    const finalUrl = newUrl.trim() || DEFAULT_LOGO;
    setLogoUrl(finalUrl);
    localStorage.setItem('customLogoUrl', finalUrl);
    setShowLogoModal(false);
  };

  const userRole = user?.role || localStorage.getItem('userRole') || 'guest';
  const rawName = user?.name || localStorage.getItem('username') || 'Chưa đăng nhập';
  const formatDisplayName = (name) => {
    if (!name || name === 'Chưa đăng nhập') return name;
    if (name.includes('@')) {
      const prefix = name.split('@')[0];
      const words = prefix.replace(/[\._\-]/g, ' ').replace(/\d+/g, ' ').trim();
      if (!words) return prefix;
      return words.split(' ').filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    }
    return name;
  };
  const staffName = formatDisplayName(rawName);
  const storeId = user?.store_id || localStorage.getItem('storeId') || '';

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowOrderMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Tải danh sách Thông báo của Khách hàng
  const fetchNotifications = async () => {
    if (userRole !== 'user') return;
    try {
      const res = await API.get('/notifications');
      if (res.data.success) {
        setNotifications(res.data.data);
        setUnreadNotiCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      console.error("Lỗi lấy thông báo:", err);
    }
  };

  // Tải danh sách Đơn hàng - có hiện loading (dùng khi user bấm mở modal)
  const fetchMyOrders = async () => {
    if (userRole !== 'user') return;
    try {
      setLoadingOrders(true);
      const res = await API.get('/orders');
      if (res.data.success) {
        setMyOrdersList(res.data.data);
      }
    } catch (err) {
      console.error("Lỗi lấy đơn hàng của tôi:", err);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Tải ngầm trong nền - không set loading, không gây nhấp nháy
  const silentFetchMyOrders = async () => {
    if (userRole !== 'user') return;
    try {
      const res = await API.get('/orders');
      if (res.data.success) {
        setMyOrdersList(prev => {
          // Chỉ cập nhật state nếu dữ liệu thực sự thay đổi
          const newStr = JSON.stringify(res.data.data.map(o => ({ id: o._id, status: o.status, payment_status: o.payment_status })));
          const prevStr = JSON.stringify(prev.map(o => ({ id: o._id, status: o.status, payment_status: o.payment_status })));
          return newStr !== prevStr ? res.data.data : prev;
        });
      }
    } catch (err) {
      // Im lặng khi polling thất bại - tránh spam console
    }
  };

  const silentFetchNotifications = async () => {
    if (userRole !== 'user') return;
    try {
      const res = await API.get('/notifications');
      if (res.data.success) {
        const newCount = res.data.unreadCount || 0;
        setUnreadNotiCount(prev => prev !== newCount ? newCount : prev);
        setNotifications(prev => {
          const newStr = JSON.stringify(res.data.data.map(n => ({ id: n._id, is_read: n.is_read })));
          const prevStr = JSON.stringify(prev.map(n => ({ id: n._id, is_read: n.is_read })));
          return newStr !== prevStr ? res.data.data : prev;
        });
      }
    } catch (err) {
      // Im lặng
    }
  };

  useEffect(() => {
    if (userRole === 'user') {
      // Lần đầu load
      fetchNotifications();
      fetchMyOrders();
      // Polling nền: 15 giây, không gây nhấp nháy
      const interval = setInterval(() => {
        silentFetchNotifications();
        silentFetchMyOrders();
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [userRole, user]);

  // Khách hàng tự hủy đơn khi đơn còn ở pending_confirm
  const handleUserCancelOrder = async (orderId) => {
    const confirmCancel = window.confirm(`Bạn có chắc chắn muốn hủy đơn hàng #${orderId.slice(-6).toUpperCase()}?`);
    if (!confirmCancel) return;

    try {
      const res = await API.post(`/orders/${orderId}/cancel`, { reason: 'Khách hàng tự hủy từ ứng dụng' });
      if (res.data.success) {
        alert("Đã hủy đơn hàng thành công!");
        fetchMyOrders();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Không thể hủy đơn hàng này.");
    }
  };

  // Đánh dấu đã đọc tất cả thông báo
  const handleMarkAllNotiRead = async () => {
    try {
      await API.patch('/notifications/read-all');
      setUnreadNotiCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error("Lỗi đánh dấu thông báo:", err);
    }
  };

  const getStoreName = (id, role) => {
    if (role === 'admin') return 'Hệ thống chuỗi (Tất cả)';
    if (id === 'store_Q1') return 'Chi nhánh Quận 1';
    if (id === 'store_ThuDuc') return 'Chi nhánh Thủ Đức';
    return id || 'Chưa phân chi nhánh';
  };

  return (
    <>
      {/* 🖥️ TOPBAR CHÍNH GỌN GÀNG VÀ CHUYÊN NGHIỆP */}
      <div className="h-16 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-6 flex items-center justify-between fixed top-0 left-0 right-0 z-50 font-sans shadow-2xs text-gray-800 dark:text-slate-100 transition-colors duration-300">
        {/* Góc trái: Vai trò, tên người dùng, chi nhánh */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-gray-400 dark:text-slate-400 text-xs uppercase font-bold">Vai trò:</span>
            <span className="font-mono bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded text-xs border border-blue-200 dark:border-blue-800 uppercase font-bold">
              {userRole}
            </span>
            <span className="font-semibold text-gray-800 dark:text-slate-100 text-sm">{staffName}</span>
          </div>

          <div className="h-4 w-px bg-gray-300 dark:bg-slate-700"></div>

          <button
            onClick={logout}
            className="text-xs font-bold text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 bg-red-50 dark:bg-red-950/60 hover:bg-red-100 dark:hover:bg-red-900/60 px-2.5 py-1 rounded-lg transition-colors border border-red-200 dark:border-red-800 cursor-pointer"
          >
            🚪 Đăng xuất
          </button>
        </div>


        {/* 👑 Nút vào trang Admin Dashboard (Chỉ Admin) */}
        {userRole === 'admin' && (
          <button
            onClick={() => navigate('/admin')}
            className="px-3 py-1.5 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-bold transition-all border border-purple-200 dark:border-purple-800 flex items-center space-x-1 cursor-pointer shadow-2xs"
          >
            <span>👑</span>
            <span>Admin Dashboard</span>
          </button>
        )}

        {/* Góc phải: Các nút quản trị / chat nhanh */}
        <div className="flex items-center space-x-3">
          {/* 📍 Nút sơ đồ phòng bàn (Cho Staff & Admin) */}
          {(userRole === 'admin' || userRole === 'staff') && (
            <button
              onClick={() => navigate('/tables')}
              className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-bold transition-all border border-emerald-200 dark:border-emerald-800 flex items-center space-x-1 cursor-pointer shadow-2xs"
            >
              <span>📍</span>
              <span>Sơ đồ bàn</span>
            </button>
          )}


          {/* 🛍️ Nút tạo nhanh đơn mang đi (Cho Staff & Admin) */}
          {(userRole === 'admin' || userRole === 'staff') && (
            <button
              onClick={() => navigate('/menu?type=take-away')}
              className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 rounded-lg text-xs font-bold transition-all border border-amber-200 dark:border-amber-800 flex items-center space-x-1 cursor-pointer shadow-2xs"
            >
              <span>🛍️</span>
              <span>Đặt mang đi</span>
            </button>
          )}

          {/* 📋 HÀNG ĐỢI PHỤC VỤ (Nút bấm trực tiếp 1 chạm cho Staff & Admin) */}
          {(userRole === 'admin' || userRole === 'staff') && (
            <button
              onClick={() => navigate('/queue')}
              className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold transition-all border border-blue-200 dark:border-blue-800 flex items-center space-x-1 cursor-pointer shadow-2xs"
            >
              <span>📋</span>
              <span>Hàng đợi phục vụ</span>
            </button>
          )}

          {/* 🧾 QUẢN LÝ HÓA ĐƠN (Nút bấm 1 chạm cho Staff & Admin) */}
          {(userRole === 'admin' || userRole === 'staff') && (
            <button
              onClick={() => navigate('/bills')}
              className="px-3 py-1.5 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-bold transition-all border border-purple-200 dark:border-purple-800 flex items-center space-x-1 cursor-pointer shadow-2xs"
            >
              <span>🧾</span>
              <span>Quản lý Hóa đơn</span>
            </button>
          )}

          {/* 📦 QUẢN LÝ TỒN KHO & NHẬP HÀNG CHI NHÁNH (Cho Staff & Admin) */}
          {(userRole === 'admin' || userRole === 'staff') && (
            <button
              onClick={() => setShowStaffInventoryModal(true)}
              className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-bold transition-all border border-emerald-200 dark:border-emerald-800 flex items-center space-x-1 cursor-pointer shadow-2xs"
            >
              <span>📦</span>
              <span>Tồn kho & Nhập hàng</span>
            </button>
          )}

          {/* 💬 Nút Tin nhắn */}
          <button
            onClick={openChatModal || (() => navigate('/chat'))}
            className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold transition-all border border-blue-200 dark:border-blue-800 flex items-center space-x-1 cursor-pointer shadow-2xs"
          >
            <span>💬</span>
            <span>Tin nhắn</span>
          </button>

          {/* 🌗 Nút Chế độ Sáng / Tối */}
          <button
            onClick={toggleTheme}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center space-x-1 cursor-pointer shadow-2xs ${
              isDarkMode 
                ? 'bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700' 
                : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
            }`}
            title="Chuyển đổi giao diện Sáng / Tối"
          >
            <span>{isDarkMode ? '☀️' : '🌙'}</span>
          </button>

          {/* 🖼️ LOGO GÓC PHẢI (NHẤN ĐỂ ĐỔI ẢNH TÙY Ý) */}
          <div className="h-6 w-px bg-gray-300 mx-0.5"></div>

          <button
            onClick={() => {
              setInputLogoUrl(logoUrl);
              setShowLogoModal(true);
            }}
            title="Nhấn để thay đổi Logo cửa hàng"
            className="group relative flex items-center justify-center p-0.5 rounded-full border-2 border-amber-400 hover:border-amber-500 transition-all cursor-pointer shadow-xs bg-amber-50 hover:scale-105"
          >
            <img
              src={logoUrl}
              alt="Store Logo"
              onError={(e) => { e.target.src = DEFAULT_LOGO; }}
              className="w-9 h-9 rounded-full object-cover"
            />
            <span className="absolute -bottom-1 -right-1 bg-amber-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-white shadow-xs group-hover:bg-amber-600">
              ✏️
            </span>
          </button>
        </div>
      </div>

      {/* 🟢 SUB-HEADER BAR BÊN DƯỚI TOPBAR DÀNH RIÊNG CHO KHÁCH HÀNG (USER) */}
      {userRole === 'user' && (
        <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white px-6 py-2.5 fixed top-16 left-0 right-0 z-40 flex items-center justify-between border-b border-gray-200 dark:border-slate-800 shadow-sm transition-colors duration-300">
          <div className="flex items-center space-x-2">
            <span className="text-amber-600 dark:text-amber-400 font-black text-xs uppercase tracking-wider">🍰 TIỆM BÁNH & NƯỚC UỐNG POS</span>
            <span className="text-[10px] bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 px-2 py-0.5 rounded-full border border-gray-200 dark:border-slate-700">Giao diện Khách hàng</span>
          </div>

          <div className="flex items-center space-x-3">
            {/* 🏪 CHỌN CHI NHÁNH CỬA HÀNG ĐẶT MÓN */}
            <div className="flex items-center space-x-1.5 text-xs bg-gray-100 dark:bg-slate-800 px-3 py-1 rounded-xl border border-gray-200 dark:border-slate-700">
              <span className="text-gray-500 dark:text-slate-400 font-bold">🏪 Đặt tại:</span>
              <select
                value={localStorage.getItem('storeId') || 'store_Q1'}
                onChange={(e) => {
                  localStorage.setItem('storeId', e.target.value);
                  window.location.href = '/menu?type=take-away&newOrder=true';
                }}
                className="bg-transparent text-amber-700 dark:text-amber-300 font-black text-xs focus:outline-none cursor-pointer"
              >
                <option value="store_Q1">Chi nhánh 1 - Quận 1</option>
                <option value="store_ThuDuc">Chi nhánh 2 - Thủ Đức</option>
              </select>
            </div>

            {/* 🍰 NÚT 1: ĐẶT THỰC ĐƠN MỚI */}
            <button
              onClick={() => {
                window.location.href = '/menu?type=take-away&newOrder=true';
              }}
              className="px-4 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center space-x-1.5 border border-amber-300/40"
            >
              <span>🍰</span>
              <span>+ Đặt thực đơn mới</span>
            </button>

            {/* 📦 NÚT 2: ĐƠN HÀNG CỦA TÔI */}
            <button
              onClick={() => {
                fetchMyOrders();
                setShowMyOrdersModal(true);
              }}
              className="px-3.5 py-1.5 bg-purple-50 dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-slate-700 text-purple-700 dark:text-purple-300 font-bold text-xs rounded-xl border border-purple-300 dark:border-purple-500/30 transition-all cursor-pointer flex items-center space-x-1.5 relative shadow-2xs"
            >
              <span>📦</span>
              <span>Đơn hàng của tôi</span>
              {myOrdersList.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length > 0 && (
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-ping absolute top-1 right-1"></span>
              )}
            </button>

            {/* 🔔 NÚT 3: THÔNG BÁO */}
            <button
              onClick={() => {
                fetchNotifications();
                setShowNotiModal(true);
              }}
              className="px-3.5 py-1.5 bg-amber-50 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-slate-700 text-amber-700 dark:text-amber-300 font-bold text-xs rounded-xl border border-amber-300 dark:border-amber-500/30 transition-all cursor-pointer flex items-center space-x-1.5 relative shadow-2xs"
            >
              <span>🔔</span>
              <span>Thông báo</span>
              {unreadNotiCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full ml-1">
                  {unreadNotiCount}
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 📦 MODAL ĐƠN HÀNG CỦA TÔI (DÀNH CHO KHÁCH HÀNG) */}
      {showMyOrdersModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex justify-end z-50">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 h-screen shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-200">
            {/* Header cố định */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
              <div className="flex justify-between items-center">
                <h2 className="font-black text-gray-800 dark:text-slate-100 text-base uppercase tracking-wide flex items-center gap-2">
                  <span>📦 ĐƠN HÀNG CỦA TÔI</span>
                  {myOrdersList.length > 0 && (
                    <span className="text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 px-2 py-0.5 rounded-full">
                      {myOrdersList.length} đơn
                    </span>
                  )}
                </h2>
                <button onClick={() => setShowMyOrdersModal(false)} className="text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 font-bold text-sm cursor-pointer transition-colors">✕ Đóng</button>
              </div>
              <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">Lịch sử đặt hàng & trạng thái xử lý</p>
            </div>

            {/* Nội dung cuộn được */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loadingOrders ? (
                <div className="text-center py-8 text-xs text-gray-400 dark:text-slate-500 font-medium animate-pulse">⏳ Đang tải danh sách đơn hàng...</div>
              ) : myOrdersList.length === 0 ? (
                <div className="text-center py-10 space-y-3">
                  <span className="text-5xl block">🍰</span>
                  <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Bạn chưa có đơn hàng nào. Hãy chọn món để đặt ngay nhé!</p>
                  <button
                    onClick={() => {
                      setShowMyOrdersModal(false);
                      navigate('/menu?type=take-away');
                    }}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs shadow-sm cursor-pointer transition-colors"
                  >
                    + Đặt thực đơn mới
                  </button>
                </div>
              ) : myOrdersList.map(order => (
                <div key={order._id} className="bg-gray-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-3 text-xs shadow-sm">
                  {/* Header đơn hàng */}
                  <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-700 pb-2.5">
                    <div>
                      <span className="font-black text-purple-700 dark:text-purple-400 text-sm">#{order._id.slice(-6).toUpperCase()}</span>
                      <div className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">{new Date(order.createdAt).toLocaleString('vi-VN')}</div>
                      {order.order_type && (
                        <div className="text-[10px] text-gray-400 dark:text-slate-500">
                          {order.order_type === 'dine-in' ? `🪑 Bàn ${order.table_id || ''}` : '🛵 Mang đi'}
                        </div>
                      )}
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      order.status === 'pending_confirm' ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700' :
                      order.status === 'serving' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700 animate-pulse' :
                      order.status === 'ready' ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700' :
                      order.status === 'completed' ? 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 border border-gray-300 dark:border-slate-600' :
                      'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-700'
                    }`}>
                      {order.status === 'pending_confirm' ? '🟡 Chờ tiếp nhận' :
                       order.status === 'serving' ? '🔵 Bếp đang chế biến' :
                       order.status === 'ready' ? '🟢 Sẵn sàng nhận món' :
                       order.status === 'completed' ? '✅ Đã hoàn tất' : '❌ Đã hủy'}
                    </span>
                  </div>

                  {/* Danh sách món */}
                  <div className="space-y-1.5">
                    {order.items.map((it, i) => (
                      <div key={i} className="flex justify-between items-start py-1 border-b border-slate-100 dark:border-slate-700/60 last:border-0">
                        <div className="flex-1">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{it.name}</span>
                          <span className="text-slate-500 dark:text-slate-400 ml-1">x{it.quantity}</span>
                          {it.selected_attributes && (
                            <div className="text-[10px] text-purple-600 dark:text-purple-400 font-bold mt-0.5">
                              Size: {it.selected_attributes.size || 'M'} | Đường: {it.selected_attributes.sugar || '100%'} | Đá: {it.selected_attributes.ice || '100%'}
                            </div>
                          )}
                        </div>
                        <span className="font-bold text-slate-900 dark:text-slate-100 ml-2">{(it.price * it.quantity).toLocaleString()}đ</span>
                      </div>
                    ))}
                  </div>

                  {/* Thông tin thanh toán */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1.5">
                    {order.customer_phone && (
                      <div className="flex justify-between text-[11px]">
                        <span className="text-gray-400 dark:text-slate-500">📞 SĐT:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">{order.customer_phone}</span>
                      </div>
                    )}
                    {order.delivery_address && (
                      <div className="flex justify-between text-[11px]">
                        <span className="text-gray-400 dark:text-slate-500">📍 Địa chỉ:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300 text-right max-w-[200px]">{order.delivery_address}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 dark:text-slate-400 font-bold">Tổng thanh toán:</span>
                      <span className="text-red-600 dark:text-red-400 text-sm font-black">{(order.final_total || 0).toLocaleString()}đ</span>
                    </div>
                    {order.payment_status && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 dark:text-slate-400 font-bold">Thanh toán:</span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          order.payment_status === 'paid' 
                            ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                            : 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                        }`}>
                          {order.payment_status === 'paid' ? '✅ Đã thanh toán' : '⏳ Chưa thanh toán'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="pt-1">
                    {order.status === 'pending_confirm' ? (
                      <button
                        onClick={() => handleUserCancelOrder(order._id)}
                        className="w-full py-2 bg-red-50 dark:bg-red-950/60 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 font-bold rounded-xl text-xs border border-red-200 dark:border-red-800 transition-colors cursor-pointer text-center"
                      >
                        ⚠️ Hủy đơn hàng này
                      </button>
                    ) : order.status === 'serving' || order.status === 'ready' ? (
                      <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-2.5 rounded-xl text-[11px] text-amber-800 dark:text-amber-300 space-y-1">
                        <p className="font-bold">🔒 Bếp đang làm món, không thể tự hủy</p>
                        <p className="text-[10px] text-amber-700 dark:text-amber-400">Vui lòng nhắn tin Nhân viên để được hỗ trợ hủy đơn</p>
                        <button
                          onClick={() => {
                            setShowMyOrdersModal(false);
                            navigate('/chat');
                          }}
                          className="w-full mt-1.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[10px] transition-colors cursor-pointer shadow-sm"
                        >
                          💬 Nhắn tin nhân viên quầy
                        </button>
                      </div>
                    ) : order.status === 'completed' ? (
                      <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-2.5 rounded-xl text-[11px] text-emerald-800 dark:text-emerald-300 text-center">
                        ✅ Đơn hàng đã hoàn tất – Cảm ơn bạn đã ủng hộ tiệm!
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer cố định */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
              <button
                onClick={() => {
                  setShowMyOrdersModal(false);
                  navigate('/menu?type=take-away&newOrder=true');
                }}
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                🍰 + Đặt thực đơn mới
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔔 MODAL THÔNG BÁO HỆ THỐNG & ĐƠN HÀNG (DÀNH CHO KHÁCH HÀNG) */}
      {showNotiModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex justify-end z-50">
          <div className="w-full max-w-md bg-white h-screen shadow-2xl p-6 flex flex-col justify-between overflow-y-auto border-l animate-in slide-in-from-right duration-200">
            <div>
              <div className="flex justify-between items-center border-b pb-4 mb-4">
                <div className="flex items-center space-x-2">
                  <h2 className="font-black text-gray-800 text-base uppercase tracking-wide">🔔 THÔNG BÁO CỦA BẠN</h2>
                  {unreadNotiCount > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                      {unreadNotiCount} mới
                    </span>
                  )}
                </div>
                <button onClick={() => setShowNotiModal(false)} className="text-gray-400 hover:text-gray-600 font-bold text-sm cursor-pointer">✕ Đóng</button>
              </div>

              {unreadNotiCount > 0 && (
                <button
                  onClick={handleMarkAllNotiRead}
                  className="w-full mb-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer text-center"
                >
                  ✓ Đánh dấu tất cả là đã đọc
                </button>
              )}

              <div className="space-y-3">
                {notifications.length === 0 ? (
                  <div className="text-center py-10 text-xs text-gray-400 font-medium">Bạn chưa có thông báo mới nào.</div>
                ) : notifications.map(noti => (
                  <div
                    key={noti._id}
                    className={`p-4 rounded-2xl border transition-all space-y-1 text-xs ${noti.is_read ? 'bg-white border-slate-200 opacity-75' : 'bg-amber-50/70 border-amber-300 shadow-2xs'
                      }`}
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="font-black text-slate-900 text-xs">{noti.title}</h4>
                      <span className="text-[9px] text-gray-400">{new Date(noti.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">{noti.message}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🖼️ MODAL ĐỔI LOGO CỬA HÀNG TÙY Ý */}
      {showLogoModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm uppercase tracking-wide flex items-center gap-2">
                <span>🖼️ TÙY CHỈNH LOGO GÓC PHẢI</span>
              </h3>
              <button 
                onClick={() => setShowLogoModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-sm cursor-pointer"
              >
                ✕ Đóng
              </button>
            </div>

            {/* Xem trước Logo hiện tại */}
            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <img
                src={inputLogoUrl || DEFAULT_LOGO}
                alt="Logo Preview"
                onError={(e) => { e.target.src = DEFAULT_LOGO; }}
                className="w-20 h-20 rounded-full object-cover border-4 border-amber-400 shadow-md"
              />
              <span className="text-[11px] font-semibold text-slate-500">Hình ảnh xem trước</span>
            </div>

            {/* Ô nhập đường dẫn ảnh URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Dán link ảnh Logo mới (URL):</label>
              <input
                type="text"
                value={inputLogoUrl}
                onChange={(e) => setInputLogoUrl(e.target.value)}
                placeholder="https://domain.com/path-to-image.png"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-slate-800"
              />
            </div>

            {/* Gợi ý một số Logo mẫu sẵn có */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-500 block">Hoặc chọn nhanh Logo mẫu:</span>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { name: 'Bánh Ngọt', url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=120&auto=format&fit=crop&q=80' },
                  { name: 'Cà Phê', url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=120&auto=format&fit=crop&q=80' },
                  { name: 'Trà Sữa', url: 'https://images.unsplash.com/photo-1558857563-b371033873b8?w=120&auto=format&fit=crop&q=80' },
                  { name: 'Món Ăn', url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=120&auto=format&fit=crop&q=80' }
                ].map((sample, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInputLogoUrl(sample.url)}
                    className="p-1.5 border border-slate-200 hover:border-amber-500 rounded-xl bg-slate-50 hover:bg-amber-50 text-center transition-all cursor-pointer flex flex-col items-center space-y-1"
                  >
                    <img src={sample.url} alt={sample.name} className="w-8 h-8 rounded-full object-cover" />
                    <span className="text-[9px] font-bold text-slate-600 truncate w-full">{sample.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Các nút hành động */}
            <div className="flex space-x-2 pt-2 border-t">
              <button
                onClick={() => handleSaveLogo(DEFAULT_LOGO)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                🔄 Khôi phục mặc định
              </button>
              <button
                onClick={() => handleSaveLogo(inputLogoUrl)}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-md"
              >
                💾 Lưu Logo mới
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📦 MODAL QUẢN LÝ TỒN KHO & NHẬP HÀNG CHI NHÁNH DÀNH CHO STAFF & ADMIN */}
      <StaffInventoryModal
        isOpen={showStaffInventoryModal}
        onClose={() => setShowStaffInventoryModal(false)}
        user={user}
      />

    </>
  );
};

export default Topbar;
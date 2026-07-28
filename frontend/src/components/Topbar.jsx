import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Topbar = ({ openChatModal }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Đọc động dữ liệu từ Context (hoặc localStorage dự phòng)
  const staffName = user?.name || localStorage.getItem('username') || 'Chưa đăng nhập';
  const userRole = user?.role || localStorage.getItem('userRole') || 'guest';
  const shiftCode = localStorage.getItem('shiftCode') || 'SHIFT_ACTIVE_2026';
  const storeId = user?.store_id || localStorage.getItem('storeId') || '';

  // 💡 GIẢI THÍCH CHO NGƯỜI MỚI HỌC:
  // Hàm chuyển đổi mã chi nhánh (ví dụ: store_Q1) thành tên dễ đọc tiếng Việt.
  // Nếu là Admin thì có quyền quản trị tất cả các chi nhánh nên sẽ hiển thị "Tất cả".
  const getStoreName = (id, role) => {
    if (role === 'admin') return 'Hệ thống chuỗi (Tất cả)';
    if (id === 'store_Q1') return 'Chi nhánh Quận 1';
    if (id === 'store_ThuDuc') return 'Chi nhánh Thủ Đức';
    return id || 'Chưa phân chi nhánh';
  };

  const handleLogoutAction = () => {
    logout();
  };

  return (
    <div className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between fixed top-0 left-0 right-0 z-50">
      {/* Góc trái: Thông tin nhân viên, vai trò, chi nhánh */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <span className="text-gray-400 text-xs uppercase font-bold">Vai trò:</span>
          <span className="font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs border border-blue-200 uppercase font-bold">
            {userRole}
          </span>
          <span className="font-semibold text-gray-800 text-sm">{staffName}</span>
        </div>
        
        {/* Phân tách */}
        <div className="h-4 w-px bg-gray-300"></div>

        {/* 🏢 THÀNH PHẦN MỚI: Hiển thị tên Chi nhánh trực ca của nhân viên */}
        <div className="flex items-center space-x-1 text-xs">
          <span className="text-gray-400 uppercase font-bold">Chi nhánh:</span>
          <span className="font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
            {getStoreName(storeId, userRole)}
          </span>
        </div>
        
        <div className="h-4 w-px bg-gray-300"></div>
        
        {/* Nút Đăng xuất */}
        <button 
          onClick={handleLogoutAction}
          className="text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-lg transition-colors border border-red-200"
        >
          🚪 Đăng xuất
        </button>
      </div>

      {/* Góc phải: Các nút tính năng như đồng bộ két, quản lý hóa đơn, chat */}
      <div className="flex items-center space-x-3">
        {/* 📍 THÀNH PHẦN MỚI: Nút chuyển hướng qua sơ đồ phòng bàn (Chỉ cho phép staff & admin nhìn thấy) */}
        {(userRole === 'admin' || userRole === 'staff') && (
          <button 
            onClick={() => navigate('/tables')}
            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition-all border border-emerald-200 flex items-center space-x-1 cursor-pointer shadow-2xs"
          >
            <span>📍</span>
            <span>Sơ đồ bàn</span>
          </button>
        )}

        {/* 🛍️ THÀNH PHẦN MỚI: Nút tạo nhanh đơn mang đi tại quầy (Chỉ cho phép staff & admin nhìn thấy) */}
        {(userRole === 'admin' || userRole === 'staff') && (
          <button 
            onClick={() => navigate('/menu?type=take-away')}
            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-xs font-bold transition-all border border-amber-200 flex items-center space-x-1 cursor-pointer shadow-2xs"
          >
            <span>🛍️</span>
            <span>Đặt mang đi</span>
          </button>
        )}

        {/* 🧾 THÀNH PHẦN MỚI: Nút chuyển hướng qua quản lý hóa đơn (Chỉ cho phép staff & admin nhìn thấy) */}
        {(userRole === 'admin' || userRole === 'staff') && (
          <button 
            onClick={() => navigate('/bills')}
            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-all border border-blue-200 flex items-center space-x-1 cursor-pointer shadow-2xs"
          >
            <span>🧾</span>
            <span>Quản lý Hóa đơn</span>
          </button>
        )}

        <button className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm font-medium transition-colors">
          🔄 Đồng bộ két
        </button>
        <button 
          onClick={openChatModal}
          className="relative p-2 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors flex items-center"
        >
          <span className="mr-1">💬</span>
          <span className="text-sm font-medium hidden md:inline">Tin nhắn</span>
        </button>
      </div>
    </div>
  );
};

export default Topbar;
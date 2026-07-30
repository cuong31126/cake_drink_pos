import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api'; // Trình kết nối API dùng chung đã cấu hình Axios Interceptor
import { useAuth } from '../context/AuthContext'; // Sử dụng Context xác thực toàn cục

const TableMap = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth(); // Lấy thông tin tài khoản đăng nhập hiện tại
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(''); // State lưu trữ thông báo lỗi để hiển thị lên màn hình

  // 💡 GIẢI THÍCH CHO NGƯỜI MỚI HỌC:
  // Lấy chi nhánh mặc định. Nếu là tài khoản Admin (store_id trong DB là null), ta mặc định lấy 'store_Q1'.
  const defaultStore = user?.store_id || localStorage.getItem('storeId') || "store_Q1"; 
  
  // State quản lý chi nhánh đang xem hiện tại (Đặc biệt giúp Admin chuyển đổi qua lại giữa các cửa hàng)
  const [selectedStoreId, setSelectedStoreId] = useState(defaultStore);
  const userRole = user?.role || localStorage.getItem('userRole');

  useEffect(() => {
    // 🔒 KIỂM TRA PHÂN QUYỀN TRÊN FRONTEND (Bảo vệ tuyến đường /tables):
    
    // 1. Chờ cho tới khi hệ thống Auth xác định được người dùng đã đăng nhập hay chưa
    if (authLoading) return;

    // 2. Nếu chưa đăng nhập (không có token), chuyển hướng ngay lập tức về trang đăng nhập
    if (!user && !localStorage.getItem('accessToken')) {
      navigate('/login');
      return;
    }

    // 3. Nếu tài khoản đăng nhập là Khách hàng (role: 'user'), họ được định hướng sang Menu đặt hàng
    if (userRole === 'user') {
      navigate('/menu?type=take-away', { replace: true });
      return;
    }

    // 4. Nếu hợp lệ (staff hoặc admin), thực hiện tải sơ đồ bàn ăn cho chi nhánh được chọn
    fetchTables(selectedStoreId);
  }, [authLoading, user, userRole, selectedStoreId]);

  // Hàm tải dữ liệu sơ đồ bàn từ Backend theo storeId cụ thể
  const fetchTables = async (storeIdToFetch) => {
    try {
      setLoading(true);
      setErrorMsg(''); // Xóa lỗi cũ nếu có
      
      // Gọi API lấy sơ đồ bàn theo store_id
      const res = await API.get(`/stores/${storeIdToFetch}/tables`);
      if (res.data.success) {
        setTables(res.data.data);
      }
    } catch (err) {
      console.error("Lỗi tải sơ đồ phòng bàn:", err);
      setErrorMsg(err.response?.data?.message || "Không có quyền truy cập hoặc lỗi kết nối máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  const handleTableClick = async (table) => {
    const targetTableId = table._id || table.id;

    // 1. NẾU BÀN ĐANG CÓ KHÁCH (OCCUPIED): Chuyển thẳng sang trang Order Menu kèm theo thông tin đơn hiện tại
    if (table.status === 'occupied' && table.current_order_id) {
      navigate(`/menu?type=dine-in&tableId=${targetTableId}&orderId=${table.current_order_id}`);
      return;
    }

    // 2. NẾU BÀN TRỐNG (AVAILABLE): Mở bàn ăn và khởi tạo đơn hàng ngay lập tức
    try {
      const res = await API.post('/orders/dine-in', {
        table_id: targetTableId,
        tableId: targetTableId,
        store_id: selectedStoreId,
        storeId: selectedStoreId,
        order_type: 'dine-in'
      });

      if (res.data.success) {
        const newOrderId = res.data.data._id || res.data.data.id;
        navigate(`/menu?type=dine-in&tableId=${targetTableId}&orderId=${newOrderId}`);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Không thể khởi tạo hóa đơn tại bàn này.");
    }
  }; 

  // 🔄 TRẠNG THÁI LOADING: Đang chờ tải dữ liệu người dùng hoặc sơ đồ bàn
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-sm font-bold text-gray-400 uppercase tracking-wider animate-pulse">
            ⏳ Đang tải sơ đồ phòng bàn...
          </div>
        </div>
      </div>
    );
  }

  // ⚠️ TRẠNG THÁI LỖI: Giao diện khi tải dữ liệu thất bại (lỗi 403 hoặc lỗi mạng)
  if (errorMsg) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center space-y-4">
          <div className="text-red-500 text-5xl">⚠️</div>
          <h2 className="text-lg font-black text-gray-800 uppercase">Lỗi truy cập sơ đồ</h2>
          <p className="text-sm text-gray-500">{errorMsg}</p>
          <div className="flex space-x-3 pt-2">
            <button 
              onClick={() => navigate('/login')}
              className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-colors border border-gray-200"
            >
              Đổi tài khoản
            </button>
            <button 
              onClick={() => fetchTables(selectedStoreId)}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm"
            >
              Thử lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Chuyển đổi tên hiển thị chi nhánh dễ đọc cho Admin
  const getFriendlyStoreLabel = (id) => {
    if (id === 'store_Q1') return 'Quận 1';
    if (id === 'store_ThuDuc') return 'Thủ Đức';
    return id;
  };

  return (
    <div className="min-h-screen transition-colors duration-300 bg-gray-50 dark:bg-slate-950 text-gray-800 dark:text-slate-100 p-6 pt-24 animate-in fade-in duration-300">
      {/* Thanh Header Tiêu đề Sơ đồ Bàn */}
      <div className="max-w-7xl mx-auto flex justify-between items-center border-b border-gray-200 dark:border-slate-800 pb-4 mb-6">
        <div>
          <h1 className="text-xl font-black text-gray-800 dark:text-slate-100 uppercase tracking-wide">Sơ đồ phòng bàn</h1>
          
          {/* 🏢 CHỨC NĂNG MỚI DÀNH CHO ADMIN: Dropdown chuyển đổi chi nhánh trực tiếp trên sơ đồ */}
          {userRole === 'admin' ? (
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-xs text-gray-400 dark:text-slate-400 font-bold">Xem chi nhánh:</span>
              <select
                value={selectedStoreId}
                onChange={(e) => {
                  setSelectedStoreId(e.target.value);
                  localStorage.setItem('storeId', e.target.value); // Lưu lại chi nhánh đang chọn vào máy để đồng bộ
                }}
                className="text-xs font-black text-blue-700 dark:text-blue-400 bg-white dark:bg-slate-800 border border-blue-200 dark:border-slate-700 rounded-lg px-2 py-1 focus:outline-none cursor-pointer hover:bg-blue-50/50 dark:hover:bg-slate-700 transition-colors shadow-2xs"
              >
                <option value="store_Q1">Chi nhánh Quận 1</option>
                <option value="store_ThuDuc">Chi nhánh Thủ Đức</option>
              </select>
            </div>
          ) : (
            <p className="text-xs text-gray-400 dark:text-slate-400">
              Chi nhánh quản lý: <span className="font-bold text-blue-600 dark:text-blue-400 uppercase">{getFriendlyStoreLabel(selectedStoreId)}</span>
            </p>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => fetchTables(selectedStoreId)} 
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer"
          >
            🔄 Tải lại sơ đồ
          </button>
        </div>
      </div>

      {/* Grid hiển thị danh sách các bàn dưới dạng khối màu POS */}
      <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
        {tables.map(table => (
          <button
            key={table._id}
            onClick={() => handleTableClick(table)}
            className={`p-6 rounded-2xl border text-center font-black text-sm tracking-wide shadow-2xs transition-all active:scale-95 duration-150 flex flex-col items-center justify-center space-y-1 ${
              table.status === 'occupied'
                ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50 hover:bg-red-100/70 dark:hover:bg-red-900/60'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/60'
            }`}
          >
            <span className="text-base">{table.table_number}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
              {table.status === 'occupied' ? 'Đang có khách' : 'Bàn trống'}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default TableMap;
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';

const BillManagement = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBill, setSelectedBill] = useState(null);
  
  const userRole = user?.role || localStorage.getItem('userRole'); // 'admin' hoặc 'staff'
  const currentStoreId = user?.store_id || localStorage.getItem('storeId') || 'store_Q1'; 

  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [storeFilter, setStoreFilter] = useState('all');

  useEffect(() => {
    fetchBills();
  }, [statusFilter, paymentFilter, storeFilter]);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const response = await API.get('/orders');

      if (response.data.success) {
        let data = response.data.data;
        
        // 💡 Lọc bỏ các hóa đơn nháp rỗng (không có món ăn nào)
        data = data.filter(bill => bill.items && bill.items.length > 0);

        // 🔒 PHÂN QUYỀN NGIÊM NGẶT: Staff CHỈ ĐƯỢC XEM hóa đơn tại chi nhánh mình đang làm việc
        if (userRole === 'staff') {
          data = data.filter(bill => (bill.store_id || 'store_Q1') === currentStoreId);
        } else if (userRole === 'admin' && storeFilter !== 'all') {
          data = data.filter(bill => (bill.store_id || 'store_Q1') === storeFilter);
        }

        if (statusFilter !== 'all') data = data.filter(b => b.status === statusFilter);
        if (paymentFilter !== 'all') data = data.filter(b => b.payment_status === paymentFilter);

        setBills(data);
      }
    } catch (err) {
      console.error("Lỗi lấy danh sách hóa đơn:", err);
    } finally {
      setLoading(false);
    }
  };

  // 💡 CHỨC NĂNG XÓA ĐƠN VĨNH VIỄN (DÀNH RIÊNG CHO ADMIN)
  const handleDeleteOrder = async (orderId) => {
    const confirmDelete = window.confirm(
      `⚠️ BẠN DÙNG QUYỀN ADMIN XÁC NHẬN XÓA?\nHóa đơn #${orderId.slice(-6).toUpperCase()} sẽ bị xóa vĩnh viễn khỏi MongoDB Atlas và không thể khôi phục!`
    );
    if (!confirmDelete) return;

    try {
      const response = await API.delete(`/orders/${orderId}`);
      if (response.data.success) {
        alert(response.data.message || "Đã xóa đơn hàng vĩnh viễn!");
        setBills(prev => prev.filter(b => b._id !== orderId));
        if (selectedBill?._id === orderId) setSelectedBill(null);
        fetchBills();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Không thể xóa đơn hàng này.");
    }
  };

  return (
    <div className="min-h-screen transition-colors duration-300 bg-gray-50 dark:bg-slate-950 text-gray-800 dark:text-slate-100 pt-16 font-sans">
      
      {/* 🧭 THANH HEADER TRÊN CÙNG (TOPBAR LOCAL) */}
      <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between shadow-2xs">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-gray-600 dark:text-slate-300 flex items-center justify-center border border-gray-200 dark:border-slate-700 cursor-pointer"
            title="Quay lại trang trước"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-black text-gray-800 dark:text-slate-100 uppercase tracking-wide">Quản Lý Hóa Đơn (Bills)</h1>
            <p className="text-[11px] text-gray-400 dark:text-slate-400 font-medium">
              Vai trò: <span className="font-bold text-blue-600 dark:text-blue-400 uppercase">{userRole}</span> 
              {userRole === 'staff' && ` | Đang giới hạn chỉ xem hóa đơn chi nhánh: ${currentStoreId === 'store_ThuDuc' ? 'Chi nhánh Thủ Đức' : 'Chi nhánh Quận 1'}`}
            </p>
          </div>
        </div>
        
        <button 
          onClick={fetchBills} 
          className="px-4 py-2 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-700 dark:text-slate-200 shadow-2xs active:scale-95 transition-all cursor-pointer"
        >
          🔄 Làm mới danh sách
        </button>
      </header>

      {/* 🎛️ NỘI DUNG CHÍNH (MAIN CONTENT) */}
      <main className="p-6 max-w-7xl mx-auto space-y-6">
        
        {/* THANH BỘ LỌC (FILTERS) */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xs border border-gray-200 dark:border-slate-800 flex flex-wrap gap-4 items-center">
          {/* BỘ LỌC CHI NHÁNH DÀNH RIÊNG CHO ADMIN */}
          {userRole === 'admin' && (
            <div>
              <label className="block text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase mb-1">🏢 Bộ lọc Chi nhánh (Admin)</label>
              <select 
                value={storeFilter} 
                onChange={(e) => setStoreFilter(e.target.value)} 
                className="border border-purple-200 dark:border-purple-800 rounded-xl text-xs px-3 py-2 bg-purple-50/50 dark:bg-slate-800 focus:outline-none font-bold text-purple-700 dark:text-purple-300 cursor-pointer"
              >
                <option value="all">Tất cả chi nhánh</option>
                <option value="store_Q1">Chi nhánh 1 (Quận 1)</option>
                <option value="store_ThuDuc">Chi nhánh 2 (Thủ Đức)</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase mb-1">Trạng thái Đơn</label>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)} 
              className="border border-gray-200 dark:border-slate-700 rounded-xl text-xs px-3 py-2 bg-gray-50 dark:bg-slate-800 focus:outline-none font-bold text-gray-700 dark:text-slate-200 cursor-pointer"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="serving">Đang phục vụ (Serving)</option>
              <option value="ready">Chờ trả đơn (Ready)</option>
              <option value="completed">Đã hoàn thành (Completed)</option>
              <option value="cancelled">Đã hủy đơn (Cancelled)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase mb-1">Đối soát Thanh toán</label>
            <select 
              value={paymentFilter} 
              onChange={(e) => setPaymentFilter(e.target.value)} 
              className="border border-gray-200 dark:border-slate-700 rounded-xl text-xs px-3 py-2 bg-gray-50 dark:bg-slate-800 focus:outline-none font-bold text-gray-700 dark:text-slate-200 cursor-pointer"
            >
              <option value="all">Tất cả hóa đơn</option>
              <option value="paid">Đã thu tiền (Paid)</option>
              <option value="unpaid">Chưa thu tiền (Unpaid)</option>
            </select>
          </div>
        </div>

        {/* BẢNG BÁO CÁO HÓA ĐƠN */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-gray-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-800 text-gray-400 dark:text-slate-400 font-bold text-[11px] uppercase tracking-wider border-b border-gray-200 dark:border-slate-700">
                  <th className="p-4">Mã Đơn</th>
                  <th className="p-4">Chi Nhánh</th>
                  <th className="p-4">Vị Trí</th>
                  <th className="p-4">Hình Thức</th>
                  <th className="p-4">Doanh Thu</th>
                  <th className="p-4">Thanh Toán</th>
                  <th className="p-4">Vận Hành</th>
                  <th className="p-4 text-center">Hành Động</th>
                </tr>
              </thead>
              <tbody className="text-xs font-medium text-gray-600 dark:text-slate-300 divide-y divide-gray-100 dark:divide-slate-800">
                {loading ? (
                  <tr><td colSpan="8" className="p-8 text-center text-gray-400 dark:text-slate-500 font-bold">Đang tải đồng bộ hóa đơn từ Server...</td></tr>
                ) : bills.length === 0 ? (
                  <tr><td colSpan="8" className="p-8 text-center text-gray-400 dark:text-slate-500 font-bold">Không tìm thấy dữ liệu hóa đơn phù hợp.</td></tr>
                ) : bills.map((bill) => (
                  <tr key={bill._id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-4 font-bold text-gray-900 dark:text-slate-100">
                      #{String(bill._id || bill.id || 'UNKNOWN').slice(-6).toUpperCase()}
                    </td>
                    <td className="p-4 text-gray-500 dark:text-slate-400">{bill.store_id}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 rounded-md font-bold text-[11px]">
                        {bill.table_id ? `Bàn ${bill.table_id}` : 'Mang đi'}
                      </span>
                    </td>
                    <td className="p-4 capitalize text-gray-700 dark:text-slate-300">{bill.order_type}</td>
                    <td className="p-4 font-black text-blue-600 dark:text-blue-400">{bill.final_total.toLocaleString()}đ</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${bill.payment_status === 'paid' ? 'bg-green-50 dark:bg-emerald-950/60 text-green-600 dark:text-emerald-300 border-green-100 dark:border-emerald-800' : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-300 border-amber-100 dark:border-amber-800'}`}>
                        {bill.payment_status === 'paid' ? 'Đã thu tiền' : 'Chưa thu tiền'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${bill.status === 'completed' ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300' : bill.status === 'cancelled' ? 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-300' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400'}`}>
                        {bill.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button 
                          onClick={() => setSelectedBill(bill)} 
                          className="px-3 py-1 bg-gray-900 dark:bg-slate-700 hover:bg-gray-800 dark:hover:bg-slate-600 text-white rounded-lg font-bold shadow-2xs transition-all active:scale-95 cursor-pointer"
                        >
                          Chi Tiết
                        </button>

                        {/* 🔴 CHỨC NĂNG XÓA ĐƠN HÀNG DÀNH RIÊNG CHO ADMIN */}
                        {userRole === 'admin' && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteOrder(bill._id);
                            }} 
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-2xs transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                            title="Xóa vĩnh viễn hóa đơn"
                          >
                            <span>🗑️ Xóa</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* 📑 DETAILS SLIDE-OVER MODAL */}
      {selectedBill && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex justify-end z-50">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 h-screen shadow-2xl p-6 flex flex-col justify-between overflow-y-auto border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-200">
            <div>
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-4 mb-4">
                <h2 className="font-black text-gray-800 dark:text-slate-100 text-base uppercase tracking-wide">Chi Tiết Đơn Hàng</h2>
                <button onClick={() => setSelectedBill(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 font-bold text-sm cursor-pointer">✕ Đóng</button>
              </div>

              <div className="space-y-1.5 text-xs text-gray-500 dark:text-slate-400 mb-6 bg-gray-50 dark:bg-slate-800 p-3 rounded-xl border border-gray-100 dark:border-slate-700">
                <div><span className="font-bold text-gray-700 dark:text-slate-200">Mã đơn:</span> #{selectedBill._id}</div>
                <div><span className="font-bold text-gray-700 dark:text-slate-200">Người đặt / Lập đơn:</span> {selectedBill.created_by || 'Khách hàng'}</div>
                <div><span className="font-bold text-gray-700 dark:text-slate-200">Thời gian tạo:</span> {new Date(selectedBill.createdAt).toLocaleString('vi-VN')}</div>
                <div><span className="font-bold text-gray-700 dark:text-slate-200">Phương thức thanh toán:</span> <span className="font-bold text-purple-600 dark:text-purple-400 uppercase">{selectedBill.payment_method || 'Không xác định'}</span></div>
                {selectedBill.delivery_address && (
                  <div className="text-amber-800 dark:text-amber-300 font-bold border-t border-amber-200/50 pt-1 mt-1">
                    🏠 Địa chỉ giao hàng: <span className="font-normal">{selectedBill.delivery_address}</span>
                  </div>
                )}
              </div>

              <h3 className="font-bold text-xs text-gray-400 dark:text-slate-400 uppercase mb-2 tracking-wider">Danh sách món ăn</h3>
              <div className="space-y-2 mb-6">
                {selectedBill.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs bg-white dark:bg-slate-800/80 border border-gray-100 dark:border-slate-700 p-3 rounded-xl">
                    <div>
                      <div className="font-bold text-gray-800 dark:text-slate-100">{item.name}</div>
                      <div className="text-[10px] text-gray-400 dark:text-slate-400">Đơn giá: {item.price.toLocaleString()}đ</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-700 dark:text-slate-300">x{item.quantity}</div>
                      <div className="font-black text-blue-600 dark:text-blue-400">{(item.price * item.quantity).toLocaleString()}đ</div>
                    </div>
                  </div>
                ))}
              </div>

              {selectedBill.cancelled_items && selectedBill.cancelled_items.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-bold text-xs text-red-600 uppercase mb-2 tracking-wider flex items-center gap-1">
                    ⚠️ Nhật ký xóa/hủy món đối soát
                  </h3>
                  <div className="space-y-2 border-l-2 border-red-200 pl-3">
                    {selectedBill.cancelled_items.map((cItem, idx) => (
                      <div key={idx} className="bg-red-50/40 border border-red-100 p-2.5 rounded-xl text-[11px]">
                        <div className="font-bold text-red-800">{cItem.name} <span className="text-gray-500 font-normal">(Giảm x{cItem.quantity})</span></div>
                        <div className="text-gray-500 mt-0.5"><span className="font-bold">Lý do:</span> {cItem.reason}</div>
                        <div className="text-[10px] text-gray-400 mt-1">Quản lý duyệt: {cItem.updated_by} | {new Date(cItem.cancelled_at).toLocaleTimeString('vi-VN')}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Khối chốt tài chính hóa đơn */}
            <div className="border-t border-gray-100 pt-4 mt-6 space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-500"><span>Tạm tính:</span> <span>{selectedBill.sub_total.toLocaleString()}đ</span></div>
                <div className="flex justify-between text-xs text-amber-600 font-medium"><span>Mã giảm giá (Discount):</span> <span>-{selectedBill.discount_amount.toLocaleString()}đ</span></div>
                <div className="flex justify-between text-sm font-black text-gray-800 border-t pt-2"><span>THÀNH TIỀN:</span> <span className="text-blue-600 text-base">{selectedBill.final_total.toLocaleString()}đ</span></div>
              </div>

              {/* 🔴 NÚT XÓA ĐƠN TRONG MODAL DÀNH CHO ADMIN */}
              {userRole === 'admin' && (
                <button
                  onClick={() => handleDeleteOrder(selectedBill._id)}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer text-center shadow-sm flex items-center justify-center space-x-1 border border-red-400"
                >
                  <span>🗑️ Xóa vĩnh viễn hóa đơn này (Admin)</span>
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default BillManagement;
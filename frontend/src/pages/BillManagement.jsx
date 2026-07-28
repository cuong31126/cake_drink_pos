import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';

const BillManagement = () => {
  const navigate = useNavigate();
  const { user } = useAuth(); // Lấy thông tin user đăng nhập hiện tại từ Context toàn cục
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBill, setSelectedBill] = useState(null);
  
  // 💡 GIẢI THÍCH CHO NGƯỜI MỚI HỌC:
  // Chúng ta lấy vai trò (userRole) và chi nhánh làm việc (currentStoreId) của tài khoản đang đăng nhập.
  // Các thông tin này dùng để hiển thị giao diện phù hợp (Ví dụ: Staff chỉ thấy hóa đơn của chi nhánh mình trực).
  const userRole = user?.role || localStorage.getItem('userRole'); // 'admin' hoặc 'staff'
  const currentStoreId = user?.store_id || localStorage.getItem('storeId'); 

  // Các trạng thái bộ lọc dữ liệu ở giao diện (Trạng thái đơn hàng, trạng thái thanh toán)
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');

  useEffect(() => {
    fetchBills();
  }, [statusFilter, paymentFilter]);

  const fetchBills = async () => {
    try {
      setLoading(true);
      
      // Gọi API lấy danh sách đơn hàng từ backend
      const response = await API.get('/orders');

      if (response.data.success) {
        let data = response.data.data;
        
        // 🔒 PHÂN QUYỀN CÔ LẬP (LỚP PHÒNG THỦ PHỤ Ở FRONTEND):
        // 💡 GIẢI THÍCH CHO NGƯỜI MỚI HỌC: Mặc dù Backend đã tự động lọc bảo mật các đơn hàng theo store_id 
        // đối với vai trò Staff, ở đây chúng ta vẫn giữ bộ lọc client-side này làm lá chắn thứ hai (Double-Safety) 
        // để phòng ngừa lỗi rò rỉ dữ liệu ngoài ý muốn ở cấp trình duyệt.
        if (userRole === 'staff' && currentStoreId) {
          data = data.filter(bill => bill.store_id === currentStoreId);
        }

        // Áp dụng bộ lọc trạng thái đơn hàng
        if (statusFilter !== 'all') data = data.filter(b => b.status === statusFilter);
        // Áp dụng bộ lọc trạng thái thanh toán
        if (paymentFilter !== 'all') data = data.filter(b => b.payment_status === paymentFilter);

        setBills(data);
      }
    } catch (err) {
      console.error("Lỗi lấy danh sách hóa đơn:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* 🖥️ HEADER HỆ THỐNG (CÓ NÚT QUAY LẠI) */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 px-6 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-4">
          {/* Nút quay lại điều hướng linh hoạt */}
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-600 flex items-center justify-center border border-gray-200"
            title="Quay lại trang trước"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-black text-gray-800 uppercase tracking-wide">Quản Lý Hóa Đơn (Bills)</h1>
            <p className="text-[11px] text-gray-400 font-medium">
              Vai trò: <span className="font-bold text-blue-600 uppercase">{userRole}</span> 
              {userRole === 'staff' && ` | Chi nhánh: ${currentStoreId}`}
            </p>
          </div>
        </div>
        
        <button 
          onClick={fetchBills} 
          className="px-4 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 shadow-2xs active:scale-95 transition-all"
        >
          🔄 Làm mới danh sách
        </button>
      </header>

      {/* 🎛️ NỘI DUNG CHÍNH (MAIN CONTENT) */}
      <main className="p-6 max-w-7xl mx-auto space-y-6">
        
        {/* THANH BỘ LỌC (FILTERS) */}
        <div className="bg-white p-4 rounded-2xl shadow-xs border border-gray-200 flex flex-wrap gap-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Trạng thái Đơn</label>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)} 
              className="border border-gray-200 rounded-xl text-xs px-3 py-2 bg-gray-50 focus:outline-none font-bold text-gray-700"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="serving">Đang phục vụ (Serving)</option>
              <option value="completed">Đã hoàn thành (Completed)</option>
              <option value="cancelled">Đã hủy đơn (Cancelled)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Đối soát Thanh toán</label>
            <select 
              value={paymentFilter} 
              onChange={(e) => setPaymentFilter(e.target.value)} 
              className="border border-gray-200 rounded-xl text-xs px-3 py-2 bg-gray-50 focus:outline-none font-bold text-gray-700"
            >
              <option value="all">Tất cả hóa đơn</option>
              <option value="paid">Đã thu tiền (Paid)</option>
              <option value="unpaid">Chưa thu tiền (Unpaid)</option>
            </select>
          </div>
        </div>

        {/* BẢNG BÁO CÁO HÓA ĐƠN */}
        <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-400 font-bold text-[11px] uppercase tracking-wider border-b border-gray-200">
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
              <tbody className="text-xs font-medium text-gray-600 divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan="8" className="p-8 text-center text-gray-400 font-bold">Đang tải đồng bộ hóa đơn từ Server...</td></tr>
                ) : bills.length === 0 ? (
                  <tr><td colSpan="8" className="p-8 text-center text-gray-400 font-bold">Không tìm thấy dữ liệu hóa đơn phù hợp.</td></tr>
                ) : bills.map((bill) => (
                  <tr key={bill._id} className="hover:bg-gray-50/50 transition-colors">
                    {/* Đã bọc String() và thêm || 'UNKNOWN' để chống sập web khi gặp dữ liệu rác */}
                  <td className="p-4 font-bold text-gray-900">
                    #{String(bill._id || bill.id || 'UNKNOWN').slice(-6).toUpperCase()}
                  </td>
                    <td className="p-4 text-gray-500">{bill.store_id}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md font-bold text-[11px]">
                        {bill.table_id ? `Bàn ${bill.table_id}` : 'Mang đi'}
                      </span>
                    </td>
                    <td className="p-4 capitalize">{bill.order_type}</td>
                    <td className="p-4 font-black text-blue-600">{bill.final_total.toLocaleString()}đ</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${bill.payment_status === 'paid' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                        {bill.payment_status === 'paid' ? 'Đã thu tiền' : 'Chưa thu tiền'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${bill.status === 'completed' ? 'bg-blue-50 text-blue-600' : bill.status === 'cancelled' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                        {bill.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => setSelectedBill(bill)} 
                        className="px-3 py-1 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-bold shadow-2xs transition-all active:scale-95"
                      >
                        Chi Tiết
                      </button>
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
          <div className="w-full max-w-md bg-white h-screen shadow-2xl p-6 flex flex-col justify-between overflow-y-auto border-l animate-in slide-in-from-right duration-200">
            <div>
              <div className="flex justify-between items-center border-b pb-4 mb-4">
                <h2 className="font-black text-gray-800 text-base uppercase tracking-wide">Chi Tiết Đơn Hàng</h2>
                <button onClick={() => setSelectedBill(null)} className="text-gray-400 hover:text-gray-600 font-bold text-sm">✕ Close</button>
              </div>

              <div className="space-y-1.5 text-xs text-gray-500 mb-6 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div><span className="font-bold text-gray-700">ID:</span> {selectedBill._id}</div>
                <div><span className="font-bold text-gray-700">Nhân viên lập đơn:</span> {selectedBill.created_by}</div>
                <div><span className="font-bold text-gray-700">Thời gian tạo:</span> {new Date(selectedBill.createdAt).toLocaleString()}</div>
              </div>

              <h3 className="font-bold text-xs text-gray-400 uppercase mb-2 tracking-wider">Món ăn phục vụ</h3>
              <div className="space-y-2 mb-6">
                {selectedBill.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs bg-white border border-gray-100 p-3 rounded-xl">
                    <div>
                      <div className="font-bold text-gray-800">{item.name}</div>
                      <div className="text-[10px] text-gray-400">Đơn giá: {item.price.toLocaleString()}đ</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-700">x{item.quantity}</div>
                      <div className="font-black text-blue-600">{(item.price * item.quantity).toLocaleString()}đ</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ⚠️ PHẦN CHỈ ĐÀNH CHO ADMIN XEM NHẬT KÝ HỦY MÓN CHỐNG GIAN LẬN */}
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
                        <div className="text-[10px] text-gray-400 mt-1">Quản lý duyệt: {cItem.updated_by} | {new Date(cItem.cancelled_at).toLocaleTimeString()}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Khối chốt tài chính hóa đơn */}
            <div className="border-t border-gray-100 pt-4 mt-6 space-y-2">
              <div className="flex justify-between text-xs text-gray-500"><span>Tạm tính:</span> <span>{selectedBill.sub_total.toLocaleString()}đ</span></div>
              <div className="flex justify-between text-xs text-amber-600 font-medium"><span>Mã giảm giá (Discount):</span> <span>-{selectedBill.discount_amount.toLocaleString()}đ</span></div>
              <div className="flex justify-between text-sm font-black text-gray-800 border-t pt-2"><span>THÀNH TIỀN:</span> <span className="text-blue-600 text-base">{selectedBill.final_total.toLocaleString()}đ</span></div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default BillManagement;
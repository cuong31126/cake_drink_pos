import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { toast } from 'react-hot-toast';

import { BANK_BIN, ACCOUNT_NUMBER, ACCOUNT_NAME } from '../config/constants';

const MyOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal hiển thị Hóa đơn Bill chi tiết & Mã QR Thanh toán
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showBillModal, setShowBillModal] = useState(false);

  useEffect(() => {
    fetchMyOrders();
  }, []);

  const fetchMyOrders = async () => {
    try {
      setLoading(true);
      const res = await API.get('/orders');
      if (res.data.success) {
        setOrders(res.data.data);
      }
    } catch (err) {
      console.error("Lỗi lấy danh sách đơn hàng của tôi:", err);
    } finally {
      setLoading(false);
    }
  };

  // Tự động kiểm tra trạng thái thanh toán real-time khi đang xem Modal Hóa Đơn / QR (tối đa 3 phút)
  useEffect(() => {
    let intervalId;
    let pollCount = 0;
    const MAX_POLLS = 60; // 60 * 3s = 3 phút

    if (showBillModal && selectedOrder && selectedOrder.payment_status !== 'paid') {
      const checkPaymentStatus = async () => {
        pollCount += 1;
        if (pollCount > MAX_POLLS) {
          clearInterval(intervalId);
          return;
        }
        try {
          const res = await API.get(`/orders/${selectedOrder._id}`);
          if (res.data.success && res.data.data.payment_status === 'paid') {
            clearInterval(intervalId);
            toast.success("✅ Xác nhận giao dịch chuyển khoản PayOS thành công!");
            setSelectedOrder(prev => ({ ...prev, payment_status: 'paid', status: 'completed' }));
            fetchMyOrders();
          }
        } catch (err) {
          console.error("Lỗi kiểm tra thanh toán:", err);
        }
      };
      intervalId = setInterval(checkPaymentStatus, 3000);
    }
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [showBillModal, selectedOrder]);

  const handleOpenBillModal = (order, e) => {
    if (e) e.stopPropagation();
    setSelectedOrder(order);
    setShowBillModal(true);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending_confirm':
        return <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold rounded-lg text-xs">⏳ Chờ bếp nhận đơn</span>;
      case 'serving':
        return <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 font-bold rounded-lg text-xs">👨‍🍳 Bếp đang làm món</span>;
      case 'ready':
        return <span className="px-2.5 py-1 bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 font-bold rounded-lg text-xs animate-pulse">🎉 Món đã sẵn sàng</span>;
      case 'completed':
        return <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold rounded-lg text-xs">✅ Đã hoàn thành</span>;
      case 'cancelled':
        return <span className="px-2.5 py-1 bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 font-bold rounded-lg text-xs">❌ Đã hủy đơn</span>;
      default:
        return <span className="px-2.5 py-1 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 font-bold rounded-lg text-xs">{status}</span>;
    }
  };

  const getQRUrl = (order) => {
    if (!order) return '';
    const addInfo = encodeURIComponent(`Thanh Toan Don ${order._id.slice(-6).toUpperCase()}`);
    return `https://img.vietqr.io/image/${BANK_BIN}-${ACCOUNT_NUMBER}-compact2.png?amount=${order.final_total}&addInfo=${addInfo}&accountName=${encodeURIComponent(ACCOUNT_NAME)}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 pt-24 sm:pt-28 pb-12 font-sans">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 space-y-4 sm:space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={() => navigate('/menu')}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl cursor-pointer transition-colors"
            >
              ⬅️ Về Menu
            </button>
            <h1 className="text-sm sm:text-lg font-black uppercase tracking-wide">🛍️ Đơn Hàng Của Tôi</h1>
          </div>
          <button
            onClick={fetchMyOrders}
            className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold text-xs rounded-xl border border-blue-200 dark:border-blue-800 cursor-pointer hover:bg-blue-100 transition-colors"
          >
            🔄 Tải lại
          </button>
        </div>

        {/* Danh sách đơn hàng */}
        {loading ? (
          <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl text-center font-bold text-slate-500 animate-pulse border border-slate-200 dark:border-slate-800">
            ⏳ Đang tải danh sách đơn hàng của bạn...
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl text-center space-y-3 border border-slate-200 dark:border-slate-800">
            <span className="text-4xl block">🍰</span>
            <p className="font-bold text-slate-600 dark:text-slate-300">Bạn chưa có đơn hàng nào!</p>
            <button
              onClick={() => navigate('/menu')}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl cursor-pointer shadow-md transition-all"
            >
              Đặt món ngay ➡️
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order._id}
                onClick={() => handleOpenBillModal(order)}
                className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4 hover:shadow-md hover:border-purple-300 dark:hover:border-purple-800/60 transition-all cursor-pointer relative group"
              >
                {/* Header đơn */}
                <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <span className="font-black text-sm text-slate-900 dark:text-slate-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      Mã đơn #{order._id.slice(-6).toUpperCase()}
                    </span>
                    <span className="text-[11px] text-slate-400 block font-medium">
                      {new Date(order.createdAt).toLocaleString('vi-VN')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                      {order.order_type === 'dine-in' ? `🍽️ Bàn ${order.table_id || ''}` : '🛵 Giao tận nơi'}
                    </span>
                    {getStatusBadge(order.status)}
                  </div>
                </div>

                {/* Thông tin giao hàng nếu có */}
                {order.order_type !== 'dine-in' && (order.delivery_address || order.customer_phone) && (
                  <div className="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-100 dark:border-amber-900/30 text-xs text-amber-900 dark:text-amber-200 space-y-1 font-medium">
                    {order.customer_phone && (
                      <div>📞 <span className="font-bold">SĐT:</span> {order.customer_phone}</div>
                    )}
                    {order.delivery_address && (
                      <div>🏠 <span className="font-bold">Địa chỉ:</span> {order.delivery_address}</div>
                    )}
                  </div>
                )}

                {/* Danh sách món */}
                <div className="space-y-2">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs py-1 border-b border-dashed border-slate-100 dark:border-slate-800 last:border-0">
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{item.name}</span>
                        {item.selected_attributes?.size && (
                          <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold ml-2">
                            Size {item.selected_attributes.size}
                          </span>
                        )}
                      </div>
                      <div className="text-right font-bold text-slate-700 dark:text-slate-300">
                        x{item.quantity} = {(item.price * item.quantity).toLocaleString()}đ
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tổng tiền & Nút Xem Hóa Đơn Bill */}
                <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-xs">
                    <span className="text-slate-400 font-bold uppercase">Tổng thanh toán:</span>
                    <span className="text-base font-black text-red-600 dark:text-red-400 ml-2">
                      {order.final_total.toLocaleString()}đ
                    </span>
                  </div>

                  <div className="flex space-x-2">
                    {(order.status === 'completed' || order.payment_status === 'paid') && (
                      <button
                        onClick={(e) => handleOpenBillModal(order, e)}
                        className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center space-x-1"
                      >
                        <span>🧾 Xem Bill Hóa Đơn</span>
                      </button>
                    )}

                    {order.payment_status !== 'paid' && (
                      <button
                        onClick={(e) => handleOpenBillModal(order, e)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center space-x-1"
                      >
                        <span>💳 Thanh toán QR</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🧾 MODAL CHI TIẾT HÓA ĐƠN BILL & MÃ QR THANH TOÁN (TẬN DỤNG CODE CŨ HIỂN THỊ CHI TIẾT) */}
      {showBillModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-[70] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-200 dark:border-slate-700 animate-in zoom-in-95 duration-150 text-slate-800 dark:text-slate-100 max-h-[90vh] flex flex-col">
            
            {/* Header Bill Header */}
            <div className="bg-gradient-to-r from-purple-700 to-indigo-700 p-5 text-white relative">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-black text-base uppercase tracking-wide">
                    HÓA ĐƠN thanh toán #{selectedOrder._id.slice(-6).toUpperCase()}
                  </h3>
                  <p className="text-purple-200 text-xs mt-0.5">Sweet Bakery POS & Beverage</p>
                </div>
                <button
                  onClick={() => setShowBillModal(false)}
                  className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-1.5 transition-colors cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
            </div>

            {/* Thân Modal Bill */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              
              {/* Thông tin đơn hàng */}
              <div className="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Mã giao dịch:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">#{selectedOrder._id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Thời gian tạo:</span>
                  <span className="font-bold">{new Date(selectedOrder.createdAt).toLocaleString('vi-VN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Hình thức:</span>
                  <span className="font-bold text-purple-600 dark:text-purple-400">
                    {selectedOrder.order_type === 'dine-in' ? `🍽️ Ăn tại quán (Bàn ${selectedOrder.table_id || ''})` : '🛵 Giao tận nơi (Take-away)'}
                  </span>
                </div>
                {selectedOrder.customer_phone && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Số điện thoại:</span>
                    <span className="font-bold">{selectedOrder.customer_phone}</span>
                  </div>
                )}
                {selectedOrder.delivery_address && (
                  <div className="pt-1 border-t border-slate-200 dark:border-slate-700 text-amber-800 dark:text-amber-300 font-bold">
                    🏠 Địa chỉ nhận: <span className="font-normal">{selectedOrder.delivery_address}</span>
                  </div>
                )}
              </div>

              {/* Danh sách các món ăn & phụ thu size */}
              <div>
                <h4 className="font-black uppercase text-[11px] text-slate-500 dark:text-slate-400 tracking-wider mb-2">Chi tiết các món trong đơn:</h4>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 flex justify-between items-center">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">{item.name}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          Đơn giá: {item.price.toLocaleString()}đ
                          {item.selected_attributes?.size && ` | Size: ${item.selected_attributes.size}`}
                          {item.selected_attributes?.sugar && ` | Đường: ${item.selected_attributes.sugar}`}
                          {item.selected_attributes?.ice && ` | Đá: ${item.selected_attributes.ice}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-700 dark:text-slate-300">x{item.quantity}</div>
                        <div className="font-black text-blue-600 dark:text-blue-400">{(item.price * item.quantity).toLocaleString()}đ</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tổng cộng bài toán tài chính */}
              <div className="bg-slate-100 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Tạm tính tiền món:</span>
                  <span className="font-bold">{(selectedOrder.sub_total || selectedOrder.final_total).toLocaleString()}đ</span>
                </div>
                {selectedOrder.discount_amount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Mã giảm giá (Discount):</span>
                    <span>-{selectedOrder.discount_amount.toLocaleString()}đ</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black pt-2 border-t border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                  <span>TỔNG CỘNG THANH TOÁN:</span>
                  <span className="text-red-600 dark:text-red-400 text-base">{selectedOrder.final_total.toLocaleString()} đ</span>
                </div>
              </div>

              {/* 💳 NẾU ĐƠN CHƯA THANH TOÁN -> HIỂN THỊ MÃ QR CHUYỂN KHOẢN PAYOS */}
              {selectedOrder.payment_status !== 'paid' ? (
                <div className="bg-gradient-to-b from-amber-50 to-orange-50 dark:from-slate-800 dark:to-slate-800/80 p-4 rounded-2xl border border-amber-200 dark:border-amber-900/40 flex flex-col items-center space-y-3">
                  <div className="text-center">
                    <span className="font-black text-xs uppercase tracking-wide text-amber-800 dark:text-amber-300 block">💳 MÃ QR THANH TOÁN CHUYỂN KHOẢN PAYOS</span>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400">Quét mã bằng app ngân hàng để hoàn tất đơn</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl shadow-md border border-slate-200">
                    <img
                      src={getQRUrl(selectedOrder)}
                      alt="PayOS VietQR"
                      className="w-48 h-48 object-contain"
                    />
                  </div>

                  <div className="w-full text-[11px] space-y-1 bg-white dark:bg-slate-900 p-3 rounded-xl border border-amber-200 dark:border-amber-900/30">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Ngân hàng:</span>
                      <span className="font-bold">MBBank</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Chủ TK:</span>
                      <span className="font-bold">{ACCOUNT_NAME}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Số TK:</span>
                      <span className="font-bold text-emerald-600">{ACCOUNT_NUMBER}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Nội dung:</span>
                      <span className="font-bold text-purple-600">Thanh Toan Don {selectedOrder._id.slice(-6).toUpperCase()}</span>
                    </div>
                  </div>

                  <div className="text-center">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px] animate-pulse">
                      <span>⏳</span> Hệ thống đang tự động kiểm tra giao dịch tiền về...
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50 dark:bg-emerald-950/60 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 text-center space-y-1">
                  <span className="text-2xl block">🎉</span>
                  <div className="font-black text-emerald-700 dark:text-emerald-300 text-sm uppercase">✅ ĐÃ XÁC NHẬN THANH TOÁN THÀNH CÔNG</div>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400">Hóa đơn của bạn đã hoàn tất. Cảm ơn quý khách!</div>
                </div>
              )}

            </div>

            {/* Footer Modal */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex justify-end">
              <button
                onClick={() => setShowBillModal(false)}
                className="w-full py-2.5 bg-slate-700 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Đóng cửa sổ Hóa Đơn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyOrders;

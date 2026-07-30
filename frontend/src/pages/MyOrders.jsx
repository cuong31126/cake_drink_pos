import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';

const MyOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 pt-20 pb-12 font-sans">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/menu')}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl cursor-pointer"
            >
              ⬅️ Về Menu
            </button>
            <h1 className="text-lg font-black uppercase tracking-wide">🛍️ Đơn Hàng Của Tôi</h1>
          </div>
          <button
            onClick={fetchMyOrders}
            className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold text-xs rounded-xl border border-blue-200 dark:border-blue-800 cursor-pointer"
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
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl cursor-pointer"
            >
              Đặt món ngay ➡️
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order._id}
                className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4 hover:shadow-md transition-all"
              >
                {/* Header đơn */}
                <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <span className="font-black text-sm text-slate-900 dark:text-slate-100">
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

                {/* Thông tin giao hàng nều có */}
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

                {/* Tổng tiền & nút xem chi tiết */}
                <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-xs">
                    <span className="text-slate-400 font-bold uppercase">Tổng tiền:</span>
                    <span className="text-base font-black text-red-600 dark:text-red-400 ml-2">
                      {order.final_total.toLocaleString()}đ
                    </span>
                  </div>
                  <button
                    onClick={() => navigate(`/menu?type=${order.order_type}&orderId=${order._id}&showDrawer=true`)}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
                  >
                    Xem chi tiết ➡️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyOrders;

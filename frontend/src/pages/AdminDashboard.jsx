import React, { useState, useEffect } from 'react';
import API from '../services/api';

const AdminDashboard = () => {
  const [revenueStats, setRevenueStats] = useState({ totalRevenue: 0, totalOrders: 0, averageBill: 0 });
  const [topProducts, setTopProducts] = useState([]);
  const [slowProducts, setSlowProducts] = useState([]);
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [revRes, topRes, slowRes, stockRes] = await Promise.all([
          API.get('/dashboard/revenue-stats'),
          API.get('/dashboard/top-selling'),
          API.get('/dashboard/slow-moving'),
          API.get('/dashboard/low-stock')
        ]);

        if (revRes.data.success) {
          setRevenueStats(revRes.data.data);
        }
        if (topRes.data.success) {
          setTopProducts(topRes.data.data);
        }
        if (slowRes.data.success) {
          setSlowProducts(slowRes.data.data);
        }
        if (stockRes.data.success) {
          setLowStockAlerts(stockRes.data.data);
        }
      } catch (error) {
        console.error("Lỗi tải dữ liệu Dashboard thật:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-sm font-bold text-gray-400 uppercase tracking-wider animate-pulse">
          ⏳ Đang tổng hợp dữ liệu tài chính & tồn kho...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20 px-6 max-w-7xl mx-auto pb-12">
      
      {/* 📊 KHỐI 1: TỔNG HỢP CHỈ SỐ DOANH THU TỔNG QUAN */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tổng Doanh Thu Hóa Đơn</div>
          <div className="text-3xl font-black text-gray-800 mt-2">{(revenueStats.totalRevenue || 0).toLocaleString()} đ</div>
          <div className="text-[11px] text-green-600 font-bold mt-1">↑ Dữ liệu tổng hợp trực tiếp từ DB</div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Hóa Đơn Hoàn Thành</div>
          <div className="text-3xl font-black text-gray-800 mt-2">{revenueStats.totalOrders || 0} đơn</div>
          <div className="text-[11px] text-gray-400 font-medium mt-1">Hóa đơn đã chốt và chuyển khoản thành công</div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Giá trị đơn trung bình</div>
          <div className="text-3xl font-black text-amber-600 mt-2">{(revenueStats.averageBill || 0).toLocaleString()} đ</div>
          <div className="text-[11px] text-blue-600 font-bold mt-1">Sức tiêu dùng thực tế tại các bàn</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 📈 KHỐI 2: TOP SẢN PHẨM BÁN CHẠY */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm lg:col-span-2">
          <h3 className="text-sm font-black text-gray-800 mb-4 uppercase tracking-wider flex items-center">
            🔥 Món bán chạy nhất (Top Selling)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider pb-3">
                  <th className="pb-3">Tên sản phẩm</th>
                  <th className="pb-3 text-center">Số lượng bán</th>
                  <th className="pb-3 text-right">Doanh thu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-700 font-medium">
                {topProducts.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="py-4 text-center text-gray-400">Chưa ghi nhận món ăn bán chạy</td>
                  </tr>
                ) : topProducts.map((prod) => (
                  <tr key={prod._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 font-bold text-gray-800">{prod.name}</td>
                    <td className="py-3 text-center font-bold text-blue-600">{prod.totalQuantity} món</td>
                    <td className="py-3 text-right font-black text-gray-900">{(prod.revenue || 0).toLocaleString()} đ</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ⚠️ KHỐI 3: CẢNH BÁO TỒN KHO SẮP HẾT */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <h3 className="text-sm font-black text-red-600 mb-4 uppercase tracking-wider flex items-center">
              ⚠️ Cảnh báo tồn kho thấp (Low Stock)
            </h3>
            <div className="space-y-3 overflow-y-auto max-h-[30vh]">
              {lowStockAlerts.length === 0 ? (
                <div className="text-center text-gray-400 text-xs py-4 font-bold">Mức kho các chi nhánh đều ổn định</div>
              ) : lowStockAlerts.map((alert, idx) => (
                <div key={idx} className="p-3 bg-red-50 rounded-xl border border-red-100 flex items-center justify-between text-xs font-bold">
                  <div>
                    <div className="font-bold text-gray-800">{alert.name}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">Chi nhánh: <span className="uppercase text-blue-600">{alert.store_id}</span></div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                    alert.current_stock === 0 ? 'bg-red-200 text-red-800 animate-pulse' : 'bg-amber-200 text-amber-800'
                  }`}>
                    {alert.current_stock === 0 ? 'HẾT HÀNG' : `Còn: ${alert.current_stock}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <button className="mt-4 w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-colors uppercase">
            📦 Nhập hàng nhanh
          </button>
        </div>

        {/* 📉 KHỐI 4: THỐNG KÊ SẢN PHẨM BÁN CHẬM */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm lg:col-span-3">
          <h3 className="text-sm font-black text-gray-400 mb-4 uppercase tracking-wider">
            💤 Món bán chậm nhất (Slow Moving Items)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {slowProducts.length === 0 ? (
              <div className="text-center text-gray-400 text-xs py-4 col-span-2">Chưa có số liệu</div>
            ) : slowProducts.map((prod) => (
              <div key={prod._id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between text-xs font-bold">
                <div>
                  <h4 className="font-bold text-gray-800">{prod.name}</h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">Tích lũy: {(prod.revenue || 0).toLocaleString()} đ</p>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-600">{prod.totalQuantity} phần đã bán</div>
                  <span className="text-[9px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-bold block mt-1">
                    Gợi ý: Tặng kèm hoặc chạy khuyến mại
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;
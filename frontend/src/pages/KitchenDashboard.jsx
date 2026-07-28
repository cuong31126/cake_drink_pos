import React, { useState } from 'react';

const KitchenDashboard = () => {
  // Bộ chia Tab: 'cooking' (Đang làm) hoặc 'served' (Đã làm xong bưng ra)
  const [activeTab, setActiveTab] = useState('cooking');

  // Danh sách các món ăn tổng hợp từ các đơn hàng DINE-IN đang hoạt động
  const [kitchenItems, setKitchenItems] = useState([
    { _id: 'item_01', order_id: 'order_demo_1', table_number: 'Bàn 03', name: 'Bánh Tiramisu truyền thống', quantity: 2, item_status: 'cooking', note: 'Ít ngọt' },
    { _id: 'item_02', order_id: 'order_demo_1', table_number: 'Bàn 03', name: 'Cafe sữa đá', quantity: 1, item_status: 'cooking', note: '100% đá, 50% đường' },
    { _id: 'item_03', order_id: 'order_demo_2', table_number: 'Bàn 05', name: 'Trà sen vàng', quantity: 1, item_status: 'served', note: 'Thêm thạch' },
  ]);

  // Hàm xử lý chuyển đổi trạng thái món ăn (API số 25: PATCH item-status)
  const handleUpdateStatus = (itemId, currentStatus) => {
    const nextStatus = currentStatus === 'cooking' ? 'served' : 'cooking';
    
    // Thực tế: Cần gọi API lên Backend
    // await API.patch(`/orders/${orderId}/item-status`, { product_id, item_status: nextStatus });
    
    // Cập nhật State trực tiếp ở Frontend để món ăn tự nhảy Tab ngay lập tức
    const updatedItems = kitchenItems.map(item => {
      if (item._id === itemId) {
        return { ...item, item_status: nextStatus };
      }
      return item;
    });
    setKitchenItems(updatedItems);
  };

  // Lọc danh sách món ăn hiển thị theo Tab đang chọn
  const filteredItems = kitchenItems.filter(item => item.item_status === activeTab);

  return (
    <div className="min-h-screen bg-gray-50 pt-20 px-6 max-w-4xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 border-b border-gray-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">MÀN HÌNH ĐIỀU PHỐI CHẾ BIẾN (BẾP & PHA CHẾ)</h2>
          <p className="text-xs text-gray-400 mt-1">Quản lý thứ tự ra món và đồng bộ trạng thái phục vụ tại bàn</p>
        </div>

        {/* Hệ thống thanh chuyển đổi Tab lớn */}
        <div className="flex bg-gray-200 p-1 rounded-xl mt-4 md:mt-0 shadow-inner">
          <button
            onClick={() => setActiveTab('cooking')}
            className={`px-5 py-2 rounded-lg font-bold text-sm transition-all flex items-center space-x-2 ${
              activeTab === 'cooking' ? 'bg-amber-500 text-white shadow-sm' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <span>🍳 Đang Chế Biến</span>
            <span className="bg-white bg-opacity-30 text-xs px-1.5 py-0.5 rounded-md">
              {kitchenItems.filter(i => i.item_status === 'cooking').length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('served')}
            className={`px-5 py-2 rounded-lg font-bold text-sm transition-all flex items-center space-x-2 ${
              activeTab === 'served' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <span>✅ Đã Hoàn Thành</span>
            <span className="bg-white bg-opacity-30 text-xs px-1.5 py-0.5 rounded-md">
              {kitchenItems.filter(i => i.item_status === 'served').length}
            </span>
          </button>
        </div>
      </div>

      {/* Hiển thị danh sách thẻ đơn món ăn */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 text-gray-400 text-sm">
          Hiện tại không có món ăn nào trong danh sách này.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => (
            <div 
              key={item._id} 
              className={`p-5 bg-white border rounded-2xl shadow-sm flex items-center justify-between transition-all ${
                item.item_status === 'cooking' ? 'border-amber-100 hover:border-amber-300' : 'border-emerald-100 hover:border-emerald-300'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-3">
                  <span className="font-mono bg-gray-800 text-white px-2 py-0.5 rounded font-bold text-sm">
                    {item.table_number}
                  </span>
                  <span className="text-xs text-gray-400 font-mono">Đơn: #{item.order_id.slice(-6)}</span>
                </div>
                <h3 className="text-lg font-bold text-gray-800 pt-1">
                  {item.name} <span className="text-red-600 text-xl font-black">× {item.quantity}</span>
                </h3>
                {item.note && (
                  <p className="text-xs font-semibold text-amber-700 bg-amber-50 inline-block px-2 py-0.5 rounded border border-amber-100">
                    📝 Ghi chú: {item.note}
                  </p>
                )}
              </div>

              {/* Nút bấm hành động chuyển trạng thái nhanh */}
              <button
                onClick={() => handleUpdateStatus(item._id, item.item_status)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm ${
                  item.item_status === 'cooking'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-amber-100 hover:bg-amber-200 text-amber-800'
                }`}
              >
                {item.item_status === 'cooking' ? '🔔 Làm xong - Ra món' : '🔄 Làm lại món ăn'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default KitchenDashboard;
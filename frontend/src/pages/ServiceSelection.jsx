import React from 'react';
import { useNavigate } from 'react-router-dom';

const ServiceSelection = () => {
  const navigate = useNavigate();

  React.useEffect(() => {
    const role = localStorage.getItem('userRole');
    if (role === 'user') {
      navigate('/menu?type=take-away', { replace: true });
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center pt-16 px-4">
      <h1 className="text-2xl font-bold text-gray-800 mb-8 text-center">
        CHỌN PHƯƠNG THỨC PHỤC VỤ
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
        {/* Nút 1: Giao hàng */}
        <button 
          onClick={() => navigate('/menu?type=delivery')}
          className="h-48 bg-white border-2 border-gray-200 hover:border-blue-500 rounded-xl shadow-sm flex flex-col items-center justify-center p-6 group transition-all transform hover:-translate-y-1"
        >
          <span className="text-4xl mb-4 group-hover:scale-110 transition-transform">🚚</span>
          <span className="text-xl font-bold text-gray-700 group-hover:text-blue-600">Giao Hàng</span>
          <span className="text-xs text-gray-400 mt-2 text-center">Tạo đơn ship, giao tận nhà cho khách</span>
        </button>

        {/* Nút 2: Mang đi */}
        <button 
          onClick={() => navigate('/menu?type=take-away')}
          className="h-48 bg-white border-2 border-gray-200 hover:border-green-500 rounded-xl shadow-sm flex flex-col items-center justify-center p-6 group transition-all transform hover:-translate-y-1"
        >
          <span className="text-4xl mb-4 group-hover:scale-110 transition-transform">🛍️</span>
          <span className="text-xl font-bold text-gray-700 group-hover:text-green-600">Đặt Tại Quán</span>
          <span className="text-xs text-gray-400 mt-2 text-center">Khách mua mang đi, lấy ngay tại quầy</span>
        </button>

        {/* Nút 3: Ngồi tại bàn */}
        <button 
          onClick={() => navigate('/tables')}
          className="h-48 bg-white border-2 border-gray-200 hover:border-amber-500 rounded-xl shadow-sm flex flex-col items-center justify-center p-6 group transition-all transform hover:-translate-y-1"
        >
          <span className="text-4xl mb-4 group-hover:scale-110 transition-transform">🪑</span>
          <span className="text-xl font-bold text-gray-700 group-hover:text-amber-600">Ngồi Tại Bàn</span>
          <span className="text-xs text-gray-400 mt-2 text-center">Xem sơ đồ 8 bàn ăn, phục vụ tại chỗ</span>
        </button>
      </div>
    </div>
  );
};

export default ServiceSelection;
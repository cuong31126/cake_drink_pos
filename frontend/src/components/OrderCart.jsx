import React from 'react';

const OrderCart = ({ cart, tableId, onAddProduct, onDecreaseQuantity, onPrintDraft, onPay }) => {
  
  const calculateTotal = () => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="w-1/3 bg-white border-l border-gray-200 p-6 flex flex-col justify-between fixed right-0 top-16 bottom-0 shadow-lg z-10">
      <div>
        <h2 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-3 mb-4">
          🛒 Chi tiết đơn hàng {tableId && `- Bàn ${tableId.slice(-2)}`}
        </h2>

        {cart.length === 0 ? (
          <div className="text-center text-gray-400 mt-12 text-sm">Giỏ hàng trống. Vui lòng chọn món.</div>
        ) : (
          <div className="space-y-3 overflow-y-auto max-h-[55vh]">
            {cart.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-100 text-sm">
                <div className="flex-1 min-w-0 mr-2">
                  <div className="font-semibold text-gray-800 truncate">{item.name}</div>
                  <div className="text-xs text-gray-400">Kích cỡ: {item.size || 'M'}</div>
                  <span className="text-xs font-medium text-gray-500">{(item.price * item.quantity).toLocaleString()} đ</span>
                </div>
                
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <button 
                    onClick={() => onDecreaseQuantity(index)}
                    className="w-6 h-6 bg-red-100 text-red-700 hover:bg-red-200 rounded-md flex items-center justify-center font-bold text-xs transition-colors"
                  >
                    -
                  </button>
                  <span className="font-bold w-5 text-center text-gray-700">{item.quantity}</span>
                  <button 
                    onClick={() => onAddProduct({ _id: item.product_id, name: item.name, price: item.price })}
                    className="w-6 h-6 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-md flex items-center justify-center font-bold text-xs transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Khối chốt hóa đơn và dòng tiền cố định phía dưới */}
      <div className="border-t border-gray-200 pt-4 bg-white">
        <div className="flex justify-between items-center mb-4">
          <span className="text-gray-500 font-medium text-sm">Tổng tiền cần thu:</span>
          <span className="text-xl font-bold text-red-600">{calculateTotal().toLocaleString()} đ</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={onPrintDraft}
            className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl text-sm transition-colors"
          >
            📋 In Bill tạm tính
          </button>
          <button 
            onClick={() => onPay(calculateTotal())}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-colors shadow-sm"
          >
            💳 Quét mã QR
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderCart;
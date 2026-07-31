import React, { useState, useEffect } from 'react';
import API from '../services/api';

const StaffInventoryModal = ({ isOpen, onClose, user }) => {
  const defaultStore = user?.store_id || localStorage.getItem('storeId') || 'store_Q1';
  const isAdmin = user?.role === 'admin' || localStorage.getItem('userRole') === 'admin';

  const [selectedStore, setSelectedStore] = useState(defaultStore);
  const [period, setPeriod] = useState('day'); // 'day' | 'week' | 'month'
  const [inventoryData, setInventoryData] = useState({ stats: {}, productStockDetails: [], logs: [] });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Stock edit states
  const [editingItem, setEditingItem] = useState(null);
  const [editStockValue, setEditStockValue] = useState('');
  const [showStockModal, setShowStockModal] = useState(false);

  // PIN verification states (6 digits)
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [pendingAction, setPendingAction] = useState(null);

  // Daily stock reconciliation states
  const [showDailyStockModal, setShowDailyStockModal] = useState(false);
  const [dailyStockType, setDailyStockType] = useState('start_of_day');
  const [dailyStockNote, setDailyStockNote] = useState('');

  const fetchInventoryData = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/inventory/summary?period=${period}&store_id=${selectedStore}`);
      if (res.data.success) {
        setInventoryData(res.data.data);
      }
    } catch (err) {
      console.error("Lỗi tải dữ liệu tồn kho nhân viên:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchInventoryData();
    }
  }, [isOpen, selectedStore, period]);

  if (!isOpen) return null;

  // 🔑 Trigger PIN Verification Modal (6 digits)
  const requestPinVerification = (onSuccessCallback) => {
    if (isAdmin) {
      // 🛡️ ĐẶC QUYỀN ADMIN: Bỏ qua nhập mã PIN 6 số
      onSuccessCallback();
      return;
    }
    setPendingAction(() => onSuccessCallback);
    setPinInput('');
    setPinError('');
    setShowPinModal(true);
  };

  const handleVerifyPinSubmit = async (e) => {
    e.preventDefault();
    if (!pinInput || pinInput.length !== 6) {
      setPinError('Vui lòng nhập đủ 6 chữ số mã PIN.');
      return;
    }

    try {
      const res = await API.post('/auth/verify-pin', { pin: pinInput });
      if (res.data.success) {
        setShowPinModal(false);
        setPinError('');
        if (pendingAction) {
          await pendingAction();
          setPendingAction(null);
        }
      }
    } catch (err) {
      setPinError(err.response?.data?.message || 'Mã PIN 6 số không đúng. Vui lòng thử lại!');
    }
  };

  // 📦 Open Stock Update / Nhập Hàng Modal
  const handleOpenStockEdit = (product) => {
    setEditingItem(product);
    setEditStockValue((product.stock ?? 0).toString());
    setShowStockModal(true);
  };

  const executeStockUpdate = async () => {
    if (!editingItem) return;
    try {
      const newStockNum = Number(editStockValue);
      const res = await API.patch(`/products/${editingItem._id}/stock`, {
        store_id: selectedStore,
        stock: newStockNum
      });

      if (res.data.success) {
        try {
          await API.post('/inventory/log', {
            store_id: selectedStore,
            product_id: editingItem._id,
            product_name: editingItem.name,
            type: 'manual_adjustment',
            previous_stock: editingItem.stock || 0,
            new_stock: newStockNum,
            note: 'Nhập hàng / Cập nhật kho từ Staff'
          });
        } catch (logErr) {
          console.warn("Lỗi ghi log tồn kho:", logErr);
        }

        alert(`✅ NHẬP HÀNG / CẬP NHẬT KHO THÀNH CÔNG!\n\n- Món: ${editingItem.name}\n- Chi nhánh: ${selectedStore === 'store_Q1' ? 'Quận 1' : 'Thủ Đức'}\n- Số lượng mới: ${newStockNum} món`);
        setShowStockModal(false);
        setEditingItem(null);
        fetchInventoryData();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi khi cập nhật kho.");
    }
  };

  const handleStockUpdateWithPin = (e) => {
    e.preventDefault();
    requestPinVerification(executeStockUpdate);
  };

  // 📋 Save Daily Stock Reconciliation (Chốt kho đầu/cuối ngày)
  const executeDailyStockSave = async () => {
    try {
      const res = await API.post('/inventory/log', {
        store_id: selectedStore,
        type: dailyStockType,
        previous_stock: inventoryData.stats?.totalStock || 0,
        new_stock: inventoryData.stats?.totalStock || 0,
        note: dailyStockNote || (dailyStockType === 'start_of_day' ? 'Chốt kho đầu ngày' : 'Chốt kho cuối ngày')
      });

      if (res.data.success) {
        alert(`✅ Đã chốt kho [${dailyStockType === 'start_of_day' ? 'ĐẦU NGÀY' : 'CUỐI NGÀY'}] thành công!`);
        setShowDailyStockModal(false);
        setDailyStockNote('');
        fetchInventoryData();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi khi lưu chốt kho.");
    }
  };

  const handleDailyStockSubmitWithPin = (e) => {
    e.preventDefault();
    requestPinVerification(executeDailyStockSave);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
      <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-3xl max-w-4xl w-full max-h-[90vh] shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
          <div>
            <h2 className="text-lg font-black text-gray-900 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
              <span>📦 QUẢN LÝ TỒN KHO & NHẬP HÀNG CHI NHÁNH</span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-slate-400">Xem mức tồn kho thực tế, nhập hàng và chốt kho ca trực (Yêu cầu mã PIN 6 số)</p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 font-bold text-sm text-gray-600 dark:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* BODY (SCROLLABLE) */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          
          {/* BAR BỘ LỌC CHI NHÁNH & CHỐT KHO */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60">
            <div className="flex items-center space-x-2 text-xs font-bold">
              <span className="text-slate-500 dark:text-slate-400">Chi nhánh trực:</span>
              {isAdmin ? (
                <select
                  value={selectedStore}
                  onChange={(e) => setSelectedStore(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 focus:outline-none cursor-pointer"
                >
                  <option value="store_Q1">📍 Chi nhánh 1 (Quận 1)</option>
                  <option value="store_ThuDuc">📍 Chi nhánh 2 (Thủ Đức)</option>
                </select>
              ) : (
                <span className="px-3 py-1 bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 rounded-xl font-bold">
                  {selectedStore === 'store_Q1' ? '📍 Chi nhánh 1 (Quận 1)' : '📍 Chi nhánh 2 (Thủ Đức)'}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex bg-gray-200 dark:bg-slate-700 p-1 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setPeriod('day')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${period === 'day' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs' : 'text-gray-600 dark:text-slate-400'}`}
                >
                  Hôm nay
                </button>
                <button
                  onClick={() => setPeriod('week')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${period === 'week' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs' : 'text-gray-600 dark:text-slate-400'}`}
                >
                  Tuần này
                </button>
                <button
                  onClick={() => setPeriod('month')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${period === 'month' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs' : 'text-gray-600 dark:text-slate-400'}`}
                >
                  Tháng này
                </button>
              </div>

              <button
                onClick={() => setShowDailyStockModal(true)}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl text-xs transition-all shadow-xs cursor-pointer flex items-center space-x-1"
              >
                <span>📋 Chốt Kho Ca</span>
              </button>
            </div>
          </div>

          {/* STATS CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="text-[11px] font-bold text-slate-400 uppercase">Tổng Tồn Kho</div>
              <div className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
                {loading ? '...' : (inventoryData.stats?.totalStock || 0)} <span className="text-xs font-normal">món</span>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase">Tổng Số Món</div>
              <div className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1">
                {loading ? '...' : (inventoryData.stats?.totalProducts || 0)} <span className="text-xs font-normal">món</span>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase">Tồn Thấp (&lt;10)</div>
              <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
                {loading ? '...' : (inventoryData.stats?.lowStockCount || 0)} <span className="text-xs font-normal">món</span>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="text-[11px] font-bold text-red-600 dark:text-red-400 uppercase">Hết Hàng</div>
              <div className="text-xl font-black text-red-600 dark:text-red-400 mt-1">
                {loading ? '...' : (inventoryData.stats?.outOfStockCount || 0)} <span className="text-xs font-normal">món</span>
              </div>
            </div>
          </div>

          {/* DANH SÁCH SẢN PHẨM & TỒN KHO */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <h3 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wide">
                📍 Mức Tồn Kho Sản Phẩm Chi Nhánh ({selectedStore === 'store_Q1' ? 'Quận 1' : 'Thủ Đức'})
              </h3>
              
              <input
                type="text"
                placeholder="🔍 Tìm sản phẩm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-60 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-blue-500"
              />
            </div>

            {loading ? (
              <div className="text-center py-8 text-xs font-bold text-gray-400 animate-pulse">⏳ Đang tải tồn kho...</div>
            ) : (
              <div className="overflow-x-auto border border-gray-100 dark:border-slate-800 rounded-2xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-slate-800/80 text-gray-400 dark:text-slate-400 font-bold text-[10px] uppercase border-b border-gray-200 dark:border-slate-700">
                      <th className="p-3">Sản phẩm</th>
                      <th className="p-3">Danh mục</th>
                      <th className="p-3 text-center">Số lượng tồn</th>
                      <th className="p-3 text-center">Trạng thái</th>
                      <th className="p-3 text-center">Hành động Nhập Hàng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-gray-700 dark:text-slate-300 font-medium">
                    {(inventoryData.productStockDetails || [])
                      .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map(p => (
                        <tr key={p._id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50">
                          <td className="p-3 font-bold text-gray-900 dark:text-slate-100 flex items-center space-x-2">
                            {p.image_url && <img src={p.image_url} alt={p.name} className="w-7 h-7 rounded-lg object-cover" />}
                            <span>{p.name}</span>
                          </td>
                          <td className="p-3 uppercase text-[10px] font-bold text-gray-400">{p.category}</td>
                          <td className="p-3 text-center font-black text-blue-600 dark:text-blue-400 text-sm">
                            {p.stock} món
                          </td>
                          <td className="p-3 text-center">
                            {!p.is_available || p.stock === 0 ? (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">❌ HẾT HÀNG</span>
                            ) : p.stock < 10 ? (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">⚠️ SẮP HẾT (&lt;10)</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">✅ AN TOÀN</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleOpenStockEdit(p)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-[11px] transition-all shadow-2xs cursor-pointer flex items-center justify-center space-x-1 mx-auto"
                            >
                              <span>📥 Nhập Hàng / Cập Nhật</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 font-bold text-xs rounded-xl text-gray-700 dark:text-slate-200 transition-colors cursor-pointer"
          >
            Đóng cửa sổ
          </button>
        </div>

      </div>

      {/* 🔑 MODAL XÁC THỰC MÃ PIN 6 SỐ */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <form onSubmit={handleVerifyPinSubmit} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-5 border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-150 text-center">
            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/80 rounded-2xl flex items-center justify-center mx-auto text-2xl text-emerald-600 dark:text-emerald-400 shadow-xs">
              🔒
            </div>

            <div>
              <h3 className="font-black text-base text-gray-900 dark:text-slate-100 uppercase tracking-wide">Xác Thực Mã PIN 6 Số</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Nhập mã PIN do Admin cấp để hoàn tất nhập hàng / chốt kho</p>
            </div>

            <div>
              <input
                type="password"
                maxLength={6}
                required
                autoFocus
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                className="w-full text-center tracking-[0.5em] text-2xl font-black py-3 bg-gray-50 dark:bg-slate-800 border-2 border-emerald-300 dark:border-emerald-700 rounded-2xl focus:outline-none focus:border-emerald-500 text-emerald-600 dark:text-emerald-300"
              />
              {pinError && (
                <div className="text-xs font-bold text-red-500 dark:text-red-400 mt-2 animate-bounce">
                  ⚠️ {pinError}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowPinModal(false);
                  setPendingAction(null);
                }}
                className="py-2.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-xl text-xs transition-all shadow-md cursor-pointer uppercase"
              >
                ⚡ Xác thực PIN
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 📥 MODAL NHẬP HÀNG / ĐỔI TỒN KHO */}
      {showStockModal && editingItem && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <form onSubmit={handleStockUpdateWithPin} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-black text-base text-gray-900 dark:text-slate-100 uppercase">Nhập Hàng / Cập Nhật Kho</h3>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">{editingItem.name}</p>
              </div>
              <button type="button" onClick={() => setShowStockModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 font-bold text-sm cursor-pointer">✕ Đóng</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                  📦 Số lượng kho sau khi nhập / điều chỉnh (món):
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={editStockValue}
                  onChange={(e) => setEditStockValue(e.target.value)}
                  className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl px-4 py-2.5 text-base font-black text-emerald-600 dark:text-emerald-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/40 text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">
                💡 Yêu cầu nhập <b>mã PIN 6 số</b> do Admin cấp để hoàn tất nhập kho.
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowStockModal(false)}
                className="py-2.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-xl text-xs transition-all shadow-md cursor-pointer uppercase"
              >
                🔒 Nhập Hàng (Cần PIN)
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 📋 MODAL CHỐT KHO CA */}
      {showDailyStockModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <form onSubmit={handleDailyStockSubmitWithPin} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-black text-base text-gray-900 dark:text-slate-100 uppercase">Chốt Kho Ca Trực</h3>
                <p className="text-xs text-amber-600 dark:text-amber-400 font-bold mt-0.5">Tạo bản ghi chốt kho ca làm việc</p>
              </div>
              <button type="button" onClick={() => setShowDailyStockModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 font-bold text-sm cursor-pointer">✕ Đóng</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                  Loại hình chốt kho:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDailyStockType('start_of_day')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      dailyStockType === 'start_of_day' ? 'bg-blue-600 text-white shadow-2xs' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400'
                    }`}
                  >
                    🌅 Đầu ca / Đầu ngày
                  </button>
                  <button
                    type="button"
                    onClick={() => setDailyStockType('end_of_day')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      dailyStockType === 'end_of_day' ? 'bg-purple-600 text-white shadow-2xs' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400'
                    }`}
                  >
                    🌙 Cuối ca / Cuối ngày
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                  📝 Ghi chú chốt ca:
                </label>
                <textarea
                  rows="3"
                  value={dailyStockNote}
                  onChange={(e) => setDailyStockNote(e.target.value)}
                  placeholder="Ghi chú số liệu thực tế kiểm đếm tại quầy..."
                  className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl p-3 text-xs focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDailyStockModal(false)}
                className="py-2.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-black rounded-xl text-xs transition-all shadow-md cursor-pointer uppercase"
              >
                🔒 Chốt Kho (Cần PIN)
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default StaffInventoryModal;

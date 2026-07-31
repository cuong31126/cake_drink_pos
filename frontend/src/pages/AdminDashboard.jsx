import React, { useState, useEffect } from 'react';
import API from '../services/api';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'products' | 'users'

  // Tab 1: Overview States
  const [revenueStats, setRevenueStats] = useState({ totalRevenue: 0, totalOrders: 0, averageBill: 0 });
  const [topProducts, setTopProducts] = useState([]);
  const [slowProducts, setSlowProducts] = useState([]);
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Tab 2: Products Management States
  const [productsList, setProductsList] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editPriceInput, setEditPriceInput] = useState('');
  const [editDiscountInput, setEditDiscountInput] = useState('0');
  const [editIsOnSale, setEditIsOnSale] = useState(false);
  const [editSizeLExtraInput, setEditSizeLExtraInput] = useState('10000');
  const [editSizeXLExtraInput, setEditSizeXLExtraInput] = useState('15000');
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [editStatus, setEditStatus] = useState('selling');
  const [editAvailableQ1, setEditAvailableQ1] = useState(true);
  const [editAvailableThuDuc, setEditAvailableThuDuc] = useState(true);

  // Tab 3: Users Role Management States
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Tab 4: Inventory Management States
  const [inventoryStoreFilter, setInventoryStoreFilter] = useState('all'); // 'all' | 'store_Q1' | 'store_ThuDuc'
  const [inventoryPeriod, setInventoryPeriod] = useState('day'); // 'day' | 'week' | 'month'
  const [inventoryData, setInventoryData] = useState({ stats: {}, productStockDetails: [], logs: [] });
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [editingStockItem, setEditingStockItem] = useState(null);
  const [editingStockStore, setEditingStockStore] = useState('store_Q1');
  const [editStockValue, setEditStockValue] = useState('');
  const [showStockModal, setShowStockModal] = useState(false);

  // PIN Verification Modal States (6 digits)
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [pendingPinAction, setPendingPinAction] = useState(null);

  // Daily Stock Update Modal States (Chốt kho đầu/cuối ngày)
  const [showDailyStockModal, setShowDailyStockModal] = useState(false);
  const [dailyStockType, setDailyStockType] = useState('start_of_day');
  const [dailyStockStore, setDailyStockStore] = useState('store_Q1');
  const [dailyStockNote, setDailyStockNote] = useState('');

  // Fetch Dashboard Stats
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [revRes, topRes, slowRes, stockRes] = await Promise.all([
        API.get('/dashboard/revenue-stats'),
        API.get('/dashboard/top-selling'),
        API.get('/dashboard/slow-moving'),
        API.get('/dashboard/low-stock')
      ]);

      if (revRes.data.success) setRevenueStats(revRes.data.data);
      if (topRes.data.success) setTopProducts(topRes.data.data);
      if (slowRes.data.success) setSlowProducts(slowRes.data.data);
      if (stockRes.data.success) setLowStockAlerts(stockRes.data.data);
    } catch (error) {
      console.error("Lỗi tải dữ liệu Dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch All Products for Price & Promotion Management
  const fetchProducts = async () => {
    try {
      const res = await API.get('/products');
      if (res.data.success) {
        setProductsList(res.data.data);
      }
    } catch (err) {
      console.error("Lỗi tải danh sách sản phẩm:", err);
    }
  };

  // Fetch All Users for Role Management
  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await API.get('/users');
      if (res.data.success) {
        setUsersList(res.data.data);
      }
    } catch (err) {
      console.error("Lỗi tải danh sách người dùng:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Fetch Inventory Summary & Stock List
  const fetchInventoryData = async () => {
    try {
      setLoadingInventory(true);
      const res = await API.get(`/inventory/summary?period=${inventoryPeriod}&store_id=${inventoryStoreFilter}`);
      if (res.data.success) {
        setInventoryData(res.data.data);
      }
    } catch (err) {
      console.error("Lỗi tải dữ liệu tồn kho:", err);
    } finally {
      setLoadingInventory(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchProducts();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (activeTab === 'inventory') {
      fetchInventoryData();
    }
  }, [activeTab, inventoryStoreFilter, inventoryPeriod]);

  // 🔑 HÀM KÍCH HOẠT MODAL PIN XÁC THỰC 6 SỐ CHO HÀNH ĐỘNG CỦA STAFF/ADMIN
  const requestPinVerification = (onSuccessCallback) => {
    const currentRole = user?.role || localStorage.getItem('userRole');
    if (currentRole === 'admin') {
      // 🛡️ ĐẶC QUYỀN ADMIN: Bỏ qua bước nhập PIN 6 số, thực thi lưu trực tiếp!
      onSuccessCallback();
      return;
    }
    setPendingPinAction(() => onSuccessCallback);
    setPinInput('');
    setPinError('');
    setShowPinModal(true);
  };

  const handleVerifyPinSubmit = async (e) => {
    e.preventDefault();
    if (!pinInput || pinInput.length !== 6) {
      setPinError('Vui lòng nhập đầy đủ 6 chữ số mã PIN.');
      return;
    }

    try {
      const res = await API.post('/auth/verify-pin', { pin: pinInput });
      if (res.data.success) {
        setShowPinModal(false);
        setPinError('');
        if (pendingPinAction) {
          await pendingPinAction();
          setPendingPinAction(null);
        }
      }
    } catch (err) {
      setPinError(err.response?.data?.message || 'Mã PIN 6 số không chính xác!');
    }
  };

  // 📦 HÀM MỞ MODAL ĐIỀU CHỈNH KHO SẢN PHẨM
  const handleOpenStockEdit = (product, storeId) => {
    setEditingStockItem(product);
    const targetStore = storeId || (inventoryStoreFilter !== 'all' ? inventoryStoreFilter : 'store_Q1');
    setEditingStockStore(targetStore);
    
    let currentStockVal = 0;
    if (product.inventory && Array.isArray(product.inventory)) {
      const inv = product.inventory.find(i => i.store_id === targetStore);
      if (inv) currentStockVal = inv.stock || 0;
    } else if (typeof product.stock === 'number') {
      currentStockVal = product.stock;
    }
    setEditStockValue(currentStockVal.toString());
    setShowStockModal(true);
  };

  // Thực thi lưu kho sau khi đã vượt qua bước xác thực PIN 6 số
  const executeStockUpdate = async () => {
    if (!editingStockItem) return;
    try {
      const newStockNum = Number(editStockValue);
      const res = await API.patch(`/products/${editingStockItem._id}/stock`, {
        store_id: editingStockStore,
        stock: newStockNum
      });

      if (res.data.success) {
        // Ghi bản ghi nhật ký tồn kho
        try {
          await API.post('/inventory/log', {
            store_id: editingStockStore,
            product_id: editingStockItem._id,
            product_name: editingStockItem.name,
            type: 'manual_adjustment',
            previous_stock: editingStockItem.stock || 0,
            new_stock: newStockNum,
            note: 'Cập nhật kho thủ công'
          });
        } catch (logErr) {
          console.warn("Lỗi ghi log tồn kho:", logErr);
        }

        alert(`✅ CẬP NHẬT TỒN KHO THÀNH CÔNG!\n\n- Sản phẩm: ${editingStockItem.name}\n- Chi nhánh: ${editingStockStore}\n- Số lượng kho mới: ${newStockNum} món`);
        setShowStockModal(false);
        setEditingStockItem(null);
        fetchInventoryData();
        fetchProducts();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi khi cập nhật số lượng tồn kho.");
    }
  };

  const handleStockUpdateWithPin = (e) => {
    e.preventDefault();
    requestPinVerification(executeStockUpdate);
  };

  // 📋 HÀM THỰC THI CHỐT KHO ĐẦU NGÀY / CUỐI NGÀY SANH KHI ĐÃ NHẬP PIN
  const executeDailyStockSave = async () => {
    try {
      const res = await API.post('/inventory/log', {
        store_id: dailyStockStore,
        type: dailyStockType,
        previous_stock: inventoryData.stats?.totalStock || 0,
        new_stock: inventoryData.stats?.totalStock || 0,
        note: dailyStockNote || (dailyStockType === 'start_of_day' ? 'Chốt kho đầu ngày' : 'Chốt kho cuối ngày')
      });

      if (res.data.success) {
        alert(`✅ Đã thực hiện [${dailyStockType === 'start_of_day' ? 'CHỐT KHO ĐẦU NGÀY' : 'CHỐT KHO CUỐI NGÀY'}] thành công cho chi nhánh ${dailyStockStore.toUpperCase()}!`);
        setShowDailyStockModal(false);
        setDailyStockNote('');
        fetchInventoryData();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi khi lưu báo cáo chốt kho.");
    }
  };

  const handleDailyStockSubmitWithPin = (e) => {
    e.preventDefault();
    requestPinVerification(executeDailyStockSave);
  };

  // 💰 HÀM ĐIỀU CHỈNH GIÁ & KHUYẾN MÃI SẢN PHẨM (LƯU MONGODB)
  const handleSavePriceAndDiscount = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;

    try {
      const newPrice = Number(editPriceInput);
      const discountPct = Number(editDiscountInput) || 0;
      const calculatedSalePrice = discountPct > 0 ? newPrice * (1 - discountPct / 100) : newPrice;
      const sizeL = Number(editSizeLExtraInput) || 0;
      const sizeXL = Number(editSizeXLExtraInput) || 0;

      const res = await API.put(`/products/${selectedProduct._id}`, {
        price: newPrice,
        origin_price: newPrice,
        discount_percent: discountPct,
        sale_price: calculatedSalePrice,
        is_on_sale: editIsOnSale,
        attributes: {
          ...selectedProduct.attributes,
          size_L_extra: sizeL,
          size_XL_extra: sizeXL,
          sizes: [
            { size: 'M', extra_price: 0 },
            { size: 'L', extra_price: sizeL },
            { size: 'XL', extra_price: sizeXL }
          ]
        }
      });

      if (res.data.success) {
        // 🔔 TỰ ĐỘNG GỬI THÔNG BÁO KHUYẾN MÃI ĐẾN TẤT CẢ KHÁCH HÀNG (USER)
        if (editIsOnSale && discountPct > 0) {
          try {
            await API.post('/notifications', {
              user_id: 'all_users',
              title: `🏷️ KHUYẾN MÃI: ${selectedProduct.name} giảm ${discountPct}%!`,
              message: `Món ${selectedProduct.name} đang được giảm giá ${discountPct}%! Giá chỉ còn ${calculatedSalePrice.toLocaleString()} đ (giá gốc ${newPrice.toLocaleString()} đ). Đặt ngay kẻo hết!`,
              type: 'promotion'
            });
          } catch (notiErr) {
            console.warn("Lỗi gửi thông báo khuyến mãi:", notiErr);
          }
        }

        alert(`✅ ĐÃ CẬP NHẬT THÀNH CÔNG VÀO MONGODB!\n\n- Món: ${selectedProduct.name}\n- Giá mới: ${newPrice.toLocaleString()} đ\n- Khuyến mãi: ${editIsOnSale ? `Giảm ${discountPct}% (Còn ${calculatedSalePrice.toLocaleString()} đ)` : 'Không áp dụng'}`);
        setShowPriceModal(false);
        setSelectedProduct(null);
        fetchProducts();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi khi cập nhật giá & khuyến mãi.");
    }
  };

  // ⚙️ HÀM CẬP NHẬT TRẠNG THÁI (LƯU MONGODB)
  const handleSaveStatus = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;

    try {
      const currentInventory = selectedProduct.inventory || [];
      const getStock = (storeId) => currentInventory.find(i => i.store_id === storeId)?.stock || 0;

      const res = await API.put(`/products/${selectedProduct._id}`, {
        status: editStatus,
        inventory: [
          { store_id: 'store_Q1', stock: getStock('store_Q1'), is_available: editAvailableQ1 },
          { store_id: 'store_ThuDuc', stock: getStock('store_ThuDuc'), is_available: editAvailableThuDuc }
        ]
      });

      if (res.data.success) {
        alert(`✅ Cập nhật trạng thái cho món [${selectedProduct.name}] thành công!`);
        setShowStatusModal(false);
        setSelectedProduct(null);
        fetchProducts();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi khi cập nhật trạng thái.");
    }
  };

  // 👑 HÀM NÂNG QUYỀN VAI TRÒ CHO USER (USER -> STAFF / ADMIN)
  const handleUpdateRoleSubmit = async (userId, newRole, newStoreId) => {
    const confirmChange = window.confirm(`Bạn có chắc chắn muốn nâng/thay đổi vai trò người dùng này sang: [${newRole.toUpperCase()}]?`);
    if (!confirmChange) return;

    try {
      const res = await API.patch(`/users/${userId}/role`, {
        role: newRole,
        store_id: newStoreId
      });

      if (res.data.success) {
        alert(res.data.message || "Đã nâng quyền tài khoản thành công!");
        setUsersList(prev => prev.map(u => u._id === userId ? { ...u, role: newRole, store_id: newStoreId } : u));
        fetchUsers();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Không thể thay đổi vai trò tài khoản.");
    }
  };

  // 🔑 HÀM ĐẶT MÃ PIN 6 SỐ XÁC THỰC TỒN KHO CHO NHÂN VIÊN
  const handleUpdatePinSubmit = async (userId, currentPin) => {
    const newPin = window.prompt("🔑 Nhập mã PIN 6 số mới cho tài khoản này (Dùng để xác thực Nhập hàng & Tồn kho):", currentPin || "123456");
    if (!newPin) return;
    if (newPin.trim().length !== 6 || isNaN(newPin.trim())) {
      alert("❌ Mã PIN phải bao gồm đúng 6 chữ số (Ví dụ: 123456)!");
      return;
    }

    try {
      const userToUpdate = usersList.find(u => u._id === userId);
      const res = await API.patch(`/users/${userId}/role`, {
        role: userToUpdate?.role || 'staff',
        store_id: userToUpdate?.store_id || 'store_Q1',
        pin: newPin.trim()
      });

      if (res.data.success) {
        alert(`✅ ĐÃ ĐẶT MÃ PIN THÀNH CÔNG!\n\nMã PIN 6 số mới của ${userToUpdate?.name || userToUpdate?.email} là: ${newPin.trim()}`);
        fetchUsers();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Không thể cập nhật mã PIN.");
    }
  };

  // 🔐 HÀM ĐỔI MẬT KHẨU TÀI KHOẢN TRỰC TIẾP CHO ADMIN
  const handleUpdatePasswordSubmit = async (userId, userName) => {
    const newPassword = window.prompt(`🔐 Nhập mật khẩu đăng nhập mới cho tài khoản [${userName || 'Người dùng'}]:`);
    if (newPassword === null) return;
    if (!newPassword || newPassword.trim().length < 6) {
      alert("❌ Mật khẩu mới phải bao gồm ít nhất 6 ký tự!");
      return;
    }

    try {
      const userToUpdate = usersList.find(u => u._id === userId);
      const res = await API.patch(`/users/${userId}/role`, {
        role: userToUpdate?.role || 'staff',
        store_id: userToUpdate?.store_id || 'store_Q1',
        password: newPassword.trim()
      });

      if (res.data.success) {
        alert(`✅ ĐÃ ĐỔI MẬT KHẨU THÀNH CÔNG!\n\nMật khẩu đăng nhập mới của ${userName || 'tài khoản'} đã được lưu an toàn vào MongoDB.`);
        fetchUsers();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Không thể đổi mật khẩu.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center font-sans">
        <div className="text-sm font-bold text-gray-400 uppercase tracking-wider animate-pulse">
          ⏳ Đang tổng hợp dữ liệu tài chính & tài khoản MongoDB...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen transition-colors duration-300 bg-gray-50 dark:bg-slate-950 text-gray-800 dark:text-slate-100 pt-20 px-6 max-w-7xl mx-auto pb-16 font-sans">
      
      {/* 👑 ADMIM HEADER & TABS NAVIGATION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
            <span>👑 TỔNG QUAN QUẢN TRỊ ADMIN</span>
          </h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Báo cáo tài chính, Điều chỉnh giá, Khuyến mãi & Phân quyền tài khoản</p>
        </div>

        {/* 🎛️ TABS CHUYỂN ĐỔI CHỨC NĂNG ADMIN */}
        <div className="flex bg-gray-200 dark:bg-slate-800 p-1 rounded-2xl">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'overview' ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 shadow-xs' : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100'
            }`}
          >
            📊 1. Báo Cáo Tài Chính
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'products' ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 shadow-xs' : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100'
            }`}
          >
            🏷️ 2. Sửa Giá & Khuyến Mãi Món
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'users' ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 shadow-xs' : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100'
            }`}
          >
            👥 3. Phân Quyền
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'inventory' ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 shadow-xs' : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100'
            }`}
          >
            📦 4. Quản Lý Tồn Kho
          </button>
        </div>
      </div>

      {/* ========================================================
          📊 TAB 1: BÁO CÁO DOANH THU & THỐNG KÊ TÀI CHÍNH
         ======================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-2xs hover:shadow-md transition-shadow">
              <div className="text-xs font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">Tổng Doanh Thu Hóa Đơn</div>
              <div className="text-3xl font-black text-gray-800 dark:text-slate-100 mt-2">{(revenueStats.totalRevenue || 0).toLocaleString()} đ</div>
              <div className="text-[11px] text-green-600 dark:text-green-400 font-bold mt-1">↑ Dữ liệu tổng hợp trực tiếp từ DB</div>
            </div>
            
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-2xs hover:shadow-md transition-shadow">
              <div className="text-xs font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">Hóa Đơn Hoàn Thành</div>
              <div className="text-3xl font-black text-gray-800 dark:text-slate-100 mt-2">{revenueStats.totalOrders || 0} đơn</div>
              <div className="text-[11px] text-gray-400 dark:text-slate-400 font-medium mt-1">Hóa đơn đã chốt và chuyển khoản thành công</div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-2xs hover:shadow-md transition-shadow">
              <div className="text-xs font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">Giá trị đơn trung bình</div>
              <div className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-2">{(revenueStats.averageBill || 0).toLocaleString()} đ</div>
              <div className="text-[11px] text-blue-600 dark:text-blue-400 font-bold mt-1">Sức tiêu dùng thực tế tại các bàn</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-2xs lg:col-span-2">
              <h3 className="text-sm font-black text-gray-800 dark:text-slate-100 mb-4 uppercase tracking-wider flex items-center">
                🔥 Món bán chạy nhất (Top Selling)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-slate-800 text-gray-400 dark:text-slate-400 font-bold uppercase tracking-wider pb-3">
                      <th className="pb-3">Tên sản phẩm</th>
                      <th className="pb-3 text-center">Số lượng bán</th>
                      <th className="pb-3 text-right">Doanh thu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-slate-800 text-gray-700 dark:text-slate-300 font-medium">
                    {topProducts.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="py-4 text-center text-gray-400 dark:text-slate-500">Chưa ghi nhận món ăn bán chạy</td>
                      </tr>
                    ) : topProducts.map((prod) => (
                      <tr key={prod._id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 font-bold text-gray-800 dark:text-slate-200">{prod.name}</td>
                        <td className="py-3 text-center font-bold text-blue-600 dark:text-blue-400">{prod.totalQuantity} món</td>
                        <td className="py-3 text-right font-black text-gray-900 dark:text-slate-100">{(prod.revenue || 0).toLocaleString()} đ</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <h3 className="text-sm font-black text-red-600 dark:text-red-400 mb-4 uppercase tracking-wider flex items-center">
                  ⚠️ Cảnh báo tồn kho thấp (Low Stock)
                </h3>
                <div className="space-y-3 overflow-y-auto max-h-[30vh]">
                  {lowStockAlerts.length === 0 ? (
                    <div className="text-center text-gray-400 dark:text-slate-500 text-xs py-4 font-bold">Mức kho các chi nhánh đều ổn định</div>
                  ) : lowStockAlerts.map((alert, idx) => (
                    <div key={idx} className="p-3 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-100 dark:border-red-900/40 flex items-center justify-between text-xs font-bold">
                      <div>
                        <div className="font-bold text-gray-800 dark:text-slate-200">{alert.name}</div>
                        <div className="text-[10px] text-gray-400 dark:text-slate-400 mt-0.5">Chi nhánh: <span className="uppercase text-blue-600 dark:text-blue-400">{alert.store_id}</span></div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                        alert.current_stock === 0 ? 'bg-red-200 dark:bg-red-900/80 text-red-800 dark:text-red-200 animate-pulse' : 'bg-amber-200 dark:bg-amber-900/80 text-amber-800 dark:text-amber-200'
                      }`}>
                        {alert.current_stock === 0 ? 'HẾT HÀNG' : `Còn: ${alert.current_stock}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          🏷️ TAB 2: ĐIỀU CHỈNH GIÁ & THÊM KHUYẾN MÃI TỪNG MÓN
         ======================================================== */}
      {activeTab === 'products' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-2xs p-6 animate-in fade-in duration-150 space-y-4">
          <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="font-black text-base text-gray-800 dark:text-slate-100 uppercase tracking-wide">Quản Lý Giá Bán & Khuyến Mãi Món Ăn</h3>
              <p className="text-xs text-gray-400 dark:text-slate-400">Thay đổi giá niêm yết hoặc cài đặt giảm giá phần trăm trực tiếp vào menu</p>
            </div>
            <button onClick={fetchProducts} className="px-3 py-1.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer">
              🔄 Làm mới thực đơn
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {productsList.map((product) => (
              <div key={product._id} className="bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700/60 rounded-2xl p-4 flex flex-col justify-between space-y-3 hover:border-purple-300 dark:hover:border-purple-600 transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-slate-100 text-sm">{product.name}</h4>
                    <span className="text-[10px] text-gray-400 dark:text-slate-400 uppercase font-bold">{product.category}</span>
                  </div>
                  {product.is_on_sale ? (
                    <span className="bg-red-500 text-white font-black text-[10px] px-2 py-0.5 rounded-full shadow-2xs uppercase animate-pulse">
                      🏷️ SALE {product.discount_percent}%
                    </span>
                  ) : (
                    <span className="bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300 font-bold text-[10px] px-2 py-0.5 rounded-full">
                      Giá chuẩn
                    </span>
                  )}
                </div>

                <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-gray-200/80 dark:border-slate-800 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500 dark:text-slate-400 font-bold">Giá hiện tại:</span>
                    <span className="font-black text-blue-600 dark:text-blue-400">{product.price.toLocaleString()} đ</span>
                  </div>

                  {product.is_on_sale && (
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400 font-bold">Giá sau giảm:</span>
                      <span className="font-black text-red-600 dark:text-red-400">{product.sale_price ? product.sale_price.toLocaleString() : (product.price * (1 - product.discount_percent/100)).toLocaleString()} đ</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button
                    onClick={() => {
                      setSelectedProduct(product);
                      setEditPriceInput((product.origin_price || product.price || 0).toString());
                      setEditDiscountInput((product.discount_percent || 0).toString());
                      setEditIsOnSale(product.is_on_sale || false);
                      setEditSizeLExtraInput((product.attributes?.size_L_extra ?? product.attributes?.sizes?.find(s => s.size === 'L')?.extra_price ?? 10000).toString());
                      setEditSizeXLExtraInput((product.attributes?.size_XL_extra ?? product.attributes?.sizes?.find(s => s.size === 'XL')?.extra_price ?? 15000).toString());
                      setShowPriceModal(true);
                    }}
                    className="w-full py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold rounded-xl text-[10px] transition-all shadow-2xs cursor-pointer flex items-center justify-center space-x-1"
                  >
                    <span>✏️ Giá & KM</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedProduct(product);
                      setEditStatus(product.status || 'selling');
                      setEditAvailableQ1(product.inventory?.find(i => i.store_id === 'store_Q1')?.is_available !== false);
                      setEditAvailableThuDuc(product.inventory?.find(i => i.store_id === 'store_ThuDuc')?.is_available !== false);
                      setShowStatusModal(true);
                    }}
                    className="w-full py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold rounded-xl text-[10px] transition-all shadow-2xs cursor-pointer flex items-center justify-center space-x-1"
                  >
                    <span>⚙️ Trạng Thái</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================
          👥 TAB 3: PHÂN QUYỀN TÀI KHOẢN (USER -> STAFF / ADMIN)
         ======================================================== */}
      {activeTab === 'users' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-2xs p-6 animate-in fade-in duration-150 space-y-4">
          <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="font-black text-base text-gray-800 dark:text-slate-100 uppercase tracking-wide">Quản Lý Người Dùng, Nâng Quyền & Đặt Mã PIN</h3>
              <p className="text-xs text-gray-400 dark:text-slate-400">Phân quyền tài khoản và cấu hình mã PIN 6 số xác thực tồn kho cho Nhân viên (Staff)</p>
            </div>
            <button onClick={fetchUsers} className="px-3 py-1.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer">
              🔄 Làm mới danh sách
            </button>
          </div>

          {loadingUsers ? (
            <div className="text-center py-8 text-xs text-gray-400 dark:text-slate-500 font-medium">Đang nạp danh sách tài khoản người dùng...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-800 text-gray-400 dark:text-slate-400 font-bold text-[11px] uppercase tracking-wider border-b border-gray-200 dark:border-slate-700">
                    <th className="p-4">Tên tài khoản</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Vai trò hiện tại</th>
                    <th className="p-4">Chi nhánh làm việc</th>
                    <th className="p-4 text-center">🔑 Mã PIN (6 số)</th>
                    <th className="p-4 text-center">Hành động Phân Quyền</th>
                  </tr>
                </thead>
                <tbody className="text-xs font-medium text-gray-600 dark:text-slate-300 divide-y divide-gray-100 dark:divide-slate-800">
                  {usersList.map((u) => (
                    <tr key={u._id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-4 font-bold text-gray-900 dark:text-slate-100">{u.name || 'Chưa cập nhật tên'}</td>
                      <td className="p-4 font-mono text-gray-600 dark:text-slate-400">{u.email}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          u.role === 'admin' ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800' :
                          u.role === 'staff' ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400'
                        }`}>
                          {u.role === 'admin' ? '👑 ADMIN' : u.role === 'staff' ? '👨‍🍳 STAFF' : '👤 USER'}
                        </span>
                      </td>
                      <td className="p-4">
                        <select
                          value={u.store_id || 'store_Q1'}
                          onChange={(e) => handleUpdateRoleSubmit(u._id, u.role, e.target.value)}
                          className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-amber-800 dark:text-amber-300 cursor-pointer"
                        >
                          <option value="store_Q1">Chi nhánh 1 (Quận 1)</option>
                          <option value="store_ThuDuc">Chi nhánh 2 (Thủ Đức)</option>
                        </select>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleUpdatePinSubmit(u._id, u.pin)}
                            className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-mono font-bold text-xs rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                          >
                            🔑 {u.pin || '123456'} (PIN)
                          </button>
                          <button
                            onClick={() => handleUpdatePasswordSubmit(u._id, u.name || u.email)}
                            className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-bold text-xs rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                          >
                            🔐 Đổi Mật Khẩu
                          </button>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => handleUpdateRoleSubmit(u._id, 'user', u.store_id || 'store_Q1')}
                            disabled={u.role === 'user'}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                              u.role === 'user' ? 'bg-gray-100 dark:bg-slate-800 text-gray-300 dark:text-slate-600 cursor-not-allowed' : 'bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200'
                            }`}
                          >
                            Hạ thành User
                          </button>
                          <button
                            onClick={() => handleUpdateRoleSubmit(u._id, 'staff', u.store_id || 'store_Q1')}
                            disabled={u.role === 'staff'}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                              u.role === 'staff' ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-300 dark:text-blue-700 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-2xs'
                            }`}
                          >
                            ⚡ Nâng lên Staff
                          </button>
                          <button
                            onClick={() => handleUpdateRoleSubmit(u._id, 'admin', u.store_id || 'store_Q1')}
                            disabled={u.role === 'admin'}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                              u.role === 'admin' ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-300 dark:text-purple-700 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 text-white shadow-2xs'
                            }`}
                          >
                            👑 Nâng lên Admin
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          📦 TAB 4: QUẢN LÝ TỒN KHO & CHỐT KHO BÁO CÁO (DAY/WEEK/MONTH)
         ======================================================== */}
      {activeTab === 'inventory' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          
          {/* 🎛️ KHU VỰC BỘ LỌC CHI NHÁNH & THỜI GIAN & CHỐT KHO */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-5 shadow-2xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h3 className="font-black text-base text-gray-800 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
                <span>📦 QUẢN LÝ TỒN KHO & CHỐT KHO</span>
              </h3>
              <p className="text-xs text-gray-400 dark:text-slate-400">Kiểm soát tồn kho thực tế, xem báo cáo tổng kết Ngày/Tuần/Tháng & Chốt kho đầu/cuối ngày</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Lọc theo Chi Nhánh */}
              <div className="flex items-center space-x-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
                <span className="px-2 text-gray-500 dark:text-slate-400">Chi nhánh:</span>
                <select
                  value={inventoryStoreFilter}
                  onChange={(e) => setInventoryStoreFilter(e.target.value)}
                  className="bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-200 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 cursor-pointer focus:outline-none font-bold"
                >
                  <option value="all">🏢 Tất cả chi nhánh</option>
                  <option value="store_Q1">📍 Chi nhánh 1 (Quận 1)</option>
                  <option value="store_ThuDuc">📍 Chi nhánh 2 (Thủ Đức)</option>
                </select>
              </div>

              {/* Lọc theo Chu kỳ Báo cáo */}
              <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setInventoryPeriod('day')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${inventoryPeriod === 'day' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs' : 'text-gray-500 hover:text-gray-900 dark:text-slate-400'}`}
                >
                  📅 Hôm nay
                </button>
                <button
                  onClick={() => setInventoryPeriod('week')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${inventoryPeriod === 'week' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs' : 'text-gray-500 hover:text-gray-900 dark:text-slate-400'}`}
                >
                  📆 Tuần này
                </button>
                <button
                  onClick={() => setInventoryPeriod('month')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${inventoryPeriod === 'month' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs' : 'text-gray-500 hover:text-gray-900 dark:text-slate-400'}`}
                >
                  🗓️ Tháng này
                </button>
              </div>

              {/* Nút Chốt Kho */}
              <button
                onClick={() => setShowDailyStockModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-black rounded-xl text-xs transition-all shadow-sm cursor-pointer flex items-center space-x-1.5"
              >
                <span>📋 Chốt Kho Đầu / Cuối Ngày</span>
              </button>
            </div>
          </div>

          {/* 📊 METRICS THỐNG KÊ TỒN KHO */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-2xs">
              <div className="text-xs font-bold text-gray-400 dark:text-slate-400 uppercase">Tổng Tồn Kho Thực Tế</div>
              <div className="text-2xl font-black text-gray-900 dark:text-slate-100 mt-1">
                {loadingInventory ? '...' : (inventoryData.stats?.totalStock || 0)} <span className="text-xs font-normal text-gray-400">món</span>
              </div>
              <div className="text-[10px] text-blue-600 dark:text-blue-400 font-bold mt-1">Số lượng tổng cộng trong kho</div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-2xs">
              <div className="text-xs font-bold text-gray-400 dark:text-slate-400 uppercase">Tổng Số Món Quản Lý</div>
              <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
                {loadingInventory ? '...' : (inventoryData.stats?.totalProducts || 0)} <span className="text-xs font-normal text-gray-400">sản phẩm</span>
              </div>
              <div className="text-[10px] text-purple-500 font-bold mt-1">Đang kinh doanh trên menu</div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-2xs">
              <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase">Cảnh Báo Tồn Thấp (&lt; 10)</div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                {loadingInventory ? '...' : (inventoryData.stats?.lowStockCount || 0)} <span className="text-xs font-normal text-amber-400">món</span>
              </div>
              <div className="text-[10px] text-amber-600 font-bold mt-1">Cần chuẩn bị nhập thêm nguyên liệu</div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-2xs">
              <div className="text-xs font-bold text-red-600 dark:text-red-400 uppercase">Hết Hàng Trong Kho</div>
              <div className="text-2xl font-black text-red-600 dark:text-red-400 mt-1">
                {loadingInventory ? '...' : (inventoryData.stats?.outOfStockCount || 0)} <span className="text-xs font-normal text-red-400">món</span>
              </div>
              <div className="text-[10px] text-red-500 font-bold mt-1">Ngừng nhận order tại chi nhánh</div>
            </div>
          </div>

          {/* 📋 BẢNG DANH SÁCH SẢN PHẨM & TỒN KHO THỰC TẾ */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-2xs p-6 space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-gray-100 dark:border-slate-800 pb-4">
              <div>
                <h4 className="font-bold text-sm text-gray-800 dark:text-slate-100 uppercase tracking-wide">Danh Sách Sản Phẩm & Mức Kho Chi Nhánh</h4>
                <p className="text-xs text-gray-400 dark:text-slate-400">Xem và cập nhật số lượng tồn kho từng món (Bảo mật bằng mã PIN 6 số cho Staff)</p>
              </div>
              
              <div className="w-full md:w-64">
                <input
                  type="text"
                  placeholder="🔍 Tìm tên món ăn..."
                  value={stockSearchQuery}
                  onChange={(e) => setStockSearchQuery(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3.5 py-1.5 text-xs focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>
            </div>

            {loadingInventory ? (
              <div className="text-center py-10 text-xs text-gray-400 dark:text-slate-500 font-bold animate-pulse">
                ⏳ Đang tải danh sách tồn kho chi nhánh...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-slate-800/70 text-gray-400 dark:text-slate-400 font-bold text-[11px] uppercase tracking-wider border-b border-gray-200 dark:border-slate-700">
                      <th className="p-3.5">Món ăn</th>
                      <th className="p-3.5">Danh mục</th>
                      <th className="p-3.5 text-center">Số lượng tồn</th>
                      <th className="p-3.5 text-center">Trạng thái kho</th>
                      <th className="p-3.5 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs font-medium divide-y divide-gray-100 dark:divide-slate-800">
                    {(inventoryData.productStockDetails || [])
                      .filter(p => p.name.toLowerCase().includes(stockSearchQuery.toLowerCase()))
                      .map((prod) => (
                        <tr key={prod._id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-3.5 font-bold text-gray-900 dark:text-slate-100 flex items-center space-x-2">
                            {prod.image_url && <img src={prod.image_url} alt={prod.name} className="w-7 h-7 rounded-lg object-cover" />}
                            <span>{prod.name}</span>
                          </td>
                          <td className="p-3.5 text-gray-500 dark:text-slate-400 uppercase font-bold text-[10px]">{prod.category}</td>
                          <td className="p-3.5 text-center font-black text-sm text-blue-600 dark:text-blue-400">
                            {prod.stock} món
                          </td>
                          <td className="p-3.5 text-center">
                            {!prod.is_available || prod.stock === 0 ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300">
                                ❌ HẾT HÀNG
                              </span>
                            ) : prod.stock < 10 ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300">
                                ⚠️ SẮP HẾT (&lt;10)
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300">
                                ✅ AN TOÀN
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-center">
                            <button
                              onClick={() => handleOpenStockEdit(prod, inventoryStoreFilter === 'all' ? 'store_Q1' : inventoryStoreFilter)}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-[11px] transition-all shadow-2xs cursor-pointer"
                            >
                              ✏️ Đổi Số Lượng Kho
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 📝 NẠP BẢNG NHẬT KÝ BIẾN ĐỘNG & CHỐT KHO MỚI NHẤT */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-2xs p-6 space-y-4">
            <h4 className="font-bold text-sm text-gray-800 dark:text-slate-100 uppercase tracking-wide border-b border-gray-100 dark:border-slate-800 pb-3">
              📜 Nhật Ký Biến Động & Chốt Kho Mới Nhất ({inventoryPeriod === 'day' ? 'Hôm nay' : inventoryPeriod === 'week' ? 'Tuần này' : 'Tháng này'})
            </h4>

            {(!inventoryData.logs || inventoryData.logs.length === 0) ? (
              <div className="text-center py-6 text-xs text-gray-400 dark:text-slate-500 font-medium">
                Chưa ghi nhận bản ghi chốt kho hoặc biến động trong khoảng thời gian này.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-slate-800/60 text-gray-400 dark:text-slate-400 font-bold text-[10px] uppercase border-b border-gray-200 dark:border-slate-700">
                      <th className="p-3">Thời gian</th>
                      <th className="p-3">Chi nhánh</th>
                      <th className="p-3">Loại hành động</th>
                      <th className="p-3">Tên sản phẩm / Nội dung</th>
                      <th className="p-3 text-center">Tồn cũ ➔ Tồn mới</th>
                      <th className="p-3">Người thực hiện</th>
                      <th className="p-3">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-gray-700 dark:text-slate-300">
                    {inventoryData.logs.map((log) => (
                      <tr key={log._id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-mono text-[11px] text-gray-500 dark:text-slate-400">
                          {new Date(log.createdAt).toLocaleString('vi-VN')}
                        </td>
                        <td className="p-3 font-bold uppercase text-amber-600 dark:text-amber-400">{log.store_id}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            log.type === 'start_of_day' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                            log.type === 'end_of_day' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}>
                            {log.type === 'start_of_day' ? '🌅 Đầu ngày' : log.type === 'end_of_day' ? '🌙 Cuối ngày' : '✏️ Điều chỉnh'}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-gray-900 dark:text-slate-100">{log.product_name}</td>
                        <td className="p-3 text-center font-bold text-blue-600 dark:text-blue-400">
                          {log.previous_stock} ➔ {log.new_stock}
                        </td>
                        <td className="p-3 font-medium text-gray-600 dark:text-slate-400">{log.performed_by}</td>
                        <td className="p-3 italic text-gray-400 dark:text-slate-500">{log.note || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 🔑 MODAL XÁC THỰC MÃ PIN 6 SỐ CHO STAFF / ADMIN */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <form onSubmit={handleVerifyPinSubmit} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-5 border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-150 text-center">
            <div className="w-14 h-14 bg-purple-100 dark:bg-purple-950/80 rounded-2xl flex items-center justify-center mx-auto text-2xl text-purple-600 dark:text-purple-400 shadow-xs">
              🔒
            </div>

            <div>
              <h3 className="font-black text-base text-gray-900 dark:text-slate-100 uppercase tracking-wide">Xác Thực Mã PIN 6 Số</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Vui lòng nhập mã PIN bảo mật để hoàn tất cập nhật tồn kho</p>
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
                className="w-full text-center tracking-[0.5em] text-2xl font-black py-3 bg-gray-50 dark:bg-slate-800 border-2 border-purple-300 dark:border-purple-700 rounded-2xl focus:outline-none focus:border-purple-500 text-purple-600 dark:text-purple-300"
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
                  setPendingPinAction(null);
                }}
                className="py-2.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-black rounded-xl text-xs transition-all shadow-md cursor-pointer uppercase"
              >
                ⚡ Xác thực PIN
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ✏️ MODAL ĐIỀU CHỈNH SỐ LƯỢNG TỒN KHO MÓN */}
      {showStockModal && editingStockItem && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <form onSubmit={handleStockUpdateWithPin} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-black text-base text-gray-900 dark:text-slate-100 uppercase">Cập Nhật Số Lượng Kho</h3>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-bold mt-0.5">{editingStockItem.name}</p>
              </div>
              <button type="button" onClick={() => setShowStockModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 font-bold text-sm cursor-pointer">✕ Đóng</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                  📍 Chọn Chi nhánh thực hiện:
                </label>
                <select
                  value={editingStockStore}
                  onChange={(e) => setEditingStockStore(e.target.value)}
                  className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl px-4 py-2 text-xs font-bold text-amber-800 dark:text-amber-300 focus:outline-none"
                >
                  <option value="store_Q1">Chi nhánh 1 (Quận 1)</option>
                  <option value="store_ThuDuc">Chi nhánh 2 (Thủ Đức)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                  📦 Số lượng tồn kho mới (món):
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={editStockValue}
                  onChange={(e) => setEditStockValue(e.target.value)}
                  className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl px-4 py-2.5 text-base font-black text-blue-600 dark:text-blue-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-xl border border-amber-100 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                💡 Lưu ý: {user?.role === 'admin' || localStorage.getItem('userRole') === 'admin' ? <b>👑 Tài khoản Admin có đặc quyền lưu kho trực tiếp không cần nhập PIN.</b> : <span>Hệ thống yêu cầu nhập <b>mã PIN 6 số</b> xác thực của Nhân viên trước khi lưu.</span>}
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
                className="py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black rounded-xl text-xs transition-all shadow-md cursor-pointer uppercase"
              >
                {user?.role === 'admin' || localStorage.getItem('userRole') === 'admin' ? '💾 Lưu Kho (Đặc Quyền Admin)' : '🔒 Lưu Kho (Cần PIN 6 số)'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 📋 MODAL CHỐT KHO ĐẦU NGÀY / CUỐI NGÀY */}
      {showDailyStockModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <form onSubmit={handleDailyStockSubmitWithPin} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-black text-base text-gray-900 dark:text-slate-100 uppercase">Chốt Kho Chi Nhánh</h3>
                <p className="text-xs text-amber-600 dark:text-amber-400 font-bold mt-0.5">Tạo bản ghi đối soát tồn kho theo ca làm việc</p>
              </div>
              <button type="button" onClick={() => setShowDailyStockModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 font-bold text-sm cursor-pointer">✕ Đóng</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                  🌅/🌙 Loại hình chốt kho:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDailyStockType('start_of_day')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      dailyStockType === 'start_of_day' ? 'bg-blue-600 text-white shadow-2xs' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400'
                    }`}
                  >
                    🌅 Chốt Kho Đầu Ngày
                  </button>
                  <button
                    type="button"
                    onClick={() => setDailyStockType('end_of_day')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      dailyStockType === 'end_of_day' ? 'bg-purple-600 text-white shadow-2xs' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400'
                    }`}
                  >
                    🌙 Chốt Kho Cuối Ngày
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                  📍 Chi nhánh chốt kho:
                </label>
                <select
                  value={dailyStockStore}
                  onChange={(e) => setDailyStockStore(e.target.value)}
                  className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl px-4 py-2 text-xs font-bold text-amber-800 dark:text-amber-300 focus:outline-none"
                >
                  <option value="store_Q1">Chi nhánh 1 (Quận 1)</option>
                  <option value="store_ThuDuc">Chi nhánh 2 (Thủ Đức)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                  📝 Ghi chú chốt ca / Lý do chênh lệch (nếu có):
                </label>
                <textarea
                  rows="3"
                  value={dailyStockNote}
                  onChange={(e) => setDailyStockNote(e.target.value)}
                  placeholder="Ví dụ: Đã kiểm đếm xong thực tế tại tủ đông, kho đủ nguyên liệu..."
                  className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl p-3 text-xs focus:outline-none focus:border-purple-500 font-medium"
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
                🔒 Chốt Kho (Cần PIN 6 số)
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 🏷️ MODAL ĐIỀU CHỈNH GIÁ & KHUYẾN MÃI MÓN ÁN */}
      {showPriceModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSavePriceAndDiscount} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-black text-base text-gray-900 dark:text-slate-100 uppercase">Cấu Hình Giá & Khuyến Mãi</h3>
                <p className="text-xs text-purple-600 dark:text-purple-400 font-bold mt-0.5">{selectedProduct.name}</p>
              </div>
              <button type="button" onClick={() => setShowPriceModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 font-bold text-sm cursor-pointer">✕ Đóng</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                  💵 Điều chỉnh giá bán niêm yết (VNĐ):
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={editPriceInput}
                  onChange={(e) => setEditPriceInput(e.target.value)}
                  className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl px-4 py-2 text-sm font-black text-blue-600 dark:text-blue-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="isOnSaleCheck"
                  checked={editIsOnSale}
                  onChange={(e) => setEditIsOnSale(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 cursor-pointer"
                />
                <label htmlFor="isOnSaleCheck" className="text-xs font-bold text-gray-800 dark:text-slate-200 cursor-pointer">
                  🎁 Bật chương trình Khuyến Mãi Giảm Giá cho món này
                </label>
              </div>

              {editIsOnSale && (
                <div className="bg-red-50 dark:bg-red-950/40 p-3 rounded-xl border border-red-100 dark:border-red-900/40 space-y-2">
                  <div>
                    <label className="block text-xs font-bold text-red-800 dark:text-red-300 mb-1">
                      🏷️ Phần trăm giảm giá (%):
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={editDiscountInput}
                      onChange={(e) => setEditDiscountInput(e.target.value)}
                      className="w-full border border-red-200 dark:border-red-800 bg-white dark:bg-slate-800 rounded-xl px-4 py-2 text-sm font-black text-red-600 dark:text-red-400 focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-between text-xs font-bold text-red-700 dark:text-red-300 pt-1 border-t border-red-200 dark:border-red-900/50">
                    <span>Giá gốc sau giảm:</span>
                    <span className="text-sm font-black">
                      {(Number(editPriceInput) * (1 - (Number(editDiscountInput) || 0) / 100)).toLocaleString()} đ
                    </span>
                  </div>
                </div>
              )}

              {/* 🥤 CẤU HÌNH PHỤ THU SIZE (CHO ĐỒ UỐNG) */}
              <div className="bg-purple-50 dark:bg-purple-950/30 p-3 rounded-xl border border-purple-100 dark:border-purple-900/40 space-y-3">
                <div className="text-xs font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wide">
                  🥤 Phụ thu giá kích cỡ Size (Dành cho đồ uống)
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-1">
                      Cộng thêm Size L (VNĐ):
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editSizeLExtraInput}
                      onChange={(e) => setEditSizeLExtraInput(e.target.value)}
                      className="w-full border border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-800 rounded-xl px-3 py-1.5 text-xs font-black text-purple-600 dark:text-purple-300 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-1">
                      Cộng thêm Size XL (VNĐ):
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editSizeXLExtraInput}
                      onChange={(e) => setEditSizeXLExtraInput(e.target.value)}
                      className="w-full border border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-800 rounded-xl px-3 py-1.5 text-xs font-black text-purple-600 dark:text-purple-300 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowPriceModal(false)}
                className="py-2.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-black rounded-xl text-xs transition-all shadow-md cursor-pointer"
              >
                💾 LƯU VÀO MONGODB
              </button>
            </div>
          </form>
        </div>
      )}
      {/* ⚙️ MODAL ĐIỀU CHỈNH TRẠNG THÁI */}
      {showStatusModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSaveStatus} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-black text-base text-gray-900 dark:text-slate-100 uppercase">Cấu Hình Trạng Thái</h3>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">{selectedProduct.name}</p>
              </div>
              <button type="button" onClick={() => setShowStatusModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 font-bold text-sm cursor-pointer">✕ Đóng</button>
            </div>

            <div className="space-y-4 pt-2">
              {/* TẮT / BẬT TOÀN HỆ THỐNG */}
              <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-950/30 p-4 rounded-xl border border-blue-100 dark:border-blue-900/40">
                <div>
                  <div className="text-sm font-bold text-blue-800 dark:text-blue-300">Hoạt động toàn hệ thống</div>
                  <div className="text-[10px] text-blue-600/70 dark:text-blue-400/70 mt-0.5">Tắt nút này sẽ ẩn món ăn trên tất cả chi nhánh</div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditStatus(editStatus === 'selling' ? 'out_of_stock' : 'selling')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${editStatus === 'selling' ? 'bg-blue-600' : 'bg-gray-300 dark:bg-slate-700'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${editStatus === 'selling' ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {/* BẬT TẮT THEO CHI NHÁNH */}
              <div className="bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/40 space-y-4">
                <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide border-b border-emerald-200 dark:border-emerald-900/40 pb-2">
                  📍 Trạng Thái Từng Chi Nhánh
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold text-emerald-900 dark:text-emerald-200">Chi nhánh 1 (Quận 1)</div>
                  <button
                    type="button"
                    onClick={() => setEditAvailableQ1(!editAvailableQ1)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${editAvailableQ1 ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-700'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${editAvailableQ1 ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold text-emerald-900 dark:text-emerald-200">Chi nhánh 2 (Thủ Đức)</div>
                  <button
                    type="button"
                    onClick={() => setEditAvailableThuDuc(!editAvailableThuDuc)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${editAvailableThuDuc ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-700'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${editAvailableThuDuc ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black rounded-xl text-sm transition-all shadow-md cursor-pointer uppercase tracking-wider"
              >
                💾 LƯU TRẠNG THÁI
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
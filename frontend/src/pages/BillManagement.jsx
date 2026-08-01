import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { BRANCHES, getBranchLabel } from '../config/constants';

const BillManagement = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const userRole = user?.role || localStorage.getItem('userRole') || 'staff'; // 'admin' hoặc 'staff'
  const currentStoreId = user?.store_id || localStorage.getItem('storeId') || 'store_Q1'; 

  // States danh sách hóa đơn & loading
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBill, setSelectedBill] = useState(null);

  // 🏢 1. Phân quyền chi nhánh: Admin được chọn dropdown free, Staff bị khóa cứng theo chi nhánh mình
  const [storeFilter, setStoreFilter] = useState(userRole === 'staff' ? currentStoreId : 'all');

  // 📅 2. Bộ lọc Ngày / Tuần / Tháng / Custom Range
  const [dateMode, setDateMode] = useState('today'); // 'today' | 'week' | 'month' | 'custom'
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Bộ lọc bổ sung: Trạng thái đơn & Thanh toán & Cờ cảnh báo
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [flagFilter, setFlagFilter] = useState('all'); // 'all' | 'flagged' | 'normal'
  const [searchTerm, setSearchTerm] = useState('');

  // 🚩 Modal Đánh Cờ Cảnh Báo & Ghi Chú Đơn Hàng
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [flaggingBill, setFlaggingBill] = useState(null);
  const [noteInput, setNoteInput] = useState('');
  const [isFlaggedInput, setIsFlaggedInput] = useState(false);
  const [flagReasonInput, setFlagReasonInput] = useState('');
  const [savingFlag, setSavingFlag] = useState(false);

  // State quản lý việc Thu gọn / Mở rộng nhóm ngày (Accordion toggle)
  const [collapsedDates, setCollapsedDates] = useState({});

  useEffect(() => {
    fetchBills();
  }, [storeFilter, userRole]);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const response = await API.get('/orders');

      if (response.data.success) {
        let data = response.data.data;
        
        // 💡 Lọc bỏ các hóa đơn nháp rỗng (không có món ăn nào)
        data = data.filter(bill => bill.items && bill.items.length > 0);

        // 🔒 PHÂN QUYỀN NGHIÊM NGẶT: Staff CHỈ ĐƯỢC XEM hóa đơn tại chi nhánh mình
        if (userRole === 'staff') {
          data = data.filter(bill => (bill.store_id || 'store_Q1') === currentStoreId);
        } else if (userRole === 'admin' && storeFilter !== 'all') {
          data = data.filter(bill => (bill.store_id || 'store_Q1') === storeFilter);
        }

        setBills(data);
      }
    } catch (err) {
      console.error("Lỗi lấy danh sách hóa đơn:", err);
      toast.error("Không thể tải danh sách hóa đơn từ Server.");
    } finally {
      setLoading(false);
    }
  };

  // 📅 HÀM LỌC HÓA ĐƠN THEO KHOẢNG THỜI GIAN (HÔM NAY / TUẦN / THÁNG / CUSTOM)
  const filteredBills = useMemo(() => {
    const now = new Date();
    
    // Tính khoảng thời gian dựa theo dateMode
    let startLimit = new Date();
    let endLimit = new Date();

    if (dateMode === 'today') {
      startLimit.setHours(0, 0, 0, 0);
      endLimit.setHours(23, 59, 59, 999);
    } else if (dateMode === 'week') {
      const day = now.getDay();
      const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
      startLimit = new Date(now.setDate(diffToMonday));
      startLimit.setHours(0, 0, 0, 0);
      endLimit = new Date();
      endLimit.setHours(23, 59, 59, 999);
    } else if (dateMode === 'month') {
      startLimit = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endLimit = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (dateMode === 'custom') {
      startLimit = fromDate ? new Date(fromDate + 'T00:00:00') : new Date(0);
      endLimit = toDate ? new Date(toDate + 'T23:59:59') : new Date();
    }

    return bills.filter(bill => {
      const billTime = new Date(bill.createdAt || bill.created_at);
      
      // Lọc theo Thời gian
      const matchesDate = billTime >= startLimit && billTime <= endLimit;

      // Lọc theo Trạng thái Đơn
      const matchesStatus = statusFilter === 'all' || bill.status === statusFilter;

      // Lọc theo Thanh toán
      const matchesPayment = paymentFilter === 'all' || bill.payment_status === paymentFilter;

      // Lọc theo Cờ cảnh báo
      const matchesFlag = flagFilter === 'all' || (flagFilter === 'flagged' ? bill.is_flagged : !bill.is_flagged);

      // Tìm kiếm từ khóa (Mã đơn, Tên người tạo, Số bàn, Ghi chú)
      const query = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        String(bill._id).toLowerCase().includes(query) ||
        (bill.created_by && bill.created_by.toLowerCase().includes(query)) ||
        (bill.table_id && bill.table_id.toLowerCase().includes(query)) ||
        (bill.note && bill.note.toLowerCase().includes(query)) ||
        (bill.flag_reason && bill.flag_reason.toLowerCase().includes(query));

      return matchesDate && matchesStatus && matchesPayment && matchesFlag && matchesSearch;
    });
  }, [bills, dateMode, fromDate, toDate, statusFilter, paymentFilter, flagFilter, searchTerm]);

  // 📊 3. CHỨC NĂNG GOM NHÓM THEO NGÀY & TÍNH TỔNG DOANH THU HÀNG NGÀY
  const groupedBillsByDate = useMemo(() => {
    const groups = {};

    filteredBills.forEach(bill => {
      const dateObj = new Date(bill.createdAt || bill.created_at);
      const dateKey = dateObj.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }); // Định dạng dạng DD/MM/YYYY

      if (!groups[dateKey]) {
        groups[dateKey] = {
          dateStr: dateKey,
          rawDate: dateObj,
          bills: [],
          totalRevenue: 0,
          totalPaidOrders: 0,
          cashTotal: 0,
          bankingTotal: 0
        };
      }

      groups[dateKey].bills.push(bill);

      // Nếu đơn đã thanh toán thành công, tính cộng vào Tổng Doanh Thu Ngày
      if (bill.payment_status === 'paid' || bill.status === 'completed') {
        const amount = Number(bill.final_total) || 0;
        groups[dateKey].totalRevenue += amount;
        groups[dateKey].totalPaidOrders += 1;

        if (bill.payment_method === 'payos' || bill.payment_method === 'bank' || bill.payment_method === 'momo') {
          groups[dateKey].bankingTotal += amount;
        } else {
          groups[dateKey].cashTotal += amount;
        }
      }
    });

    // Sắp xếp các Nhóm ngày theo thứ tự Ngày Mới Nhất Lên Trên Đầu
    const sortedGroupKeys = Object.keys(groups).sort((a, b) => {
      return groups[b].rawDate - groups[a].rawDate;
    });

    return sortedGroupKeys.map(key => groups[key]);
  }, [filteredBills]);

  // Tổng doanh thu toàn bộ khoảng thời gian lọc (Period Summary)
  const grandPeriodSummary = useMemo(() => {
    let totalRev = 0;
    let totalPaidCount = 0;
    let totalUnpaidCount = 0;
    let flaggedCount = 0;

    filteredBills.forEach(b => {
      if (b.is_flagged) flaggedCount++;
      if (b.payment_status === 'paid' || b.status === 'completed') {
        totalRev += Number(b.final_total) || 0;
        totalPaidCount++;
      } else {
        totalUnpaidCount++;
      }
    });

    return { totalRev, totalPaidCount, totalUnpaidCount, flaggedCount };
  }, [filteredBills]);

  // 🚩 HÀM MỞ MODAL ĐÁNH CỜ CẢNH BÁO & GHI CHÚ ĐƠN HÀNG
  const handleOpenFlagModal = (bill, e) => {
    if (e) e.stopPropagation();
    setFlaggingBill(bill);
    setNoteInput(bill.note || '');
    setIsFlaggedInput(bill.is_flagged || false);
    setFlagReasonInput(bill.flag_reason || '');
    setShowFlagModal(true);
  };

  const handleSaveFlagAndNote = async (e) => {
    e.preventDefault();
    if (!flaggingBill) return;

    try {
      setSavingFlag(true);
      const res = await API.patch(`/orders/${flaggingBill._id}/flag`, {
        note: noteInput.trim(),
        is_flagged: isFlaggedInput,
        flag_reason: isFlaggedInput ? flagReasonInput.trim() : ''
      });

      if (res.data.success) {
        toast.success(res.data.message || "Đã cập nhật ghi chú & cờ cảnh báo!");
        setBills(prev => prev.map(b => b._id === flaggingBill._id ? {
          ...b,
          note: noteInput.trim(),
          is_flagged: isFlaggedInput,
          flag_reason: isFlaggedInput ? flagReasonInput.trim() : ''
        } : b));
        setShowFlagModal(false);
        setFlaggingBill(null);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi khi lưu cờ cảnh báo.");
    } finally {
      setSavingFlag(false);
    }
  };

  // 🗑️ CHỨC NĂNG XÓA ĐƠN VĨNH VIỄN (DÀNH RIÊNG CHO ADMIN)
  const handleDeleteOrder = async (orderId, e) => {
    if (e) e.stopPropagation();
    const confirmDelete = window.confirm(
      `⚠️ BẠN DÙNG QUYỀN ADMIN XÁC NHẬN XÓA?\nHóa đơn #${orderId.slice(-6).toUpperCase()} sẽ bị xóa vĩnh viễn khỏi MongoDB Atlas và không thể khôi phục!`
    );
    if (!confirmDelete) return;

    try {
      const response = await API.delete(`/orders/${orderId}`);
      if (response.data.success) {
        toast.success("Đã xóa đơn hàng vĩnh viễn!");
        setBills(prev => prev.filter(b => b._id !== orderId));
        if (selectedBill?._id === orderId) setSelectedBill(null);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Không thể xóa đơn hàng này.");
    }
  };

  // Toggle thu gọn/mở rộng từng nhóm ngày
  const toggleDateGroup = (dateStr) => {
    setCollapsedDates(prev => ({ ...prev, [dateStr]: !prev[dateStr] }));
  };

  return (
    <div className="min-h-screen transition-colors duration-300 bg-gray-50 dark:bg-slate-950 text-gray-800 dark:text-slate-100 pt-16 pb-12 font-sans">
      
      {/* 🧭 THANH HEADER TRÊN CÙNG */}
      <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-4 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-gray-600 dark:text-slate-300 flex items-center justify-center border border-gray-200 dark:border-slate-700 cursor-pointer"
            title="Quay lại"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-black text-gray-800 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
              <span>🧾 Quản Lý Hóa Đơn & Doanh Thu Chi Nhánh</span>
            </h1>
            <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">
              Phân quyền: <span className="font-bold text-purple-600 dark:text-purple-400 uppercase">{userRole}</span> 
              {userRole === 'staff' ? (
                <span className="ml-2 inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-md font-bold">
                  📍 {currentStoreId === 'store_ThuDuc' ? 'Chi nhánh 2 (Thủ Đức)' : 'Chi nhánh 1 (Quận 1)'}
                </span>
              ) : (
                <span className="ml-2 text-slate-400">(Có quyền truy cập toàn bộ cửa hàng)</span>
              )}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button 
            onClick={fetchBills} 
            className="px-3.5 py-2 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-700 dark:text-slate-200 shadow-2xs active:scale-95 transition-all cursor-pointer flex items-center space-x-1"
          >
            <span>🔄 Làm mới danh sách</span>
          </button>
        </div>
      </header>

      {/* 🎛️ NỘI DUNG CHÍNH (MAIN CONTENT) */}
      <main className="p-3 sm:p-6 max-w-7xl mx-auto space-y-6">
        
        {/* 📊 BẢNG TỔNG QUAN DOANH THU PERIOD */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-purple-600 to-indigo-700 text-white p-4 sm:p-5 rounded-2xl shadow-md space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-purple-200 font-bold">💰 Tổng Doanh Thu Lọc (Period Total)</span>
            <div className="text-2xl sm:text-3xl font-black">{grandPeriodSummary.totalRev.toLocaleString()} đ</div>
            <span className="text-[10px] text-purple-200 block">Tính trên các hóa đơn đã chốt/thu tiền</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-2xs space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-slate-400 font-bold">✅ Đã Thu Tiền (Paid Bills)</span>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">{grandPeriodSummary.totalPaidCount} đơn</div>
            <span className="text-[10px] text-gray-400 dark:text-slate-500 block">Đơn hoàn thành thanh toán</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-2xs space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-slate-400 font-bold">⏳ Chưa Thu Tiền (Unpaid)</span>
            <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">{grandPeriodSummary.totalUnpaidCount} đơn</div>
            <span className="text-[10px] text-gray-400 dark:text-slate-500 block">Đơn nháp / Chưa chốt sổ</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-2xs space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-red-500 font-bold">🚩 Cảnh Báo Có Sự Cố (Flagged)</span>
            <div className="text-2xl sm:text-3xl font-black text-red-600 dark:text-red-400">{grandPeriodSummary.flaggedCount} đơn</div>
            <span className="text-[10px] text-red-400 block">Đơn có ghi chú/sự cố cần lưu ý</span>
          </div>
        </div>

        {/* 🎛️ THANH BỘ LỌC ĐA NĂNG (FILTERS CONTROL BAR) */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl shadow-xs border border-gray-200 dark:border-slate-800 space-y-4">
          
          {/* HÀNG 1: BỘ LỌC CHI NHÁNH & BỘ LỌC KHOẢNG THỜI GIAN (HÔM NAY / TUẦN / THÁNG / CUSTOM) */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 dark:border-slate-800 pb-4">
            
            {/* 🏢 1. PHÂN QUYỀN CHI NHÁNH */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-1.5">
                🏢 Chi Nhánh Cửa Hàng
              </label>
              {userRole === 'admin' ? (
                <select 
                  value={storeFilter} 
                  onChange={(e) => setStoreFilter(e.target.value)} 
                  className="bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 rounded-xl text-xs px-3 py-2 font-bold text-purple-800 dark:text-purple-300 focus:outline-none cursor-pointer"
                >
                  <option value="all">🏢 Tất cả chi nhánh</option>
                  {BRANCHES.map(b => (
                    <option key={b.id} value={b.id}>{b.label}</option>
                  ))}
                </select>
              ) : (
                <div className="px-3.5 py-2 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-bold text-blue-800 dark:text-blue-300 flex items-center space-x-1">
                  <span>📍 {getBranchLabel(currentStoreId)}</span>
                </div>
              )}
            </div>

            {/* 📅 2. BỘ LỌC THỜI GIAN 4 CHẾ ĐỘ */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400 mb-1.5">
                📅 Khoảng Thời Gian
              </label>
              <div className="flex flex-wrap gap-1.5 bg-gray-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  onClick={() => setDateMode('today')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${dateMode === 'today' ? 'bg-purple-600 text-white shadow-xs' : 'text-gray-600 dark:text-slate-400 hover:text-gray-900'}`}
                >
                  Hôm nay
                </button>
                <button
                  onClick={() => setDateMode('week')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${dateMode === 'week' ? 'bg-purple-600 text-white shadow-xs' : 'text-gray-600 dark:text-slate-400 hover:text-gray-900'}`}
                >
                  Theo Tuần
                </button>
                <button
                  onClick={() => setDateMode('month')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${dateMode === 'month' ? 'bg-purple-600 text-white shadow-xs' : 'text-gray-600 dark:text-slate-400 hover:text-gray-900'}`}
                >
                  Theo Tháng
                </button>
                <button
                  onClick={() => setDateMode('custom')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${dateMode === 'custom' ? 'bg-purple-600 text-white shadow-xs' : 'text-gray-600 dark:text-slate-400 hover:text-gray-900'}`}
                >
                  Tùy chọn khoảng ngày
                </button>
              </div>
            </div>

            {/* IF CUSTOM RANGE -> DATE PICKERS FROM / TO */}
            {dateMode === 'custom' && (
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800 p-2 rounded-xl border border-gray-200 dark:border-slate-700 animate-in fade-in duration-150 text-xs">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold block">Từ ngày:</span>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg px-2 py-1 font-bold text-gray-800 dark:text-slate-200"
                  />
                </div>
                <span className="text-gray-400 font-bold self-end pb-1">➔</span>
                <div>
                  <span className="text-[10px] text-gray-400 font-bold block">Đến ngày:</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg px-2 py-1 font-bold text-gray-800 dark:text-slate-200"
                  />
                </div>
              </div>
            )}
          </div>

          {/* HÀNG 2: BỘ LỌC PHỤ & TÌM KIẾM TỪ KHÓA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase mb-1">Trạng thái Đơn</label>
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)} 
                className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-gray-50 dark:bg-slate-800 focus:outline-none font-bold text-gray-700 dark:text-slate-200 cursor-pointer"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="pending_confirm">Chờ bếp nhận</option>
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
                className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-gray-50 dark:bg-slate-800 focus:outline-none font-bold text-gray-700 dark:text-slate-200 cursor-pointer"
              >
                <option value="all">Tất cả thanh toán</option>
                <option value="paid">Đã thu tiền (Paid)</option>
                <option value="unpaid">Chưa thu tiền (Unpaid)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-red-500 uppercase mb-1">🚩 Cảnh báo cờ sự cố</label>
              <select 
                value={flagFilter} 
                onChange={(e) => setFlagFilter(e.target.value)} 
                className="w-full border border-red-200 dark:border-red-900/60 rounded-xl px-3 py-2 bg-red-50/40 dark:bg-slate-800 focus:outline-none font-bold text-red-700 dark:text-red-300 cursor-pointer"
              >
                <option value="all">Tất cả hóa đơn</option>
                <option value="flagged">🚩 Đơn có đánh cờ / sự cố</option>
                <option value="normal">Đơn bình thường</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase mb-1">🔍 Tìm kiếm hóa đơn</label>
              <input
                type="text"
                placeholder="Mã đơn, Tên người tạo, Số bàn, Ghi chú..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs text-gray-800 dark:text-slate-100 placeholder-gray-400 rounded-xl px-3 py-2 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
        </div>

        {/* 📊 3. DANH SÁCH GOM NHÓM THEO NGÀY (DAILY GROUPED INVOICES) */}
        {loading ? (
          <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl text-center text-xs font-bold text-gray-400 dark:text-slate-500 animate-pulse border border-gray-200 dark:border-slate-800">
            ⏳ Đang tải đồng bộ dữ liệu hóa đơn từ Server...
          </div>
        ) : groupedBillsByDate.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl text-center space-y-3 border border-gray-200 dark:border-slate-800">
            <span className="text-4xl block">🧾</span>
            <p className="font-bold text-gray-600 dark:text-slate-300">Không tìm thấy dữ liệu hóa đơn phù hợp trong khoảng thời gian chọn!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedBillsByDate.map((group) => {
              const isCollapsed = collapsedDates[group.dateStr];

              return (
                <div 
                  key={group.dateStr}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-2xs overflow-hidden transition-all"
                >
                  {/* 📅 HEADER CỦA NHÓM NGÀY (HEADER AGGREGATION) */}
                  <div 
                    onClick={() => toggleDateGroup(group.dateStr)}
                    className="bg-gradient-to-r from-slate-100 to-gray-50 dark:from-slate-850 dark:to-slate-800 p-4 border-b border-gray-200 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-3 cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-base sm:text-lg">📅</span>
                      <div>
                        <h3 className="font-black text-sm sm:text-base text-gray-900 dark:text-slate-100 flex items-center gap-2">
                          <span>Ngày {group.dateStr}</span>
                          <span className="text-xs font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 px-2.5 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                            {group.bills.length} hóa đơn
                          </span>
                        </h3>
                        <div className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5 flex gap-3">
                          <span>💵 Tiền mặt: <strong>{group.cashTotal.toLocaleString()} đ</strong></span>
                          <span>💳 CK/PayOS: <strong className="text-emerald-600 dark:text-emerald-400">{group.bankingTotal.toLocaleString()} đ</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      {/* TỔNG DOANH THU TRONG NGÀY */}
                      <div className="text-right">
                        <span className="text-[10px] text-gray-400 uppercase font-bold block">TỔNG DOANH THU NGÀY</span>
                        <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
                          {group.totalRevenue.toLocaleString()} đ
                        </span>
                      </div>

                      {/* ICON ACCORDION TOGGLE */}
                      <button className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 text-sm font-bold p-1">
                        {isCollapsed ? '➕ Mở rộng' : '➖ Thu gọn'}
                      </button>
                    </div>
                  </div>

                  {/* 🧾 DANH SÁCH CÁC HÓA ĐƠN TRONG NGÀY */}
                  {!isCollapsed && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50/70 dark:bg-slate-850 text-gray-400 dark:text-slate-400 font-bold text-[11px] uppercase tracking-wider border-b border-gray-100 dark:border-slate-800">
                            <th className="p-3.5">Mã Đơn</th>
                            <th className="p-3.5">Giờ Tạo</th>
                            <th className="p-3.5">Chi Nhánh</th>
                            <th className="p-3.5">Vị Trí</th>
                            <th className="p-3.5">Hình Thức</th>
                            <th className="p-3.5">Số Tiền</th>
                            <th className="p-3.5">Thanh Toán</th>
                            <th className="p-3.5">Trạng Thái</th>
                            <th className="p-3.5">Ghi Chú / Sự Cố</th>
                            <th className="p-3.5 text-center">Hành Động</th>
                          </tr>
                        </thead>
                        <tbody className="text-xs font-medium text-gray-600 dark:text-slate-300 divide-y divide-gray-100 dark:divide-slate-800/60">
                          {group.bills.map((bill) => {
                            const timeStr = new Date(bill.createdAt || bill.created_at).toLocaleTimeString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            });

                            return (
                              <tr 
                                key={bill._id} 
                                onClick={() => setSelectedBill(bill)}
                                className={`hover:bg-gray-50/80 dark:hover:bg-slate-800/60 transition-colors cursor-pointer ${
                                  bill.is_flagged ? 'bg-red-50/50 dark:bg-red-950/20' : ''
                                }`}
                              >
                                {/* Mã đơn & Icon Đánh cờ */}
                                <td className="p-3.5 font-bold text-gray-900 dark:text-slate-100">
                                  <div className="flex items-center space-x-1.5">
                                    {bill.is_flagged && (
                                      <span className="text-base animate-pulse" title={`Cảnh báo sự cố: ${bill.flag_reason || 'Đã đánh cờ'}`}>
                                        🚩
                                      </span>
                                    )}
                                    <span className="font-mono text-purple-600 dark:text-purple-400">
                                      #{String(bill._id || bill.id || 'UNKNOWN').slice(-6).toUpperCase()}
                                    </span>
                                  </div>
                                </td>

                                <td className="p-3.5 text-gray-500 dark:text-slate-400 font-mono text-[11px]">{timeStr}</td>
                                
                                <td className="p-3.5 font-bold text-slate-700 dark:text-slate-300">
                                  {getBranchLabel(bill.store_id)}
                                </td>

                                <td className="p-3.5">
                                  <span className="px-2 py-0.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 rounded-md font-bold text-[11px]">
                                    {bill.table_id ? `Bàn ${bill.table_id}` : 'Mang đi'}
                                  </span>
                                </td>

                                <td className="p-3.5 text-gray-700 dark:text-slate-300">
                                  {bill.order_type === 'dine-in' ? '🍽️ Ăn tại quán' : '🛵 Mang đi'}
                                </td>

                                <td className="p-3.5 font-black text-blue-600 dark:text-blue-400 text-sm">
                                  {bill.final_total.toLocaleString()} đ
                                </td>

                                <td className="p-3.5">
                                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                                    bill.payment_status === 'paid' 
                                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border-emerald-100 dark:border-emerald-800' 
                                      : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-300 border-amber-100 dark:border-amber-800'
                                  }`}>
                                    {bill.payment_status === 'paid' ? 'Đã thu tiền' : 'Chưa thu tiền'}
                                  </span>
                                </td>

                                <td className="p-3.5">
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                                    bill.status === 'completed' ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300' :
                                    bill.status === 'cancelled' ? 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-300' :
                                    'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400'
                                  }`}>
                                    {bill.status}
                                  </span>
                                </td>

                                {/* Ghi chú & Cờ sự cố */}
                                <td className="p-3.5 max-w-xs">
                                  {bill.note || bill.flag_reason ? (
                                    <div className="space-y-0.5">
                                      {bill.note && (
                                        <div className="text-[11px] text-gray-700 dark:text-slate-300 truncate">
                                          📝 {bill.note}
                                        </div>
                                      )}
                                      {bill.flag_reason && (
                                        <div className="text-[10px] text-red-600 dark:text-red-400 font-bold truncate">
                                          ⚠️ {bill.flag_reason}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-gray-300 dark:text-slate-600 italic text-[11px]">-</span>
                                  )}
                                </td>

                                <td className="p-3.5 text-center">
                                  <div className="flex items-center justify-center space-x-1.5">
                                    <button
                                      onClick={(e) => handleOpenFlagModal(bill, e)}
                                      className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                                      title="Cập nhật Ghi chú hoặc Đánh cờ sự cố"
                                    >
                                      🚩 Cờ / 📝 Note
                                    </button>

                                    {userRole === 'admin' && (
                                      <button
                                        onClick={(e) => handleDeleteOrder(bill._id, e)}
                                        className="px-2 py-1 bg-red-50 dark:bg-red-950/60 hover:bg-red-100 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                                        title="Xóa vĩnh viễn đơn (Admin)"
                                      >
                                        🗑️
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 🚩 MODAL ĐÁNH CỜ CẢNH BÁO & GHI CHÚ ĐƠN HÀNG */}
      {showFlagModal && flaggingBill && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-[70] p-4">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4 text-slate-800 dark:text-slate-100 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-sm text-amber-600 dark:text-amber-400 uppercase flex items-center gap-1.5">
                <span>🚩 Ghi Chú & Đánh Cờ Sự Cố Đơn Hàng</span>
              </h3>
              <button
                onClick={() => setShowFlagModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveFlagAndNote} className="space-y-4 text-xs">
              <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-xl border border-gray-200 dark:border-slate-700 space-y-1">
                <div>Mã đơn: <strong className="text-purple-600 dark:text-purple-400">#{flaggingBill._id.slice(-6).toUpperCase()}</strong></div>
                <div>Tổng tiền: <strong>{flaggingBill.final_total.toLocaleString()} đ</strong> | Bàn: <strong>{flaggingBill.table_id || 'Mang đi'}</strong></div>
              </div>

              {/* BẬT/TẮT ĐÁNH CỜ CẢNH BÁO */}
              <div className="bg-red-50/60 dark:bg-red-950/40 p-3 rounded-xl border border-red-200 dark:border-red-900/60 space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFlaggedInput}
                    onChange={(e) => setIsFlaggedInput(e.target.checked)}
                    className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500 cursor-pointer"
                  />
                  <span className="font-black text-red-700 dark:text-red-300 uppercase">🚩 Đánh cờ cảnh báo đơn này có sự cố</span>
                </label>

                {isFlaggedInput && (
                  <div>
                    <label className="block text-[10px] font-bold text-red-600 dark:text-red-400 uppercase mb-1">Lý do nghi vấn / sự cố:</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Thối thiếu 20k, khách khiếu nại làm nhầm size..."
                      value={flagReasonInput}
                      onChange={(e) => setFlagReasonInput(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-red-300 dark:border-red-800 rounded-lg px-3 py-2 text-xs font-bold text-red-800 dark:text-red-200 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* GHI CHÚ BỔ SUNG */}
              <div>
                <label className="block text-gray-500 dark:text-slate-400 font-bold uppercase mb-1">📝 Ghi chú hóa đơn (Ghi chú chung):</label>
                <textarea
                  rows="3"
                  placeholder="Nhập ghi chú thêm cho đơn hàng này..."
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-gray-800 dark:text-slate-100 focus:outline-none focus:border-purple-500"
                ></textarea>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={savingFlag}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs transition-all cursor-pointer text-center shadow-md"
                >
                  {savingFlag ? '⏳ Đang lưu...' : '💾 Lưu Ghi Chú & Đánh Cờ'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowFlagModal(false)}
                  className="px-4 py-2.5 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🧾 MODAL CHI TIẾT HÓA ĐƠN BILL KHI BẤM VÀO DÒNG */}
      {selectedBill && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-200 dark:border-slate-700 animate-in zoom-in-95 duration-150 text-slate-800 dark:text-slate-100 max-h-[90vh] flex flex-col text-xs">
            
            <div className="bg-gradient-to-r from-purple-700 to-indigo-700 p-5 text-white flex justify-between items-start">
              <div>
                <h3 className="font-black text-base uppercase tracking-wide">
                  HÓA ĐƠN #{selectedBill._id.slice(-6).toUpperCase()}
                </h3>
                <p className="text-purple-200 text-xs mt-0.5">Sweet Bakery POS & Beverage</p>
              </div>
              <button
                onClick={() => setSelectedBill(null)}
                className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-1.5 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Chi nhánh:</span>
                  <span className="font-bold">{getBranchLabel(selectedBill.store_id)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Thời gian tạo:</span>
                  <span className="font-bold">{new Date(selectedBill.createdAt).toLocaleString('vi-VN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Hình thức:</span>
                  <span className="font-bold text-purple-600 dark:text-purple-400">
                    {selectedBill.order_type === 'dine-in' ? `🍽️ Tại bàn (${selectedBill.table_id || ''})` : '🛵 Mang đi'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Người tạo đơn:</span>
                  <span className="font-bold">{selectedBill.created_by || 'Khách hàng'}</span>
                </div>
                {selectedBill.is_flagged && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-red-600 dark:text-red-400 font-bold flex items-center gap-1">
                    <span>🚩 Sự cố:</span>
                    <span>{selectedBill.flag_reason || 'Đơn có cờ nghi vấn'}</span>
                  </div>
                )}
                {selectedBill.note && (
                  <div className="pt-1 text-amber-700 dark:text-amber-300 font-bold">
                    📝 Ghi chú: <span className="font-normal">{selectedBill.note}</span>
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-black uppercase text-[11px] text-slate-400 tracking-wider mb-2">Các món trong đơn:</h4>
                <div className="space-y-2">
                  {selectedBill.items.map((item, idx) => (
                    <div key={idx} className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-slate-100">{item.name}</div>
                        <div className="text-[10px] text-slate-400">
                          {item.price.toLocaleString()}đ x {item.quantity}
                          {item.selected_attributes?.size && ` | Size ${item.selected_attributes.size}`}
                        </div>
                      </div>
                      <div className="font-black text-blue-600 dark:text-blue-400">
                        {(item.price * item.quantity).toLocaleString()} đ
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-100 dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="flex justify-between text-sm font-black pt-1 text-slate-900 dark:text-slate-100">
                  <span>TỔNG THANH TOÁN:</span>
                  <span className="text-red-600 dark:text-red-400 text-base">{selectedBill.final_total.toLocaleString()} đ</span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex justify-end">
              <button
                onClick={() => setSelectedBill(null)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default BillManagement;
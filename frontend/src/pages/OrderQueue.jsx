import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { BANK_BIN, ACCOUNT_NUMBER, ACCOUNT_NAME, BRANCHES, getBranchLabel } from '../config/constants';

const OrderQueue = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const userRole = user?.role || localStorage.getItem('userRole') || 'user';
    const storeId = user?.store_id || localStorage.getItem('storeId') || 'store_Q1';
    const staffName = user?.name || user?.email || 'Nhân viên quầy';

    // 🏗️ Bộ lọc chi nhánh: Admin có thể chọn, Staff bị khóa theo store_id
    const [selectedStoreFilter, setSelectedStoreFilter] = useState(storeId);

    // States
    const [orders, setOrders] = useState([]);
    const [allStoreOrders, setAllStoreOrders] = useState([]);
    const [currentShiftData, setCurrentShiftData] = useState(null);
    const [shiftActive, setShiftActive] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [settleModalOrder, setSettleModalOrder] = useState(null);
    const [qrVerifyingOrder, setQrVerifyingOrder] = useState(null);
    const [isVerifyingPayOS, setIsVerifyingPayOS] = useState(false);
    const [payosLinkData, setPayosLinkData] = useState(null);

    // 🔒 BẢO MẬT: Chặn không cho Khách hàng (role === 'user') truy cập giao diện Nhân viên quầy (/queue)
    useEffect(() => {
        if (userRole === 'user') {
            toast.error("Bạn không có quyền truy cập trang quản lý đơn của Nhân viên!");
            navigate('/my-orders');
        }
    }, [userRole, navigate]);

    // 💳 TỰ ĐỘNG GỌI API SDK PAYOS ĐỂ KHỞI TẠO PAYMENT LINK CHÍNH THỨC
    useEffect(() => {
        if (qrVerifyingOrder?._id) {
            setPayosLinkData(null);
            API.post(`/orders/${qrVerifyingOrder._id}/payos-link`)
                .then(res => {
                    if (res.data.success) {
                        setPayosLinkData(res.data.data);
                    }
                })
                .catch(err => {
                    console.warn("Lỗi gọi SDK PayOS createPaymentLink:", err);
                });
        }
    }, [qrVerifyingOrder?._id]);

    // 🟢 MỞ CA MODAL STATE
    const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);
    const [openingCashInput, setOpeningCashInput] = useState('500000');

    // 🔴 KẾT CA MODAL STATE
    const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
    const [closingActualCash, setClosingActualCash] = useState('');
    const [shiftNote, setShiftNote] = useState('');
    const [autoHandover, setAutoHandover] = useState(true); // Mặc định bật bàn giao tự động

    // 📜 LỊCH SỬ CA MODAL STATE
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [shiftHistoryList, setShiftHistoryList] = useState([]);

    // Real-time polling dữ liệu đơn hàng & ca trực
    const fetchQueueData = useCallback(async () => {
        try {
            const [ordersRes, shiftRes] = await Promise.all([
                API.get('/orders'),
                API.get(`/shifts/current?store_id=${selectedStoreFilter}`)
            ]);

            if (ordersRes.data.success) {
                const storeOrdersList = ordersRes.data.data.filter(order =>
                    selectedStoreFilter === 'all' || order.store_id === selectedStoreFilter || !order.store_id
                );
                setAllStoreOrders(storeOrdersList);

                const activeOrders = storeOrdersList.filter(order =>
                    ['pending_confirm', 'serving', 'ready'].includes(order.status)
                );
                setOrders(activeOrders);
            }

            if (shiftRes.data.success) {
                setShiftActive(shiftRes.data.active);
                setCurrentShiftData(shiftRes.data.data);
            }
        } catch (err) {
            console.error("Lỗi đồng bộ hàng đợi phục vụ & ca trực:", err);
        } finally {
            setLoading(false);
        }
    }, [selectedStoreFilter]);

    useEffect(() => {
        fetchQueueData();
        const interval = setInterval(fetchQueueData, 4000); // Tự động làm mới mỗi 4 giây
        return () => clearInterval(interval);
    }, [fetchQueueData]);

    // ⚡ TỰ ĐỘNG ĐÓNG ĐƠN: Khi khách chuyển khoản VietQR thành công, hệ thống tự nhận diện & chốt đơn không cần nhấp chuột
    useEffect(() => {
        if (qrVerifyingOrder) {
            const found = allStoreOrders.find(o => o._id === qrVerifyingOrder._id) || orders.find(o => o._id === qrVerifyingOrder._id);
            if (found && found.payment_status === 'paid') {
                toast.success(`🎉 TỰ ĐỘNG XÁC NHẬN: Đơn #${found._id.slice(-6).toUpperCase()} đã chuyển khoản thành công!`);
                handleSettleOrder(found._id, 'payos');
                setQrVerifyingOrder(null);
                setSettleModalOrder(null);
            }
        }
    }, [orders, allStoreOrders, qrVerifyingOrder]);

    // 🟢 HÀM MỞ CA TRỰC MỚI (LƯU MONGODB)
    const handleOpenShiftSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await API.post('/shifts/open', {
                store_id: selectedStoreFilter,
                opening_cash: Number(openingCashInput) || 500000
            });

            if (res.data.success) {
                alert(`🟢 ĐÃ MỞ CA TRỰC THÀNH CÔNG!\n- Nhân viên: ${staffName}\n- Chi nhánh: ${getBranchLabel(selectedStoreFilter)}\n- Tiền thối ban đầu: ${Number(openingCashInput).toLocaleString()} đ`);
                setShowOpenShiftModal(false);
                fetchQueueData();
            }
        } catch (err) {
            alert(err.response?.data?.message || "Lỗi khi mở ca làm việc.");
        }
    };

    // 🔴 HÀM CHỐT KẾT CA TRỰC — hỗ trợ cả kết ca thường và bàn giao ca tự động
    const handleCloseShiftSubmit = async (e) => {
        e.preventDefault();
        try {
            const actualCash = Number(closingActualCash) || 0;
            const diff = actualCash - expectedDrawerCash;

            if (diff !== 0) {
                const diffMsg = diff > 0
                    ? `⚠️ CẢNH BÁO KẾT CA THỪA TIỀN KÉT: +${diff.toLocaleString()} đ\n(Vui lòng kiểm tra lại tiền thừa ban đầu hoặc tiền thối dư)`
                    : `🚨 CẢNH BÁO HỤT TIỀN KÉT SẮT: ${diff.toLocaleString()} đ\n(Số tiền thực tế ĐANG HỤT so với két lý thuyết! Bạn cần ghi rõ lý do vào ô Ghi chú!)`;

                const confirmProceed = window.confirm(`${diffMsg}\n\nBạn có chắc chắn muốn chốt ca trực với số tiền chênh lệch này không?`);
                if (!confirmProceed) return;
            }

            const payload = {
                store_id: selectedStoreFilter,
                closing_cash_actual: actualCash,
                note: shiftNote || (diff !== 0 ? `Chênh lệch két: ${diff > 0 ? '+' : ''}${diff.toLocaleString()}đ` : 'Tiền két khớp 100%.')
            };

            if (autoHandover) {
                // 🔄 BÀN GIAO CA TỰ ĐỘNG: Đóng ca cũ + mở ca mới ngay lập tức
                const res = await API.post('/shifts/handover', payload);
                if (res.data.success) {
                    const { closedShift, newShift } = res.data.data;
                    const diffVal = closedShift.difference;
                    const diffText = diffVal === 0 ? '✓ 0 đ (Két tiền khớp 100%)' : `🚨 CHÊNH LỆCH: ${diffVal > 0 ? '+' : ''}${diffVal.toLocaleString()} đ (${diffVal > 0 ? 'THỪA TIỀN' : 'HỤT TIỀN KÉT'})`;
                    alert(
                        `🔄 BÀN GIAO CA THÀNH CÔNG!\n\n` +
                        `📋 Báo cáo ca cũ #${closedShift._id.slice(-6).toUpperCase()}:\n` +
                        `  • Tiền mặt thu: ${closedShift.system_cash_collected.toLocaleString()} đ\n` +
                        `  • Chuyển khoản: ${closedShift.system_banking_collected.toLocaleString()} đ\n` +
                        `  • Thực tế đếm: ${closedShift.closing_cash_actual.toLocaleString()} đ\n` +
                        `  • Chênh lệch két: ${diffText}\n` +
                        `  • Bill xong/hủy: ${closedShift.total_bills_completed}/${closedShift.total_bills_cancelled}\n\n` +
                        `🟢 Ca mới #${newShift._id.slice(-6).toUpperCase()} đã được mở!\n` +
                        `  • Tiền đầu ca mới: ${newShift.opening_cash.toLocaleString()} đ\n` +
                        `  • Bắt đầu lúc: ${new Date(newShift.start_time).toLocaleTimeString('vi-VN')}`
                    );
                }
            } else {
                // Kết ca thông thường không mở ca mới
                const res = await API.post('/shifts/close', payload);
                if (res.data.success) {
                    const closedData = res.data.data;
                    const diffVal = closedData.difference;
                    const diffText = diffVal === 0 ? '✓ 0 đ (Két tiền khớp 100%)' : `🚨 CHÊNH LỆCH: ${diffVal > 0 ? '+' : ''}${diffVal.toLocaleString()} đ (${diffVal > 0 ? 'THỪA TIỀN' : 'HỤT TIỀN KÉT'})`;
                    alert(
                        `✅ ĐÃ CHỐT KẾT CA!\n\n📋 BÁO CÁO KẾT CA TRỰC:\n` +
                        `- Mã ca: ${closedData._id}\n` +
                        `- Tiền thối ban đầu: ${closedData.opening_cash.toLocaleString()} đ\n` +
                        `- Tiền mặt hệ thống: ${closedData.system_cash_collected.toLocaleString()} đ\n` +
                        `- Thực tế đếm: ${closedData.closing_cash_actual.toLocaleString()} đ\n` +
                        `- Chênh lệch két: ${diffText}\n` +
                        `- Bill xong/hủy: ${closedData.total_bills_completed}/${closedData.total_bills_cancelled}`
                    );
                }
            }

            setShowCloseShiftModal(false);
            setClosingActualCash('');
            setShiftNote('');
            fetchQueueData();
        } catch (err) {
            alert(err.response?.data?.message || "Lỗi khi chốt kết ca trực.");
        }
    };

    // 📜 TẢI LỊCH SỬ CA TRỰC TỪ MONGODB
    const fetchShiftHistory = async () => {
        try {
            const res = await API.get(`/shifts/history?store_id=${selectedStoreFilter}`);
            if (res.data.success) {
                setShiftHistoryList(res.data.data);
                setShowHistoryModal(true);
            }
        } catch (err) {
            alert("Không thể tải lịch sử ca trực từ Server.");
        }
    };

    // 🖨️ IN BILL VÀO BẾP
    const handlePrintKitchenBill = (order) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert("Vui lòng cho phép popup để in bill!");
            return;
        }

        const itemsHtml = order.items.map(item => `
            <tr>
                <td style="padding: 8px 0; border-bottom: 1px dashed #ccc;">
                    <strong>${item.name}</strong><br/>
                    <small>Size: ${item.selected_attributes?.size || 'M'} | Đường: ${item.selected_attributes?.sugar || '100%'} | Đá: ${item.selected_attributes?.ice || '100%'}</small>
                </td>
                <td style="padding: 8px 0; border-bottom: 1px dashed #ccc; text-align: center;"><strong>x${item.quantity}</strong></td>
            </tr>
        `).join('');

        const html = `
            <html>
                <head>
                    <title>Bill Bếp - #${order._id.slice(-6).toUpperCase()}</title>
                    <style>
                        body { font-family: 'Courier New', Courier, monospace; font-size: 14px; margin: 0; padding: 20px; color: #000; }
                        h2 { text-align: center; margin: 0 0 10px 0; font-size: 18px; }
                        p { margin: 5px 0; }
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                        th { border-bottom: 2px solid #000; padding-bottom: 5px; text-align: left; }
                        .text-center { text-align: center; }
                        .text-right { text-align: right; }
                        .divider { border-bottom: 1px dashed #000; margin: 15px 0; }
                    </style>
                </head>
                <body>
                    <h2>BẾP - PHIẾU CHẾ BIẾN</h2>
                    <p><strong>Mã đơn:</strong> #${order._id.slice(-6).toUpperCase()}</p>
                    <p><strong>Ngày giờ:</strong> ${new Date(order.createdAt).toLocaleString('vi-VN')}</p>
                    <p><strong>Loại:</strong> ${order.order_type === 'dine-in' ? 'Ăn tại bàn (Bàn 0' + (order.table_id?.slice(-1) || 'x') + ')' : 'Mang đi'}</p>
                    <p><strong>Khách hàng:</strong> ${order.created_by || 'Khách hàng'}</p>
                    <div class="divider"></div>
                    <table>
                        <thead>
                            <tr>
                                <th>Tên món & Tùy chọn</th>
                                <th style="text-align: center; width: 40px;">SL</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>
                    <div class="divider"></div>
                    <p class="text-center"><small><em>(Vui lòng chế biến theo đúng ghi chú)</em></small></p>
                    <script>
                        window.onload = function() { window.print(); window.close(); };
                    </script>
                </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
    };

    // Hành động xử lý đơn hàng (Nhận đơn từ cột Chờ xác nhận)
    const handleAcceptOrder = async (orderId) => {
        try {
            const res = await API.post(`/orders/${orderId}/accept`);
            if (res.data.success) {
                setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: 'serving' } : o));
                fetchQueueData();
            }
        } catch (err) {
            alert(err.response?.data?.message || "Lỗi khi nhận đơn hàng.");
        }
    };

    const handleReadyOrder = async (orderId) => {
        try {
            const res = await API.post(`/orders/${orderId}/ready`);
            if (res.data.success) {

                setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: 'ready' } : o));
                fetchQueueData();
            }
        } catch (err) {
            alert(err.response?.data?.message || "Lỗi khi báo hoàn thành bếp.");
        }
    };

    const handleSettleOrder = async (orderId, paymentMethod = 'cash') => {
        try {
            const res = await API.post(`/orders/${orderId}/settle`, { payment_method: paymentMethod });
            if (res.data.success) {
                const methodText = paymentMethod === 'payos' ? 'Chuyển khoản QR' : 'Tiền mặt';
                alert(`Chốt hóa đơn & Thanh toán [${methodText}] thành công! Đã giải phóng bàn ăn.`);

                setOrders(prev => prev.filter(o => o._id !== orderId));
                if (selectedOrder?._id === orderId) setSelectedOrder(null);
                if (settleModalOrder?._id === orderId) setSettleModalOrder(null);
                if (qrVerifyingOrder?._id === orderId) setQrVerifyingOrder(null);
                fetchQueueData();
            }
        } catch (err) {
            alert(err.response?.data?.message || "Lỗi khi chốt đóng hóa đơn.");
        }
    };

    // 💳 HÀM XÁC THỰC THỰC TẾ CHUYỂN KHOẢN PAYOS TỪ SERVER NGÂN HÀNG
    const handleVerifyPayOSPayment = async (order) => {
        if (!order) return;
        try {
            setIsVerifyingPayOS(true);
            const res = await API.get(`/orders/${order._id}`);
            if (res.data.success && res.data.data.payment_status === 'paid') {
                alert(`✅ XÁC NHẬN THÀNH CÔNG:\nTiền chuyển khoản cho đơn #${order._id.slice(-6).toUpperCase()} đã về tài khoản ngân hàng thực tế!`);
                await handleSettleOrder(order._id, 'payos');
                setQrVerifyingOrder(null);
                setSettleModalOrder(null);
            } else {
                alert(`🚫 NGHIÊM CẤM CHỐT ĐƠN KHÔNG CÓ TIỀN VỀ:\n\nHệ thống ngân hàng/PayOS CHƯA ghi nhận tiền về cho đơn #${order._id.slice(-6).toUpperCase()}.\n\n⚠️ Vui lòng KHÔNG giao món cho khách nếu chưa xác nhận tiền về két!`);
            }
        } catch (err) {
            alert("Lỗi khi kiểm tra trạng thái thanh toán từ Server.");
        } finally {
            setIsVerifyingPayOS(false);
        }
    };

    // 🧪 HÀM GIẢ LẬP THANH TOÁN THÀNH CÔNG DÀNH CHO LOCALHOST DEV/TESTER
    const handleSimulateLocalWebhook = async (order) => {
        if (!order) return;
        try {
            setIsVerifyingPayOS(true);
            // Gửi Webhook giả lập tới Backend local
            const res = await API.post('/webhooks/payos', {
                code: "00",
                desc: "success",
                success: true,
                data: {
                    accountNumber: ACCOUNT_NUMBER,
                    amount: order.final_total,
                    description: `Thanh Toan Don ${order._id.slice(-6).toUpperCase()}`,
                    reference: `TEST_LOCAL_${Date.now()}`
                }
            });

            if (res.data.success) {
                toast.success(`🎉 GIẢ LẬP LOCAL THÀNH CÔNG: Đơn #${order._id.slice(-6).toUpperCase()} đã được gạch nợ thành công!`);
                await handleSettleOrder(order._id, 'payos');
                setQrVerifyingOrder(null);
                setSettleModalOrder(null);
            }
        } catch (err) {
            alert(err.response?.data?.message || "Lỗi khi chạy thử nghiệm giả lập Webhook.");
        } finally {
            setIsVerifyingPayOS(false);
        }
    };

    const handleCancelOrder = async (orderId) => {
        const reason = window.prompt("Nhập lý do hủy đơn hàng này:");
        if (reason === null) return;

        try {
            const res = await API.post(`/orders/${orderId}/cancel`, { reason: reason || "Nhân viên hủy trực tiếp tại hàng đợi" });
            if (res.data.success) {
                alert("Đã hủy đơn hàng thành công!");
                setOrders(prev => prev.filter(o => o._id !== orderId));
                if (selectedOrder?._id === orderId) setSelectedOrder(null);
                fetchQueueData();
            }
        } catch (err) {
            alert(err.response?.data?.message || "Lỗi khi hủy đơn hàng.");
        }
    };

    // Thống kê đơn active
    const getStats = () => {
        const storeOrders = orders.filter(o => o.store_id === selectedStoreFilter || !o.store_id);
        const pendingCount = storeOrders.filter(o => o.status === 'pending_confirm' && o.is_confirmed).length;
        const servingCount = storeOrders.filter(o => o.status === 'serving').length;
        const readyCount = storeOrders.filter(o => o.status === 'ready').length;

        return { pendingCount, servingCount, readyCount };
    };

    const stats = getStats();

    // Dữ liệu ca trực từ MongoDB
    const shiftOpeningCash = currentShiftData?.opening_cash || 500000;
    const shiftCashCollected = currentShiftData?.system_cash_collected || 0;
    const shiftBankingCollected = currentShiftData?.system_banking_collected || 0;
    const shiftBillsCompleted = currentShiftData?.total_bills_completed || 0;
    const shiftBillsCancelled = currentShiftData?.total_bills_cancelled || 0;
    const expectedDrawerCash = shiftOpeningCash + shiftCashCollected;

    // Lọc tìm kiếm đơn hàng
    const filteredOrders = orders.filter(order => {
        const matchesSearch =
            order._id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (order.created_by && order.created_by.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (order.table_id && order.table_id.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesType = typeFilter === 'all' || order.order_type === typeFilter;

        return matchesSearch && matchesType;
    });

    // 📋 Sắp xếp đơn hàng theo thứ tự thời gian tăng dần (cũ nhất ở trên cùng, ĐƠN HÀNG MỚI NHẤT NẰM Ở DƯỚI CÙNG)
    const pendingOrdersList = filteredOrders
        .filter(o => o.status === 'pending_confirm')
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const servingOrdersList = filteredOrders
        .filter(o => o.status === 'serving')
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const readyOrdersList = filteredOrders
        .filter(o => o.status === 'ready')
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    return (
        <div className="min-h-screen transition-colors duration-300 bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-100 pt-16 flex relative font-sans">
            {/* 🟢 CỘT BÊN TRÁI: ĐIỀU HƯỚNG, BỘ LỌC & TỔNG KẾT CA TRỰC */}
            <div className="w-80 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 p-5 flex flex-col justify-between fixed left-0 top-16 bottom-0 z-10">
                <div className="space-y-5 overflow-y-auto max-h-[85vh] pr-1">
                    {/* 🏗️ Bộ Lọc Chi Nhánh */}
                    <div>
                        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">🏗️ Chi Nhánh</h3>
                        {userRole === 'admin' ? (
                            // Admin: dropdown chọn tự do
                            <select
                                value={selectedStoreFilter}
                                onChange={(e) => setSelectedStoreFilter(e.target.value)}
                                className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-purple-500 cursor-pointer"
                            >
                                <option value="all">🏢 Tất cả chi nhánh</option>
                                {BRANCHES.map(b => (
                                    <option key={b.id} value={b.id}>{b.label}</option>
                                ))}
                            </select>
                        ) : (
                            // Staff: hiển thị badge khóa cứng
                            <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-xl px-3 py-2">
                                <span className="text-blue-600 dark:text-blue-400 text-sm">📍</span>
                                <div>
                                    <div className="text-xs font-black text-blue-700 dark:text-blue-300">{getBranchLabel(storeId)}</div>
                                    <div className="text-[10px] text-blue-500 dark:text-blue-400">🔒 Tài khoản gắn cố định</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Thống kê đơn hàng active */}
                    <div>
                        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">📊 Ca Trực: {getBranchLabel(selectedStoreFilter)}</h3>
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-slate-100 dark:bg-slate-700/50 p-2 rounded-lg border border-slate-200 dark:border-slate-600/50">
                                <div className="text-lg font-black text-amber-600 dark:text-amber-400">{stats.pendingCount}</div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400">Chờ duyệt</div>
                            </div>
                            <div className="bg-slate-100 dark:bg-slate-700/50 p-2 rounded-lg border border-slate-200 dark:border-slate-600/50">
                                <div className="text-lg font-black text-blue-600 dark:text-blue-400">{stats.servingCount}</div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400">Đang làm</div>
                            </div>
                            <div className="bg-slate-100 dark:bg-slate-700/50 p-2 rounded-lg border border-slate-200 dark:border-slate-600/50">
                                <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">{stats.readyCount}</div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400">Sẵn sàng</div>
                            </div>
                        </div>
                    </div>

                    {/* 💰 BẢNG TỔNG HỢP DOANH THU CA TRỰC KHUÔN MONGO DB */}
                    <div className="bg-slate-50 dark:bg-slate-700/40 p-4 rounded-xl border border-slate-200 dark:border-slate-600/60 space-y-3 shadow-inner">
                        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-600/50 pb-2">
                            <h3 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                                <span>💰 Báo Cáo Ca Trực</span>
                            </h3>
                            <span className={`text-[10px] border px-2 py-0.5 rounded-full font-bold uppercase ${shiftActive ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' : 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30'}`}>
                                {shiftActive ? '🟢 Ca đang chạy' : '🔴 Chưa mở ca'}
                            </span>
                        </div>

                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between items-center text-[11px]">
                                <span className="text-slate-500 dark:text-slate-400">Tiền thối đầu ca (opening_cash):</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">{shiftOpeningCash.toLocaleString()} đ</span>
                            </div>

                            <div className="flex justify-between items-center text-[11px] bg-white dark:bg-slate-800/70 p-2 rounded-lg border border-slate-200 dark:border-slate-700/60">
                                <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                    <span>💵 Tiền mặt (system_cash):</span>
                                </span>
                                <span className="font-bold text-amber-600 dark:text-amber-300">{shiftCashCollected.toLocaleString()} đ</span>
                            </div>

                            <div className="flex justify-between items-center text-[11px] bg-white dark:bg-slate-800/70 p-2 rounded-lg border border-slate-200 dark:border-slate-700/60">
                                <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                    <span>💳 Chuyển khoản (banking):</span>
                                </span>
                                <span className="font-bold text-blue-600 dark:text-blue-300">{shiftBankingCollected.toLocaleString()} đ</span>
                            </div>

                            <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 pt-1">
                                <span>Tổng Bill hoàn thành / hủy:</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">{shiftBillsCompleted} xong | {shiftBillsCancelled} hủy</span>
                            </div>
                        </div>

                        {/* 🎛️ 3 NÚT THAO TÁC PHÂN RÕ: MỞ CA - KẾT CA - LỊCH SỬ */}
                        <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-600/50">
                            {!shiftActive ? (
                                <button
                                    onClick={() => setShowOpenShiftModal(true)}
                                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center space-x-1 border border-emerald-400/40"
                                >
                                    <span>🟢 1. Mở Ca Làm Việc Mới</span>
                                </button>
                            ) : (
                                <button
                                    onClick={() => {
                                        setClosingActualCash(expectedDrawerCash.toString());
                                        setShowCloseShiftModal(true);
                                    }}
                                    className="w-full py-2.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white text-xs font-black rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center space-x-1 border border-amber-500/40"
                                >
                                    <span>🔴 2. Kết Ca & Bàn Giao Két</span>
                                </button>
                            )}

                            <button
                                onClick={fetchShiftHistory}
                                className="w-full py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-[11px] font-bold rounded-lg transition-all border border-slate-300 dark:border-slate-600 cursor-pointer flex items-center justify-center space-x-1"
                            >
                                <span>📜 3. Xem Lịch Sử Ca Trực (MongoDB)</span>
                            </button>
                        </div>
                    </div>

                    {/* Bộ lọc & Tìm kiếm */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">🔍 Bộ lọc đơn hàng</h3>

                        <input
                            type="text"
                            placeholder="Mã đơn, Tên người đặt, Số bàn..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-100 dark:bg-slate-700 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500"
                        />

                        <div className="flex gap-1.5 bg-slate-200 dark:bg-slate-700 p-1 rounded-lg">
                            <button
                                onClick={() => setTypeFilter('all')}
                                className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${typeFilter === 'all' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
                            >
                                Tất cả
                            </button>
                            <button
                                onClick={() => setTypeFilter('dine-in')}
                                className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${typeFilter === 'dine-in' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
                            >
                                Tại bàn
                            </button>
                            <button
                                onClick={() => setTypeFilter('take-away')}
                                className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${typeFilter === 'take-away' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
                            >
                                Mang đi
                            </button>
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
                    <span>Nhân viên: <strong className="text-slate-800 dark:text-slate-200">{staffName}</strong></span>
                    <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full uppercase tracking-wider">{userRole}</span>
                </div>
            </div>

            {/* 🔴 KHU VỰC CHÍNH (KANBAN BOARD): 3 CỘT QUY TRÌNH PHỤC VỤ */}
            <div className="flex-1 ml-80 p-6 flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                        <span>📋 Hàng Đợi Phục Vụ Chi Nhánh {storeId === 'store_Q1' ? 'Quận 1' : 'Thủ Đức'}</span>
                        {loading && <span className="text-xs font-normal text-slate-400 animate-pulse">(Đang đồng bộ...)</span>}
                    </h2>
                </div>

                {/* Kanban Columns container */}
                <div className="grid grid-cols-3 gap-5 flex-1 overflow-hidden h-[90%] pb-4">
                    {/* Cột 1: Chờ xác nhận */}
                    <div className="bg-slate-200/60 dark:bg-slate-800/40 rounded-2xl border border-slate-300 dark:border-slate-800 flex flex-col h-full overflow-hidden">
                        <div className="p-4 border-b border-slate-300 dark:border-slate-700/50 flex justify-between items-center bg-white dark:bg-slate-800/75">
                            <span className="text-sm font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider flex items-center gap-1.5">
                                🟡 Chờ xác nhận ({pendingOrdersList.length})
                            </span>
                            <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold">Mới</span>
                        </div>
                        <div className="p-3 overflow-y-auto flex-1 space-y-3">
                            {pendingOrdersList.map(order => (
                                <div
                                    key={order._id}
                                    onClick={() => setSelectedOrder(order)}
                                    className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 rounded-xl p-4 transition-all cursor-pointer shadow-sm relative group space-y-2"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="text-xs font-black text-purple-600 dark:text-purple-400">#{order._id.slice(-6).toUpperCase()}</span>
                                            <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 mt-0.5 flex items-center gap-1">
                                                <span>👤</span>
                                                <span className="truncate max-w-[120px]">{order.created_by || 'Khách hàng'}</span>
                                            </div>
                                        </div>
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${order.order_type === 'dine-in' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'}`}>
                                            {order.order_type === 'dine-in' ? `Bàn 0${order.table_id?.slice(-1) || 'x'}` : 'Mang đi'}
                                        </span>
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                                        {order.items.map(it => `${it.name} (${it.quantity})`).join(', ')}
                                    </div>
                                    <div className="flex justify-between items-center pt-1 border-t border-slate-100 dark:border-slate-700/40">
                                        <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                            <span>⌛</span> Chờ Staff nhận
                                        </span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleAcceptOrder(order._id);
                                            }}
                                            className="px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wide bg-amber-500 hover:bg-amber-600 text-slate-900 shadow-md cursor-pointer transition-all"
                                        >
                                            Nhận đơn
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Cột 2: Đang xử lý / Bếp nấu */}
                    <div className="bg-slate-200/60 dark:bg-slate-800/40 rounded-2xl border border-slate-300 dark:border-slate-800 flex flex-col h-full overflow-hidden">
                        <div className="p-4 border-b border-slate-300 dark:border-slate-700/50 flex justify-between items-center bg-white dark:bg-slate-800/75">
                            <span className="text-sm font-black uppercase text-blue-600 dark:text-blue-400 tracking-wider flex items-center gap-1.5">
                                🔵 Đang xử lý bếp ({servingOrdersList.length})
                            </span>
                            <span className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-bold">Chế biến</span>
                        </div>
                        <div className="p-3 overflow-y-auto flex-1 space-y-3">
                            {servingOrdersList.map(order => (
                                <div
                                    key={order._id}
                                    onClick={() => setSelectedOrder(order)}
                                    className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 rounded-xl p-4 transition-all cursor-pointer shadow-sm relative group space-y-2"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="text-xs font-black text-purple-600 dark:text-purple-400">#{order._id.slice(-6).toUpperCase()}</span>
                                            <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 mt-0.5 flex items-center gap-1">
                                                <span>👤</span>
                                                <span className="truncate max-w-[120px]">{order.created_by || 'Khách hàng'}</span>
                                            </div>
                                        </div>
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${order.order_type === 'dine-in' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'}`}>
                                            {order.order_type === 'dine-in' ? `Bàn 0${order.table_id?.slice(-1) || 'x'}` : 'Mang đi'}
                                        </span>
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                                        {order.items.map(it => `${it.name} (${it.quantity})`).join(', ')}
                                    </div>
                                    <div className="flex justify-between items-center pt-1 border-t border-slate-100 dark:border-slate-700/40">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handlePrintKitchenBill(order);
                                            }}
                                            className="px-2 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-black tracking-wide shadow-sm transition-all cursor-pointer flex items-center gap-1"
                                        >
                                            🖨️ In Bill Bếp
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleReadyOrder(order._id);
                                            }}
                                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black tracking-wide shadow-md transition-all cursor-pointer"
                                        >
                                            Báo xong
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Cột 3: Đã xong / Chờ trả khách */}
                    <div className="bg-slate-200/60 dark:bg-slate-800/40 rounded-2xl border border-slate-300 dark:border-slate-800 flex flex-col h-full overflow-hidden">
                        <div className="p-4 border-b border-slate-300 dark:border-slate-700/50 flex justify-between items-center bg-white dark:bg-slate-800/75">
                            <span className="text-sm font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider flex items-center gap-1.5">
                                🟢 Chờ trả đơn ({readyOrdersList.length})
                            </span>
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">Trả nước</span>
                        </div>
                        <div className="p-3 overflow-y-auto flex-1 space-y-3">
                            {readyOrdersList.map(order => (
                                <div
                                    key={order._id}
                                    onClick={() => setSelectedOrder(order)}
                                    className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 rounded-xl p-4 transition-all cursor-pointer shadow-sm relative group space-y-2"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="text-xs font-black text-purple-600 dark:text-purple-400">#{order._id.slice(-6).toUpperCase()}</span>
                                            <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 mt-0.5 flex items-center gap-1">
                                                <span>👤</span>
                                                <span className="truncate max-w-[120px]">{order.created_by || 'Khách hàng'}</span>
                                            </div>
                                        </div>
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${order.order_type === 'dine-in' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'}`}>
                                            {order.order_type === 'dine-in' ? `Bàn 0${order.table_id?.slice(-1) || 'x'}` : 'Mang đi'}
                                        </span>
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                                        {order.items.map(it => `${it.name} (${it.quantity})`).join(', ')}
                                    </div>
                                    <div className="flex justify-between items-center pt-1 border-t border-slate-100 dark:border-slate-700/40">
                                        <span className={`text-[10px] font-bold ${order.payment_status === 'paid' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400 font-extrabold'}`}>
                                            {order.payment_status === 'paid' ? '💳 Đã thanh toán' : '💵 Chờ thanh toán'}
                                        </span>

                                        {order.payment_status === 'paid' ? (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSettleOrder(order._id, order.payment_method || 'payos');
                                                }}
                                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black tracking-wide shadow-md transition-all cursor-pointer flex items-center gap-1"
                                            >
                                                <span>✅ Đóng đơn</span>
                                            </button>
                                        ) : (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSettleModalOrder(order);
                                                }}
                                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-[10px] font-black tracking-wide shadow-md transition-all cursor-pointer flex items-center gap-1"
                                            >
                                                <span>💵 Thu tiền & Đóng</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* 🟢 MODAL MỞ CA TRỰC MỚI */}
            {showOpenShiftModal && (
                <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <form onSubmit={handleOpenShiftSubmit} className="bg-slate-800 border border-emerald-500/40 p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4 text-slate-100 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex justify-between items-center border-b border-slate-700 pb-3">
                            <div>
                                <h3 className="font-black text-sm text-emerald-400 uppercase flex items-center gap-1.5">
                                    <span>🟢 MỞ CA LÀM VIỆC MỚI</span>
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">Khai báo tiền thối két sắt khi bắt đầu ca</p>
                            </div>
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-bold uppercase">
                                STATUS: OPENING
                            </span>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-300 mb-1">
                                    Nhân viên mở ca trực:
                                </label>
                                <input
                                    type="text"
                                    disabled
                                    value={`${staffName} (${userRole})`}
                                    className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-purple-300 font-bold"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-300 mb-1">
                                    💵 Số tiền thối bàn giao đầu ca (opening_cash):
                                </label>
                                <input
                                    type="number"
                                    required
                                    value={openingCashInput}
                                    onChange={(e) => setOpeningCashInput(e.target.value)}
                                    placeholder="Nhập số tiền mặt có sẵn trong két..."
                                    className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-emerald-400 font-black focus:outline-none focus:border-emerald-500"
                                />
                                <p className="text-[10px] text-slate-400 italic mt-1">Mặc định ban đầu: 500,000 đ</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowOpenShiftModal(false)}
                                className="py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="submit"
                                className="py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs transition-all shadow-md cursor-pointer border border-emerald-400/40"
                            >
                                🟢 XÁC NHẬN MỞ CA
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* 🔴 MODAL CHỐT KẾT CA TRỰC KHUÔN MONGO DB */}
            {showCloseShiftModal && (
                <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-3 overflow-y-auto">
                    <form onSubmit={handleCloseShiftSubmit} className="bg-slate-800 border border-red-500/40 p-4 sm:p-5 rounded-2xl max-w-md w-full shadow-2xl space-y-3 text-slate-100 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
                        <div className="flex justify-between items-center border-b border-slate-700 pb-2.5">
                            <div>
                                <h3 className="font-black text-sm text-red-400 uppercase flex items-center gap-1.5">
                                    <span>🔴 CHỐT KẾT CA & BÀN GIAO KÉT</span>
                                </h3>
                                <p className="text-[11px] text-slate-400 mt-0.5">Chi nhánh: <strong className="text-amber-400">{storeId === 'store_Q1' ? 'Quận 1' : 'Thủ Đức'}</strong> | Nhân viên: <strong className="text-purple-300">{staffName}</strong></p>
                            </div>
                            <span className="text-[9px] bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded font-bold uppercase">
                                CLOSED
                            </span>
                        </div>

                        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700 space-y-2 text-[11px]">
                            <div className="flex justify-between text-slate-300">
                                <span>Tiền thối đầu ca (opening_cash):</span>
                                <span className="font-bold text-amber-300">{shiftOpeningCash.toLocaleString()} đ</span>
                            </div>
                            <div className="flex justify-between text-slate-300">
                                <span>Tiền mặt thu (system_cash):</span>
                                <span className="font-bold text-emerald-400">+{shiftCashCollected.toLocaleString()} đ</span>
                            </div>
                            <div className="flex justify-between text-slate-300">
                                <span>Chuyển khoản QR thu (banking):</span>
                                <span className="font-bold text-blue-400">+{shiftBankingCollected.toLocaleString()} đ</span>
                            </div>
                            <div className="flex justify-between text-slate-300 pt-1 border-t border-slate-800">
                                <span>Bill xong / Hủy:</span>
                                <span className="font-bold text-slate-200">{shiftBillsCompleted} xong | {shiftBillsCancelled} hủy</span>
                            </div>

                            <div className="flex justify-between items-center pt-2 border-t border-slate-700 text-xs font-black text-amber-400">
                                <span>TIỀN MẶT KÉT LÝ THUYẾT NÊN CÓ:</span>
                                <span className="text-sm font-black">{expectedDrawerCash.toLocaleString()} đ</span>
                            </div>
                        </div>

                        <div className="space-y-2.5 pt-0.5">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                                    💵 Tiền mặt thực tế đếm được (closing_cash_actual):
                                </label>
                                <input
                                    type="number"
                                    required
                                    value={closingActualCash}
                                    onChange={(e) => setClosingActualCash(e.target.value)}
                                    placeholder="Nhập số tiền mặt đếm bằng tay..."
                                    className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2 text-xs text-amber-300 font-bold focus:outline-none focus:border-red-500"
                                />
                            </div>

                            {closingActualCash !== '' && (
                                <div className="flex justify-between items-center bg-slate-900/60 p-2 rounded-lg border border-slate-700 text-[11px]">
                                    <span className="text-slate-400 font-medium">Chênh lệch két (difference):</span>
                                    {Number(closingActualCash) - expectedDrawerCash === 0 ? (
                                        <span className="font-black text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                                            ✓ 0 đ (Khớp 100%)
                                        </span>
                                    ) : (
                                        <span className={`font-black px-2 py-0.5 rounded border ${Number(closingActualCash) - expectedDrawerCash > 0 ? 'text-blue-400 bg-blue-500/20 border-blue-500/30' : 'text-red-400 bg-red-500/20 border-red-500/30'}`}>
                                            {Number(closingActualCash) - expectedDrawerCash > 0 ? '+' : ''}{(Number(closingActualCash) - expectedDrawerCash).toLocaleString()} đ ({Number(closingActualCash) - expectedDrawerCash > 0 ? 'Thừa tiền' : 'Hụt tiền'})
                                        </span>
                                    )}
                                </div>
                            )}

                            <div>
                                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                                    📝 Ghi chú ca trực bàn giao (note):
                                </label>
                                <textarea
                                    rows={2}
                                    value={shiftNote}
                                    onChange={(e) => setShiftNote(e.target.value)}
                                    placeholder="Ví dụ: Khớp két 100% hoặc ghi rõ lý do chênh lệch tiền..."
                                    className="w-full bg-slate-900 border border-slate-600 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-red-500"
                                />
                            </div>
                        </div>

                        <div className="bg-slate-900/50 p-2.5 rounded-xl border border-slate-700 flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="autoHandover"
                                    checked={autoHandover}
                                    onChange={(e) => setAutoHandover(e.target.checked)}
                                    className="w-4 h-4 accent-emerald-500 rounded border-slate-600 bg-slate-900 cursor-pointer"
                                />
                                <label htmlFor="autoHandover" className="text-xs font-bold text-slate-200 cursor-pointer select-none">
                                    ☑️ Tự động mở ca mới ngay lập tức
                                </label>
                            </div>
                            <span className="text-[10px] text-slate-400 max-w-[150px] text-right">Tiền mặt kết ca sẽ thành tiền đầu ca mới</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowCloseShiftModal(false)}
                                className="py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                            >
                                Quay lại
                            </button>
                            <button
                                type="submit"
                                className="py-2.5 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl text-xs transition-all shadow-md cursor-pointer border border-red-400/40"
                            >
                                🔴 XÁC NHẬN KẾT CA
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* 📜 MODAL XEM LỊCH SỬ CA TRỰC TRONG MONGODB */}
            {showHistoryModal && (
                <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl max-w-4xl w-full shadow-2xl space-y-4 text-slate-100 max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex justify-between items-center border-b border-slate-700 pb-3">
                            <div>
                                <h3 className="font-black text-base text-purple-400 uppercase flex items-center gap-2">
                                    <span>📜 LỊCH SỬ KẾT CA TRỰC (MONGODB ATLAS)</span>
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">Danh sách các phiên ca trực đã chốt khóa sổ của chi nhánh</p>
                            </div>
                            <button
                                onClick={() => setShowHistoryModal(false)}
                                className="text-slate-400 hover:text-white font-bold text-sm cursor-pointer"
                            >
                                ✕ Đóng
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                            {shiftHistoryList.length === 0 ? (
                                <div className="text-center py-10 text-slate-400 text-xs font-medium">Chưa có lịch sử ca trực nào được đóng trong hệ thống.</div>
                            ) : shiftHistoryList.map((shift) => (
                                <div key={shift._id} className="bg-slate-900/80 p-4 rounded-xl border border-slate-700/70 text-xs space-y-2">
                                    <div className="flex justify-between items-start border-b border-slate-800 pb-2">
                                        <div>
                                            <span className="font-mono text-purple-300 font-bold">#{shift._id}</span>
                                            <div className="text-slate-300 font-bold mt-0.5">👤 {shift.staff_name || 'Nhân viên quầy'} | 🏪 Chi nhánh: {shift.store_id}</div>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${shift.difference === 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                                            {shift.difference === 0 ? '✓ Khớp 100%' : `Lệch: ${shift.difference.toLocaleString()}đ`}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-4 gap-2 text-[11px]">
                                        <div><span className="text-slate-500 block">Đầu ca (opening):</span> <strong className="text-slate-200">{shift.opening_cash?.toLocaleString()}đ</strong></div>
                                        <div><span className="text-slate-500 block">Hệ thống (system_cash):</span> <strong className="text-amber-300">{shift.system_cash_collected?.toLocaleString()}đ</strong></div>
                                        <div><span className="text-slate-500 block">Thực tế (closing_cash):</span> <strong className="text-emerald-400">{shift.closing_cash_actual?.toLocaleString()}đ</strong></div>
                                        <div><span className="text-slate-500 block">Số Bill (xong/hủy):</span> <strong className="text-purple-300">{shift.total_bills_completed || 0} / {shift.total_bills_cancelled || 0}</strong></div>
                                    </div>

                                    {shift.note && (
                                        <div className="text-[11px] bg-slate-800 p-2 rounded border border-slate-700/50 text-slate-300 italic">
                                            📝 Ghi chú ca: "{shift.note}"
                                        </div>
                                    )}

                                    <div className="text-[10px] text-slate-500 text-right">
                                        Mở: {new Date(shift.start_time).toLocaleString('vi-VN')} | Kết: {shift.end_time ? new Date(shift.end_time).toLocaleString('vi-VN') : 'Đang mở'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* 🧾 MODAL CHI TIẾT ĐƠN HÀNG */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4 text-slate-100">
                        <div className="flex justify-between items-center border-b border-slate-700 pb-3">
                            <div>
                                <h3 className="font-black text-sm text-slate-100 uppercase">Mã đơn: #{selectedOrder._id.slice(-6).toUpperCase()}</h3>
                                <p className="text-xs font-bold text-purple-300 mt-0.5">👤 Người đặt: {selectedOrder.created_by || 'Khách hàng'}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">Ngày lập: {new Date(selectedOrder.createdAt).toLocaleString('vi-VN')}</p>
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase ${selectedOrder.order_type === 'dine-in' ? 'bg-blue-900/40 text-blue-300 border border-blue-800' : 'bg-amber-900/40 text-amber-300 border border-amber-800'}`}>
                                {selectedOrder.order_type === 'dine-in' ? `Bàn 0${selectedOrder.table_id?.slice(-1)}` : 'Mang đi'}
                            </span>
                        </div>

                        <div className="divide-y divide-slate-700 max-h-48 overflow-y-auto">
                            {selectedOrder.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between py-2 text-xs">
                                    <div>
                                        <div className="font-semibold text-slate-200">{item.name}</div>
                                        <div className="text-[10px] text-slate-400">Size: {item.selected_attributes?.size || 'M'} | Giá: {item.price.toLocaleString()}đ</div>
                                    </div>
                                    <span className="font-bold text-slate-100">x{item.quantity}</span>
                                </div>
                            ))}
                        </div>

                        <div className="border-t border-slate-700 pt-3 space-y-1.5">
                            <div className="flex justify-between text-xs text-slate-400">
                                <span>Cộng tiền món:</span>
                                <span>{selectedOrder.sub_total.toLocaleString()}đ</span>
                            </div>
                            <div className="flex justify-between text-xs text-slate-400">
                                <span>Mã giảm giá (Coupon):</span>
                                <span>-{selectedOrder.discount_amount.toLocaleString()}đ</span>
                            </div>
                            <div className="flex justify-between text-sm font-black text-slate-100 pt-2 border-t border-slate-700/50">
                                <span>TỔNG THANH TOÁN:</span>
                                <span className="text-red-400">{selectedOrder.final_total.toLocaleString()}đ</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-3">
                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="py-2.5 bg-slate-700 hover:bg-slate-650 text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                            >
                                Đóng cửa sổ
                            </button>
                            <button
                                onClick={() => {
                                    const rawCustId = typeof selectedOrder.customer_id === 'object'
                                        ? selectedOrder.customer_id?._id
                                        : (selectedOrder.customer_id || selectedOrder.user_id);
                                    const currentUserId = user?._id || user?.id;

                                    // Nếu đơn hàng có ID khách hàng hợp lệ và không phải là ID của chính nhân viên tạo đơn tại quầy
                                    if (rawCustId && rawCustId.toString() !== currentUserId?.toString()) {
                                        navigate(`/chat?customerId=${encodeURIComponent(rawCustId.toString())}`);
                                    } else {
                                        alert('Đơn hàng này được lập tại quầy (Khách vãng lai/Trực tiếp), không có tài khoản Khách hàng online để nhắn tin.');
                                    }
                                }}
                                className="py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center space-x-1 shadow-sm cursor-pointer"
                            >
                                💬 Nhắn khách hàng
                            </button>
                        </div>

                        {selectedOrder.status !== 'ready' && (
                            <button
                                onClick={() => handleCancelOrder(selectedOrder._id)}
                                className="w-full py-2 bg-red-950/40 text-red-400 border border-red-900/50 hover:bg-red-900/20 font-bold rounded-xl text-xs transition-colors cursor-pointer text-center"
                            >
                                ⚠️ Hủy bỏ đơn hàng
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* 💳 MODAL CHỌN PHƯƠNG THỨC THANH TOÁN KHI ĐÓNG ĐƠN UNPAID */}
            {settleModalOrder && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 border border-amber-500/40 p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4 text-slate-100">
                        <div className="flex justify-between items-center border-b border-slate-700 pb-3">
                            <div>
                                <h3 className="font-black text-sm text-amber-400 uppercase flex items-center gap-1.5">
                                    <span>💵 XÁC NHẬN THU TIỀN HÓA ĐƠN</span>
                                </h3>
                                <p className="text-xs font-bold text-slate-200 mt-1">
                                    Mã đơn: <span className="text-purple-400">#{settleModalOrder._id.slice(-6).toUpperCase()}</span> | 👤 {settleModalOrder.created_by || 'Khách hàng'}
                                </p>
                            </div>
                            <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded font-bold uppercase">
                                {settleModalOrder.order_type === 'dine-in' ? `Bàn 0${settleModalOrder.table_id?.slice(-1)}` : 'Mang đi'}
                            </span>
                        </div>

                        <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-700/60 text-xs space-y-2">
                            <div className="flex justify-between text-slate-300">
                                <span>Món ăn đã gọi ({settleModalOrder.items.length}):</span>
                                <span className="font-semibold">{settleModalOrder.items.map(i => i.name).join(', ')}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-sm font-black">
                                <span>TỔNG TIỀN CẦN THU:</span>
                                <span className="text-red-400 text-base">{settleModalOrder.final_total.toLocaleString()} đ</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <button
                                onClick={() => handleSettleOrder(settleModalOrder._id, 'cash')}
                                className="py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs transition-all shadow-md cursor-pointer flex flex-col items-center justify-center space-y-1 border border-emerald-500/30"
                            >
                                <span className="text-base">💵 Tiền mặt</span>
                                <span className="text-[9px] font-normal text-emerald-100">Đã thu đủ tiền tại quầy</span>
                            </button>

                            <button
                                onClick={() => {
                                    setQrVerifyingOrder(settleModalOrder);
                                }}
                                className="py-3 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl text-xs transition-all shadow-md cursor-pointer flex flex-col items-center justify-center space-y-1 border border-blue-500/30"
                            >
                                <span className="text-base">💳 Chuyển khoản QR</span>
                                <span className="text-[9px] font-normal text-blue-100">Quét VietQR & kiểm tra tiền về</span>
                            </button>
                        </div>

                        <button
                            onClick={() => setSettleModalOrder(null)}
                            className="w-full py-2 bg-slate-700 hover:bg-slate-650 text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer text-center mt-2"
                        >
                            Quay lại (Chưa thu tiền)
                        </button>
                    </div>
                </div>
            )}

            {/* 💳 MODAL XÁC THỰC MÃ QR THANH TOÁN CHUYỂN KHOẢN TẠI QUẦY */}
            {qrVerifyingOrder && (
                <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-[60] p-4">
                    <div className="bg-slate-800 border border-blue-500/40 p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4 text-slate-100 animate-in zoom-in-95 duration-150">
                        <div className="flex justify-between items-center border-b border-slate-700 pb-3">
                            <div>
                                <h3 className="font-black text-sm text-blue-400 uppercase flex items-center gap-1.5">
                                    <span>💳 QUÉT MÃ QR & XÁC THỰC CHUYỂN KHOẢN</span>
                                </h3>
                                <p className="text-xs text-slate-300 mt-0.5">
                                    Mã đơn: <span className="text-purple-300 font-bold">#{qrVerifyingOrder._id.slice(-6).toUpperCase()}</span> | Khách: <strong>{qrVerifyingOrder.created_by || 'Khách hàng'}</strong>
                                </p>
                            </div>
                            <button
                                onClick={() => setQrVerifyingOrder(null)}
                                className="text-slate-400 hover:text-white font-bold text-sm cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Mã QR VietQR / PayOS SDK */}
                        <div className="flex flex-col items-center space-y-3">
                            <div className="p-2.5 bg-white rounded-xl shadow-md border border-slate-200">
                                <img
                                    src={
                                        payosLinkData?.qrCode
                                            ? (payosLinkData.qrCode.startsWith('http') || payosLinkData.qrCode.startsWith('data:')
                                                ? payosLinkData.qrCode
                                                : `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(payosLinkData.qrCode)}`)
                                            : `https://img.vietqr.io/image/${BANK_BIN}-${ACCOUNT_NUMBER}-compact2.png?amount=${qrVerifyingOrder.final_total}&addInfo=${encodeURIComponent(`Thanh Toan Don ${qrVerifyingOrder._id.slice(-6).toUpperCase()}`)}&accountName=${encodeURIComponent(ACCOUNT_NAME)}`
                                    }
                                    alt="VietQR / PayOS Payment Code"
                                    className="w-48 h-48 object-contain"
                                />
                            </div>

                            {payosLinkData?.checkoutUrl && (
                                <a
                                    href={payosLinkData.checkoutUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer flex items-center justify-center space-x-1 border border-emerald-400/40"
                                >
                                    <span>🔗 Mở Cổng Thanh Toán PayOS Chính Thức</span>
                                </a>
                            )}

                            <div className="w-full bg-slate-900/80 p-3 rounded-xl border border-slate-700 space-y-1.5 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Số tiền:</span>
                                    <span className="font-black text-emerald-400 text-sm">{qrVerifyingOrder.final_total.toLocaleString()} VNĐ</span>
                                </div>
                                {payosLinkData?.orderCode && (
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Mã PayOS OrderCode:</span>
                                        <span className="font-mono font-bold text-amber-400">{payosLinkData.orderCode}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Nội dung CK:</span>
                                    <span className="font-bold text-purple-300">Thanh Toan Don {qrVerifyingOrder._id.slice(-6).toUpperCase()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Chủ tài khoản:</span>
                                    <span className="font-bold text-slate-200">{ACCOUNT_NAME}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2 pt-1">
                            <button
                                disabled={isVerifyingPayOS}
                                onClick={() => handleVerifyPayOSPayment(qrVerifyingOrder)}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 text-white font-black rounded-xl text-xs transition-all shadow-md cursor-pointer flex items-center justify-center space-x-2 border border-blue-400/40"
                            >
                                <span>{isVerifyingPayOS ? '⏳ Đang kiểm tra API PayOS...' : '🔄 Kiểm tra tự động API PayOS (Check tiền về DB)'}</span>
                            </button>

                            {/* 🧪 NÚT GIẢ LẬP TEST 1-CLICK DÀNH CHO LOCALHOST DEV */}
                            <button
                                type="button"
                                disabled={isVerifyingPayOS}
                                onClick={() => handleSimulateLocalWebhook(qrVerifyingOrder)}
                                className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs transition-all shadow-sm cursor-pointer text-center flex items-center justify-center space-x-1.5 border border-emerald-400/30"
                            >
                                <span>🧪 Giả Lập Khách Chuyển Tiền Test (Local 1-Click)</span>
                            </button>

                            <button
                                onClick={() => setQrVerifyingOrder(null)}
                                className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer text-center"
                            >
                                Quay lại
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderQueue;

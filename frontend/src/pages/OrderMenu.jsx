import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import API from '../services/api';
import { useAuth } from '../context/AuthContext'; // 💡 HỌC TẬP: Import context xác thực để phân quyền giao diện

import tiramisuImg from '../assets/banh1.png';
import cfBlackImg from '../assets/banh2.png';
import lotusTeaImg from '../assets/banh3.png';

// Cấu hình tài khoản nhận tiền thực tế
const BANK_BIN = '970422'; // Ví dụ: MBBank (đổi thành mã BIN ngân hàng của bạn)
const ACCOUNT_NUMBER = '0969839241'; 
const ACCOUNT_NAME = 'LE QUOC CUONG';

const OrderMenu = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth(); // Lấy thông tin tài khoản đang đăng nhập
    const userRole = user?.role || localStorage.getItem('userRole') || 'user'; // Mặc định là user (Khách hàng)
    const orderType = searchParams.get('type') || 'dine-in';
    const tableId = searchParams.get('tableId');
    const orderId = searchParams.get('orderId'); 

    const [showPayModal, setShowPayModal] = useState(false);
    const [showDraftBill, setShowDraftBill] = useState(false);
    const [qrUrl, setQrUrl] = useState('');
    const [isOrderConfirmed, setIsOrderConfirmed] = useState(false); // Quản lý trạng thái đã bấm Xác nhận đơn hàng chưa
    
    // States động từ database
    const [cart, setCart] = useState([]);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [activeCategory, setActiveCategory] = useState('all');
    const [loading, setLoading] = useState(true);

    // 1. Tải sơ đồ thực đơn bánh nước và hóa đơn hiện tại từ Database Atlas
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                setLoading(true);
                
                // 💡 PHÒNG THỦ TỰ ĐỘNG: Nếu đơn hàng mang đi (take-away/delivery) mà chưa có orderId trong URL,
                // ta tự động gọi API tạo mới đơn hàng trong DB để lấy ID, tránh lỗi giỏ hàng không đồng bộ.
                if (!orderId && (orderType === 'take-away' || orderType === 'delivery')) {
                    const newOrderRes = await API.post('/orders/take-away', {
                        store_id: localStorage.getItem('storeId') || 'store_Q1',
                        order_type: orderType
                    });
                    if (newOrderRes.data.success) {
                        const newId = newOrderRes.data.data._id || newOrderRes.data.data.id;
                        setSearchParams({ type: orderType, orderId: newId });
                        return; // Khi setSearchParams chạy, useEffect này sẽ tự động được gọi lại với orderId mới
                    }
                }

                const [prodRes, catRes] = await Promise.all([
                    API.get('/products'),
                    API.get('/categories')
                ]);
                if (prodRes.data.success) {
                    setProducts(prodRes.data.data);
                }
                if (catRes.data.success) {
                    setCategories(catRes.data.data);
                }

                // Nếu bàn đã có khách và có mã orderId, tải hóa đơn hiện có
                if (orderId) {
                    const orderRes = await API.get(`/orders/${orderId}`);
                    if (orderRes.data.success) {
                        const orderData = orderRes.data.data;
                        const mappedItems = orderData.items.map(item => ({
                            product_id: item.product_id,
                            name: item.name,
                            price: item.price,
                            quantity: item.quantity,
                            size: item.selected_attributes?.size || 'M',
                            selected_attributes: item.selected_attributes
                        }));
                        setCart(mappedItems);
                        // Nếu hóa đơn đã có món từ trước, mặc định coi như đã xác nhận đơn
                        if (mappedItems.length > 0) {
                            setIsOrderConfirmed(true);
                        }
                    }
                }
            } catch (err) {
                console.error("Lỗi đồng bộ dữ liệu OrderMenu:", err);
            } finally {
                setLoading(false);
            }
        };
        loadInitialData();
    }, [orderId, orderType, setSearchParams]);

    // 💡 TỰ ĐỘNG DÒ TÌM TRẠNG THÁI THANH TOÁN (POLLING) QUA WEBHOOK/PAYOS:
    useEffect(() => {
        let intervalId;
        
        // Chỉ chạy bộ dò tìm khi modal quét QR đang mở và có mã đơn hàng hợp lệ
        if (showPayModal && orderId) {
            const checkPaymentStatus = async () => {
                try {
                    // Gọi API lấy thông tin đơn hàng hiện tại để xem Webhook đã cập nhật trạng thái "paid" chưa
                    const res = await API.get(`/orders/${orderId}`);
                    if (res.data.success && res.data.data.payment_status === 'paid') {
                        // Dừng vòng lặp dò tìm ngay lập tức
                        clearInterval(intervalId);
                        alert("Hệ thống: Xác nhận giao dịch chuyển khoản PayOS thành công!");
                        setCart([]);
                        setShowPayModal(false);
                        navigate('/tables');
                    }
                } catch (err) {
                    console.error("Lỗi tự động kiểm tra thanh toán:", err);
                }
            };

            // Tiến hành quét kiểm tra trạng thái mỗi 3 giây một lần (3000ms)
            intervalId = setInterval(checkPaymentStatus, 3000);
        }

        // Cleanup: Luôn dọn dẹp bộ đếm thời gian khi đóng modal hoặc hủy component để tránh rò rỉ bộ nhớ
        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [showPayModal, orderId, navigate]);

    // 2. Hàm đồng bộ danh sách giỏ hàng lên Database Atlas (Log vết điều chỉnh)
    const syncCartToDatabase = async (newCart, isDecrease = false) => {
        if (!orderId) return;
        try {
            const body = {
                updated_items: newCart.map(item => ({
                    product_id: item.product_id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    selected_attributes: { size: item.size }
                })),
                reason: isDecrease ? "Hủy/Giảm bớt món ăn" : "Cập nhật giỏ hàng",
                admin_approver_id: isDecrease ? "u_admin_01" : undefined // Mã giả định Admin phê duyệt ghi log
            };
            await API.put(`/orders/${orderId}/edit-items`, body);
        } catch (err) {
            console.error("Lỗi đồng bộ giỏ hàng lên server:", err);
            alert(err.response?.data?.message || "Không thể đồng bộ giỏ hàng lên máy chủ.");
        }
    };

    const handleAddProduct = async (product) => {
        let updatedCart;
        const targetId = product._id || product.product_id;
        const existingIndex = cart.findIndex(item => item.product_id === targetId);
        
        if (existingIndex > -1) {
            updatedCart = [...cart];
            updatedCart[existingIndex].quantity += 1;
        } else {
            updatedCart = [...cart, { 
                product_id: targetId, 
                name: product.name, 
                price: product.price, 
                quantity: 1, 
                size: 'M' 
            }];
        }
        setCart(updatedCart);
        setIsOrderConfirmed(false); // Cần bấm xác nhận lại vì giỏ hàng đã thay đổi
        await syncCartToDatabase(updatedCart, false);
    };

    const handleDecreaseQuantity = async (index) => {
        const item = cart[index];
        const adminPin = window.prompt("⚠️ Cảnh báo: Hành động giảm/hủy món yêu cầu xác nhận. Vui lòng nhập mã PIN của Admin/Quản lý để tiếp tục:");
        if (adminPin === "1234") {
            const updatedCart = [...cart];
            if (item.quantity > 1) {
                updatedCart[index].quantity -= 1;
            } else {
                updatedCart.splice(index, 1);
            }
            setCart(updatedCart);
            setIsOrderConfirmed(false); // Cần bấm xác nhận lại vì giỏ hàng đã thay đổi
            await syncCartToDatabase(updatedCart, true);
            alert("Đã phê duyệt chỉnh sửa và ghi lại nhật ký đối soát.");
        } else {
            alert("Mã PIN không chính xác. Quyền nhân viên bị từ chối.");
        }
    };

    // 💡 HỌC TẬP: Hàm xử lý Xác nhận đơn hàng trước khi in bill tạm tính / quét mã QR
    const handleConfirmOrder = () => {
        if (cart.length === 0) {
            alert("Giỏ hàng đang trống!");
            return;
        }
        
        setIsOrderConfirmed(true);
        alert("Đơn hàng đã được xác nhận thành công!");
        
        // Nếu vai trò đăng nhập là Khách hàng (user), tự động mở luôn modal QR thanh toán
        if (userRole === 'user') {
            handleOpenPayment();
        }
    };

    const calculateTotal = () => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const handleOpenPayment = () => {
        const totalAmount = calculateTotal();
        if (totalAmount === 0) return alert("Giỏ hàng đang trống!");

        const qrContent = `Thanh Toan Don ${orderId ? orderId.slice(-6).toUpperCase() : 'Moi'}`;
        const newQrUrl = `https://img.vietqr.io/image/${BANK_BIN}-${ACCOUNT_NUMBER}-compact2.jpg?amount=${totalAmount}&addInfo=${qrContent}&accountName=${ACCOUNT_NAME}`;
        
        setQrUrl(newQrUrl);
        setShowPayModal(true);
    };

    // Lọc danh sách sản phẩm theo tab danh mục đang chọn
    const filteredProducts = activeCategory === 'all'
        ? products
        : products.filter(p => p.category_id === activeCategory);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-sm font-bold text-gray-400 uppercase tracking-wider animate-pulse">
                    ⏳ Đang nạp thực đơn & đồng bộ hóa đơn...
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 pt-16 flex relative">
            {/* 🟢 CỘT BÊN TRÁI: DANH SÁCH MENU MÓN ĂN */}
            <div className="w-2/3 p-6 overflow-y-auto pb-24">
                <div className="flex items-center space-x-4 mb-6">
                    <button onClick={() => navigate('/tables')} className="text-sm font-bold text-blue-600 bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-2xs hover:bg-gray-50">⬅️ Trở lại Sơ đồ</button>
                    <h2 className="text-xl font-black text-gray-800 uppercase tracking-wide">Menu Phục Vụ ({orderType})</h2>
                </div>

                {/* 🏷️ TABS DANH MỤC ĐỘNG TỪ DATABASE */}
                <div className="flex space-x-2 overflow-x-auto pb-4 mb-6 border-b border-gray-200">
                    <button
                        onClick={() => setActiveCategory('all')}
                        className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                            activeCategory === 'all'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                        }`}
                    >
                        Tất cả
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat._id}
                            onClick={() => setActiveCategory(cat._id)}
                            className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                                activeCategory === cat._id
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {filteredProducts.map(product => (
                        <div key={product._id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                            <div>
                                <h3 className="font-bold text-gray-800 line-clamp-1">{product.name}</h3>
                                <div className="w-full h-36 bg-gray-100 relative rounded-lg overflow-hidden my-2 border border-gray-100">
                                    <img
                                        src={product.image_url || product.image || "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500"}
                                        alt={product.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <span className="text-sm text-amber-600 font-black">{product.price.toLocaleString()} đ</span>
                            </div>
                            <button
                                onClick={() => handleAddProduct(product)}
                                className="mt-4 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
                            >
                                + Chọn món
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* 🔴 CỘT BÊN PHẢI: GIỎ HÀNG VÀ HÀNH ĐỘNG IN BILL/THANH TOÁN */}
            <div className="w-1/3 bg-white border-l border-gray-200 p-6 flex flex-col justify-between fixed right-0 top-16 bottom-0 shadow-lg">
                <div>
                    <h2 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-3 mb-4 flex justify-between items-center">
                        <span>🛒 Chi tiết đơn hàng</span>
                        {tableId && <span className="text-xs bg-red-50 text-red-600 border border-red-100 px-2 py-0.5 rounded-md font-bold uppercase">Bàn {tableId.slice(-1)}</span>}
                    </h2>

                    {cart.length === 0 ? (
                        <div className="text-center text-gray-400 mt-12 text-sm font-bold uppercase tracking-wider animate-pulse">Giỏ hàng trống</div>
                    ) : (
                        <div className="space-y-3 overflow-y-auto max-h-[50vh]">
                            {cart.map((item, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 text-sm">
                                    <div>
                                        <div className="font-semibold text-gray-800">{item.name} <span className="text-[10px] text-blue-500 font-bold">({item.size})</span></div>
                                        <span className="text-xs text-gray-500 font-bold">{(item.price * item.quantity).toLocaleString()} đ</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={() => handleDecreaseQuantity(index)}
                                            className="w-7 h-7 bg-red-100 text-red-700 rounded-lg flex items-center justify-center font-black text-sm hover:bg-red-200 transition-colors"
                                        >
                                            -
                                        </button>
                                        <span className="font-bold w-4 text-center">{item.quantity}</span>
                                        <button
                                            onClick={() => handleAddProduct({ product_id: item.product_id, name: item.name, price: item.price })}
                                            className="w-7 h-7 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center font-black text-sm hover:bg-blue-200 transition-colors"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Khối thanh toán tính tiền dưới cùng */}
                <div className="border-t border-gray-200 pt-4 bg-white">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-gray-500 font-bold uppercase text-xs">Tổng số tiền:</span>
                        <span className="text-xl font-black text-red-600">{calculateTotal().toLocaleString()} đ</span>
                    </div>

                    {/* ⚙️ THÀNH PHẦN MỚI: Bắt buộc bấm Xác nhận đơn hàng trước khi thanh toán / in bill */}
                    {!isOrderConfirmed ? (
                        <button
                            onClick={handleConfirmOrder}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs transition-all shadow-sm cursor-pointer"
                        >
                            🔔 Xác nhận đơn hàng
                        </button>
                    ) : (
                        <div className="flex flex-col space-y-2">
                            {/* Nút nhỏ báo trạng thái đã xác nhận và cho phép sửa lại */}
                            <div className="flex justify-between items-center text-[10px] text-green-600 font-bold bg-green-50/50 p-2 rounded-lg border border-green-100">
                                <span>✓ Đơn hàng đã được xác nhận</span>
                                <button 
                                    onClick={() => setIsOrderConfirmed(false)}
                                    className="text-blue-500 hover:underline cursor-pointer font-bold"
                                >
                                    Thay đổi
                                </button>
                            </div>

                            {/* Phân quyền hiển thị nút bấm sau khi đã xác nhận */}
                            {userRole === 'user' ? (
                                // Đối với KHÁCH HÀNG (role: user): Chỉ hiện nút Quét mã QR để thanh toán
                                <button
                                    onClick={handleOpenPayment} 
                                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs transition-colors shadow-sm cursor-pointer"
                                >
                                    💳 Quét mã QR thanh toán
                                </button>
                            ) : (
                                // Đối với NHÂN VIÊN/ADMIN: Hiện cả 2 nút In Bill tạm tính và Quét mã QR
                                <div className="grid grid-cols-2 gap-3">
                                    <button 
                                        onClick={() => {
                                            if (cart.length === 0) return alert("Giỏ hàng đang trống!");
                                            setShowDraftBill(true);
                                        }}
                                        className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                                    >
                                        📋 In Bill tạm tính
                                    </button>

                                    <button
                                        onClick={handleOpenPayment} 
                                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm cursor-pointer"
                                    >
                                        💳 Quét mã QR
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* 💳 MODAL THANH TOÁN CHUYỂN KHOẢN (VIETQR THẬT) */}
            {showPayModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-emerald-600 p-5 text-center relative">
                            <h3 className="text-white font-black text-lg uppercase tracking-wider">Thanh Toán Chuyển Khoản</h3>
                            <p className="text-emerald-100 text-xs mt-1">Quét mã QR qua ứng dụng ngân hàng</p>
                            <button 
                                onClick={() => setShowPayModal(false)}
                                className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-1.5 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>

                        <div className="p-6 flex flex-col items-center">
                            <div className="p-2 border-4 border-emerald-50 rounded-2xl shadow-sm mb-4 bg-white">
                                <img 
                                    src={qrUrl} 
                                    alt="VietQR Code" 
                                    className="w-56 h-56 object-contain rounded-xl"
                                />
                            </div>
                            
                            <div className="w-full bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Số tiền:</span>
                                    <span className="font-black text-emerald-600">{calculateTotal().toLocaleString()} VNĐ</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Nội dung CK:</span>
                                    <span className="font-bold text-gray-800">Thanh Toan Don {orderId ? orderId.slice(-6).toUpperCase() : 'Moi'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Chủ TK:</span>
                                    <span className="font-bold text-gray-800">{ACCOUNT_NAME}</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 border-t border-gray-100 bg-gray-50 flex flex-col space-y-3">
                            {/* 🔍 Nút kiểm tra thanh toán chủ động bằng tay */}
                            <button 
                                onClick={async () => {
                                    try {
                                        if (orderId) {
                                            const res = await API.get(`/orders/${orderId}`);
                                            if (res.data.success && res.data.data.payment_status === 'paid') {
                                                alert("Hệ thống: Xác nhận đơn hàng ĐÃ thanh toán thành công qua PayOS!");
                                                setCart([]);
                                                setShowPayModal(false);
                                                navigate('/tables');
                                            } else {
                                                alert("Hệ thống: Chưa nhận được giao dịch chuyển khoản cho đơn hàng này. Vui lòng quét mã và chuyển khoản đúng nội dung.");
                                            }
                                        }
                                    } catch (err) {
                                        alert("Không thể kiểm tra trạng thái đơn hàng.");
                                    }
                                }}
                                className="w-full py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-xs transition-colors border border-blue-200 cursor-pointer text-center"
                            >
                                🔄 Kiểm tra kết quả chuyển khoản
                            </button>

                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setShowPayModal(false)}
                                    className="flex-1 py-3 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-100 transition-colors cursor-pointer text-center text-xs"
                                >
                                    Quay lại
                                </button>
                                <button 
                                    onClick={async () => {
                                        // 💡 XÁC NHẬN THỦ CÔNG: Yêu cầu nhân viên xác nhận rõ ràng để chống ấn nhầm
                                        const confirmManual = window.confirm(
                                            "CẢNH BÁO XÁC NHẬN THỦ CÔNG:\nBạn đang chốt thanh toán tiền mặt/chuyển khoản ngoài hệ thống.\n\nHành động này sẽ BẰNG TAY hoàn thành đơn hàng mà KHÔNG cần xác thực từ PayOS. Bạn đã thực sự nhận được tiền của khách chưa?"
                                        );
                                        if (!confirmManual) return;

                                        try {
                                            if (orderId) {
                                                await API.post(`/orders/${orderId}/settle`);
                                            }
                                            alert("Nhân viên xác nhận thủ công: Đã nhận đủ tiền mặt / chuyển khoản!");
                                            setCart([]);
                                            setShowPayModal(false);
                                            navigate('/tables');
                                        } catch (err) {
                                            alert(err.response?.data?.message || "Lỗi xử lý chốt hóa đơn.");
                                        }
                                    }}
                                    className="flex-1 py-3 bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-700 shadow-md transition-colors cursor-pointer text-center text-xs"
                                >
                                    💵 Nhận tiền mặt
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 🧾 POPUP HIỂN THỊ HÓA ĐƠN TẠM TÍNH (DRAFT BILL RECEIPT) */}
            {showDraftBill && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white p-6 rounded-lg max-w-sm w-full shadow-2xl border font-mono text-gray-800 text-sm relative">
                        <div className="text-center space-y-1 mb-4 border-b border-dashed border-gray-300 pb-3">
                            <h3 className="font-black text-base text-gray-950">TIỆM BÁNH & NƯỚC Q1</h3>
                            <p className="text-xs text-gray-500">123 Nguyễn Huệ, Quận 1, TPHCM</p>
                            <p className="text-xs font-bold mt-2 uppercase">*** PHIẾU TẠM TÍNH ***</p>
                            <p className="text-[11px] text-gray-400">Ngày: {new Date().toLocaleDateString('vi-VN')} | Giờ: {new Date().toLocaleTimeString('vi-VN')}</p>
                            <p className="text-xs font-bold text-left pt-2 text-gray-700">Vị trí: {tableId ? `Bàn 0${tableId.slice(-1)}` : 'Mang đi'}</p>
                        </div>

                        <div className="flex justify-between font-bold border-b border-gray-200 pb-1 text-xs text-gray-500">
                            <span className="w-1/2">Tên món</span>
                            <span className="w-1/6 text-center">SL</span>
                            <span className="w-1/3 text-right">T.Tiền</span>
                        </div>

                        <div className="divide-y divide-dashed divide-gray-100 my-2 max-h-48 overflow-y-auto">
                            {cart.map((item, idx) => (
                                <div key={idx} className="flex justify-between py-2 text-xs">
                                    <div className="w-1/2 font-medium text-gray-950">
                                        {item.name} <span className="text-[10px] text-gray-400">({item.size})</span>
                                    </div>
                                    <div className="w-1/6 text-center font-bold">{item.quantity}</div>
                                    <div className="w-1/3 text-right font-semibold">{(item.price * item.quantity).toLocaleString()}đ</div>
                                </div>
                            ))}
                        </div>

                        <div className="border-t border-dashed border-gray-300 pt-3 space-y-1 text-xs">
                            <div className="flex justify-between text-gray-500">
                                <span>Cộng tiền món:</span>
                                <span>{calculateTotal().toLocaleString()}đ</span>
                            </div>
                            <div className="flex justify-between text-gray-500">
                                <span>Giảm giá (Coupon):</span>
                                <span>0đ</span>
                            </div>
                            <div className="flex justify-between font-black text-sm text-gray-950 pt-1 border-t border-gray-100">
                                <span>TỔNG CẦN THU:</span>
                                <span className="text-red-600">{calculateTotal().toLocaleString()}đ</span>
                            </div>
                        </div>

                        <div className="text-center text-[11px] text-gray-400 mt-6 border-t pt-3 border-gray-100">
                            <p>Giá chưa bao gồm thuế GTGT.</p>
                            <p className="font-medium text-gray-500 mt-0.5">Xin cảm ơn & Hẹn gặp lại quý khách!</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-6 pt-2 border-t border-gray-100">
                            <button 
                                onClick={() => setShowDraftBill(false)}
                                className="py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-colors"
                            >
                                Đóng cửa sổ
                            </button>
                            <button 
                                onClick={() => {
                                    window.print(); 
                                }}
                                className="py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center space-x-1 shadow-sm"
                            >
                                <span>🖨️ Ra lệnh In</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderMenu;
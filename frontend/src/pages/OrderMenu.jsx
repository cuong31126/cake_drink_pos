import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

import { BANK_BIN, ACCOUNT_NUMBER, ACCOUNT_NAME, BRANCHES, getBranchLabel } from '../config/constants';

const OrderMenu = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const userRole = user?.role || localStorage.getItem('userRole') || 'user';
    const orderType = searchParams.get('type') || 'dine-in';
    const tableId = searchParams.get('tableId');
    const orderId = searchParams.get('orderId');
    const defaultStoreId = user?.store_id || localStorage.getItem('storeId') || 'store_Q1';

    // State chi nhánh đang chọn (để Admin có thể chuyển chi nhánh khi đặt Mang đi)
    const [selectedStore, setSelectedStore] = useState(defaultStoreId);

    // States giao diện
    const [showPayModal, setShowPayModal] = useState(false);
    const [showDraftBill, setShowDraftBill] = useState(false);
    const [showCartDrawer, setShowCartDrawer] = useState(false); // 💡 MẶC ĐỊNH ẨN KHUNG GIỎ HÀNG THUỘC TÍNH (Chỉ hiện khi bấm đặt thực đơn)
    const [qrUrl, setQrUrl] = useState('');
    const [payosCheckoutUrl, setPayosCheckoutUrl] = useState(null);
    const [isOrderConfirmed, setIsOrderConfirmed] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    // States động từ database
    const [cart, setCart] = useState([]);
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [activeCategory, setActiveCategory] = useState('all');
    const [loading, setLoading] = useState(true);

    // 1. Tải thực đơn & hóa đơn
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                setLoading(true);
                const [prodRes, catRes] = await Promise.all([
                    API.get('/products'),
                    API.get('/categories')
                ]);

                if (prodRes.data.success) {
                    setProducts(prodRes.data.data.filter(p => p.status === 'selling'));
                }
                if (catRes.data.success) {
                    setCategories(catRes.data.data);
                }

                const isNewOrderRequested = searchParams.get('newOrder') === 'true';
                if (isNewOrderRequested) {
                    const newParams = new URLSearchParams(searchParams);
                    newParams.delete('newOrder');
                    newParams.delete('orderId');
                    setSearchParams(newParams, { replace: true });
                    setCart([]);
                    setIsOrderConfirmed(false);
                    setShowCartDrawer(true);
                    return;
                }

                if (orderId) {
                    try {
                        const orderRes = await API.get(`/orders/${orderId}`);
                        if (orderRes.data.success) {
                            const orderData = orderRes.data.data;

                            if (orderData.delivery_address) {
                                setDeliveryAddress(orderData.delivery_address);
                            }
                            if (orderData.customer_phone) {
                                setCustomerPhone(orderData.customer_phone);
                            }

                            // 💡 NẾU ĐƠN HÀNG ĐÃ HOÀN THÀNH HOẶC ĐÃ HỦY:
                            // Tự động xóa orderId khỏi URL để tạo phiên đơn mới cho khách hàng, tránh bị kẹt khóa đơn!
                            if (orderData.status === 'completed' || orderData.status === 'cancelled') {
                                const newParams = new URLSearchParams(searchParams);
                                newParams.delete('orderId');
                                setSearchParams(newParams, { replace: true });
                                setCart([]);
                                setIsOrderConfirmed(false);
                                setIsSubmitted(false);
                                return;
                            }

                            const isStaffOrAdmin = userRole === 'staff' || userRole === 'admin';
                            if (orderData.is_confirmed || orderData.status === 'serving' || orderData.status === 'ready') {
                                setIsOrderConfirmed(!isStaffOrAdmin);
                                setIsSubmitted(true);
                                // 💡 ĐƠN ĐÃ XÁC NHẬN/GỬI BẾP: Xóa sạch giỏ hàng nháp để về 0 món cho khách sẵn sàng chọn đơn mới!
                                setCart([]);
                            } else {
                                const mappedItems = orderData.items.map(item => ({
                                    product_id: item.product_id,
                                    name: item.name,
                                    base_price: item.price,
                                    price: item.price,
                                    quantity: item.quantity,
                                    size: item.selected_attributes?.size || 'M',
                                    sugar: item.selected_attributes?.sugar || '100%',
                                    ice: item.selected_attributes?.ice || '100%',
                                    selected_attributes: item.selected_attributes || { size: 'M', sugar: '100%', ice: '100%' }
                                }));
                                setCart(mappedItems);
                                setIsOrderConfirmed(false);
                                setIsSubmitted(false);
                            }

                            // Tự động mở Modal QR khi chuyển tiếp từ trang Đơn Hàng Của Tôi với showPayModal=true
                            if (searchParams.get('showPayModal') === 'true') {
                                const total = orderData.final_total || orderData.sub_total || 0;
                                const addInfo = encodeURIComponent(`Thanh Toan Don ${orderData._id.slice(-6).toUpperCase()}`);
                                const generatedQr = `https://img.vietqr.io/image/${BANK_BIN}-${ACCOUNT_NUMBER}-compact2.png?amount=${total}&addInfo=${addInfo}&accountName=${encodeURIComponent(ACCOUNT_NAME)}`;
                                setQrUrl(generatedQr);
                                setShowPayModal(true);
                            }
                        }
                    } catch (orderErr) {
                        if (orderErr.response?.status === 404) {
                            console.warn("⚠️ Mã đơn trong URL không còn tồn tại trên DB. Khởi tạo phiên đơn mới!");
                            const newParams = new URLSearchParams(searchParams);
                            newParams.delete('orderId');
                            setSearchParams(newParams, { replace: true });
                            setCart([]);
                            setIsOrderConfirmed(false);
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

    // Polling thanh toán PayOS (giới hạn tối đa 3 phút / 60 lần kiểm tra)
    useEffect(() => {
        let intervalId;
        let pollCount = 0;
        const MAX_POLLS = 60; // 60 * 3s = 3 phút

        if (showPayModal && orderId) {
            const checkPaymentStatus = async () => {
                pollCount += 1;
                if (pollCount > MAX_POLLS) {
                    clearInterval(intervalId);
                    return;
                }
                try {
                    const res = await API.get(`/orders/${orderId}`);
                    if (res.data.success && res.data.data.payment_status === 'paid') {
                        clearInterval(intervalId);
                        toast.success("✅ Xác nhận giao dịch chuyển khoản PayOS thành công!");
                        setCart([]);
                        setShowPayModal(false);
                        navigate('/tables');
                    }
                } catch (err) {
                    console.error("Lỗi kiểm tra thanh toán:", err);
                }
            };
            intervalId = setInterval(checkPaymentStatus, 3000);
        }
        return () => { if (intervalId) clearInterval(intervalId); };
    }, [showPayModal, orderId, navigate]);

    // Đồng bộ giỏ hàng lên server
    const syncCartToDatabase = async (newCart, isDecrease = false) => {
        if (!orderId) return;
        try {
            const body = {
                updated_items: newCart.map(item => ({
                    product_id: item.product_id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    selected_attributes: {
                        size: item.size || 'M',
                        sugar: item.sugar || '100%',
                        ice: item.ice || '100%'
                    }
                })),
                delivery_address: orderType === 'dine-in' ? '' : deliveryAddress,
                customer_phone: orderType === 'dine-in' ? '' : customerPhone,
                order_type: orderType,
                reason: isDecrease ? "Hủy/Giảm bớt món ăn" : "Cập nhật giỏ hàng",
                admin_approver_id: isDecrease ? (user?._id || user?.id || "u_admin_01") : undefined
            };
            await API.put(`/orders/${orderId}/edit-items`, body);
        } catch (err) {
            console.error("Lỗi đồng bộ giỏ hàng:", err);
        }
    };

    // 🥤 HELPER: Kiểm tra sản phẩm có phải đồ uống (cần chọn Size, Đường, Đá) hay Bánh (không có thuộc tính)
    const checkIsDrink = (item) => {
        const cat = (item.category || '').toLowerCase();
        const catId = (item.category_id || '').toLowerCase();
        const name = (item.name || '').toLowerCase();

        if (cat === 'drink' || catId === 'cat_coffee' || catId === 'cat_tea') return true;
        if (cat === 'cake' || ['cat_banhmi', 'cat_donut', 'cat_cake', 'cat_tiramisu'].includes(catId)) return false;
        if (name.includes('bánh') || name.includes('tiramisu') || name.includes('donut') || name.includes('mì')) return false;
        if (name.includes('trà') || name.includes('cafe') || name.includes('cà phê') || name.includes('latte') || name.includes('bạc xỉu') || name.includes('nước') || name.includes('sinh tố') || name.includes('sữa')) return true;
        return false;
    };

    // 💰 LOGIC TÍNH GIÁ ĐƠN VỊ CHUẨN: (Giá gốc + Phụ thu Size) * (1 - phần trăm giảm giá)
    const calcUnitPrice = (product, selectedSize = 'M') => {
        const targetId = product._id || product.product_id;
        const masterProduct = products.find(p => p._id === targetId) || product;

        const originPrice = Number(masterProduct.origin_price || masterProduct.price || product.base_origin_price || product.price || 0);
        let sizeExtra = 0;
        if (selectedSize === 'L') {
            sizeExtra = Number(masterProduct.attributes?.size_L_extra ?? masterProduct.attributes?.sizes?.find(s => s.size === 'L')?.extra_price ?? masterProduct.size_L_extra ?? 10000);
        } else if (selectedSize === 'XL') {
            sizeExtra = Number(masterProduct.attributes?.size_XL_extra ?? masterProduct.attributes?.sizes?.find(s => s.size === 'XL')?.extra_price ?? masterProduct.size_XL_extra ?? 15000);
        }

        const priceBeforeDiscount = originPrice + sizeExtra;

        if (masterProduct.is_on_sale) {
            let discountRatio = 1;
            if (masterProduct.discount_percent && masterProduct.discount_percent > 0) {
                discountRatio = 1 - (masterProduct.discount_percent / 100);
            } else if (masterProduct.origin_price > 0 && masterProduct.sale_price > 0) {
                discountRatio = masterProduct.sale_price / masterProduct.origin_price;
            }
            return Math.round(priceBeforeDiscount * discountRatio);
        }

        return priceBeforeDiscount;
    };

    // ➕ THÊM MÓN VÀO GIỎ HÀNG VÀ TỰ ĐỘNG BẬT KHUNG CHI TIẾT
    const handleAddProduct = async (product) => {
        // 💡 NẾU ĐƠN CŨ ĐÃ KHÓA: Hỏi khách hàng có muốn tạo đơn mới để chọn món tiếp không
        if (isOrderConfirmed) {
            const createNew = window.confirm(
                "Đơn hàng hiện tại đã được chốt và gửi xuống Bếp.\nBạn có muốn KHỞI TẠO MỘT ĐƠN HÀNG MỚI để chọn món tiếp không?"
            );
            if (createNew) {
                try {
                    const newOrderRes = await API.post('/orders/take-away', {
                        store_id: selectedStore,
                        order_type: orderType
                    });
                    if (newOrderRes.data.success) {
                        const newId = newOrderRes.data.data._id || newOrderRes.data.data.id;
                        setSearchParams({ type: orderType, orderId: newId }, { replace: true });
                        setCart([]);
                        setIsOrderConfirmed(false);
                        setShowCartDrawer(true);
                    }
                } catch (e) {
                    console.error("Lỗi tạo đơn mới:", e);
                }
            }
            return;
        }

        let updatedCart;
        const targetId = product._id || product.product_id;
        const existingIndex = cart.findIndex(item => item.product_id === targetId);

        if (existingIndex > -1) {
            updatedCart = [...cart];
            updatedCart[existingIndex].quantity += 1;
        } else {
            const initialUnitPrice = calcUnitPrice(product, 'M');

            updatedCart = [...cart, {
                product_id: targetId,
                name: product.name,
                base_origin_price: product.origin_price || product.price || 0,
                is_on_sale: product.is_on_sale || false,
                discount_percent: product.discount_percent || 0,
                sale_price: product.sale_price || 0,
                category: product.category,
                category_id: product.category_id,
                attributes: product.attributes || {},
                base_price: initialUnitPrice,
                price: initialUnitPrice,
                quantity: 1,
                size: 'M',
                sugar: '100%',
                ice: '100%',
                selected_attributes: checkIsDrink(product)
                    ? { size: 'M', sugar: '100%', ice: '100%' }
                    : {}
            }];
        }
        setCart(updatedCart);
        setIsOrderConfirmed(false);
        setIsSubmitted(false);
        setShowCartDrawer(true);
        syncCartToDatabase(updatedCart, false);
    };

    // 🥤 CẬP NHẬT THUỘC TÍNH ĐỒ UỐNG (SIZE, ĐƯỜNG, ĐÁ) TRỰC TIẾP TRONG GIỎ HÀNG
    const handleUpdateAttribute = (index, attrType, value) => {
        if (isOrderConfirmed || isSubmitted) {
            alert("⚠️ Đơn hàng đã được gửi vào Bếp và đang được chế biến!\n\nVui lòng liên hệ Nhân viên quầy để yêu cầu hủy đơn và đặt lại đơn mới từ đầu.");
            return;
        }
        const updatedCart = [...cart];
        const item = updatedCart[index];

        if (attrType === 'size') {
            item.size = value;
            item.price = calcUnitPrice(item, value);
        } else if (attrType === 'sugar') {
            item.sugar = value;
        } else if (attrType === 'ice') {
            item.ice = value;
        }

        item.selected_attributes = checkIsDrink(item) ? {
            size: item.size || 'M',
            sugar: item.sugar || '100%',
            ice: item.ice || '100%'
        } : {};

        setCart(updatedCart);
        setIsOrderConfirmed(false);
        setIsSubmitted(false);
        syncCartToDatabase(updatedCart, false);
    };

    // ➖ GIẢM SỐ LƯỢNG MÓN
    const handleDecreaseQuantity = async (index) => {
        if (isOrderConfirmed || isSubmitted) {
            alert("⚠️ Đơn hàng đã được gửi vào Bếp và đang được chế biến!\n\nVui lòng liên hệ Nhân viên quầy để yêu cầu hủy đơn và đặt lại đơn mới từ đầu.");
            return;
        }

        let updatedCart = [...cart];
        if (updatedCart[index].quantity > 1) {
            updatedCart[index].quantity -= 1;
        } else {
            updatedCart.splice(index, 1);
        }
        setCart(updatedCart);
        setIsOrderConfirmed(false);
        setIsSubmitted(false);
        syncCartToDatabase(updatedCart, true);
    };

    // Tính tổng số tiền
    const calculateTotal = () => {
        return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    };

    // 🚫 HÀM HỦY ĐƠN HÀNG TOÀN DIỆN (Chỉ cho phép Staff / Admin)
    const handleCancelOrder = async () => {
        if (userRole === 'user') {
            toast.error("Vui lòng liên hệ nhân viên quầy để hủy đơn!");
            return;
        }
        try {
            if (orderId) {
                await API.post(`/orders/${orderId}/cancel`);
            }
            setCart([]);
            setIsSubmitted(false);
            setIsOrderConfirmed(false);
            setSearchParams({ type: orderType }, { replace: true });
            toast.success("✅ Đã hủy đơn hàng thành công!");
            if (userRole === 'staff' || userRole === 'admin') {
                navigate('/tables');
            }
        } catch (err) {
            console.error("Lỗi hủy đơn:", err);
            toast.error(err.response?.data?.message || "Lỗi khi hủy đơn hàng.");
        }
    };

    // Bắt đầu quy trình thanh toán QR
    const handleOpenPaymentModal = async () => {
        if (cart.length === 0) {
            toast.error("Giỏ hàng đang trống! Vui lòng chọn ít nhất 1 món ăn.");
            return;
        }
        const total = calculateTotal();
        const addInfo = encodeURIComponent(`Thanh Toan Don ${orderId ? orderId.slice(-6).toUpperCase() : 'Moi'}`);
        const generatedQr = `https://img.vietqr.io/image/${BANK_BIN}-${ACCOUNT_NUMBER}-compact2.png?amount=${total}&addInfo=${addInfo}&accountName=${encodeURIComponent(ACCOUNT_NAME)}`;
        setQrUrl(generatedQr);
        setPayosCheckoutUrl(null);
        setShowPayModal(true);

        if (orderId) {
            try {
                const res = await API.post(`/orders/${orderId}/payos-link`);
                if (res.data.success) {
                    if (res.data.data?.qrCode) setQrUrl(res.data.data.qrCode);
                    if (res.data.data?.checkoutUrl) setPayosCheckoutUrl(res.data.data.checkoutUrl);
                }
            } catch (e) {
                console.warn("PayOS Link error:", e);
            }
        }
    };

    // Lọc danh sách món ăn
    const filteredProducts = activeCategory === 'all'
        ? products
        : products.filter(p => p.category_id === activeCategory || p.category === activeCategory);

    if (loading) {
        return (
            <div className="min-h-screen transition-colors duration-300 bg-gray-100 dark:bg-slate-950 text-gray-800 dark:text-slate-100 pt-20 flex items-center justify-center font-sans">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-md font-bold text-gray-700 dark:text-slate-200 animate-pulse border border-gray-200 dark:border-slate-800">
                    ⏳ Đang nạp thực đơn & đồng bộ hóa đơn...
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen transition-colors duration-300 bg-gray-100 dark:bg-slate-950 text-gray-800 dark:text-slate-100 pt-24 sm:pt-28 flex relative font-sans">
            {/* 🟢 DANH SÁCH MENU MÓN ĂN (MẶC ĐỊNH RỘNG 100% KHI CHƯA MỞ GIỎ HÀNG) */}
            <div className={`p-3 sm:p-6 transition-all duration-300 overflow-y-auto pb-32 ${showCartDrawer ? 'w-full md:w-2/3' : 'w-full max-w-7xl mx-auto'}`}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <button onClick={() => navigate(-1)} className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 shadow-2xs hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer">
                            ⬅️ Trở lại
                        </button>
                        <h2 className="text-base sm:text-xl font-black text-gray-800 dark:text-slate-100 uppercase tracking-wide">
                            Menu ({orderType === 'dine-in' ? `Bàn ${tableId || 'Chưa chọn'}` : 'Mang đi'})
                        </h2>
                        {/* 🏢 BỘ CHỌN CHI NHÁNH CỬA HÀNG FLEXIBLE CHO KHÁCH & ADMIN/STAFF */}
                        <div className="flex items-center space-x-1.5 bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800/60 rounded-xl px-2.5 py-1 text-xs shadow-2xs">
                            <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400">📍 Chi nhánh:</span>
                            <select
                                value={selectedStore}
                                onChange={(e) => setSelectedStore(e.target.value)}
                                className="bg-transparent text-gray-800 dark:text-slate-100 font-bold focus:outline-none cursor-pointer text-xs"
                            >
                                {BRANCHES.map(b => (
                                    <option key={b.id} value={b.id} className="dark:bg-slate-900">{b.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Nút bật nhanh Khung Giỏ Hàng khi bị ẩn */}
                    {!showCartDrawer && (
                        <button
                            onClick={() => setShowCartDrawer(true)}
                            className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2"
                        >
                            <span>🛒 Xem giỏ hàng & Thuộc tính ({cart.reduce((sum, i) => sum + i.quantity, 0)} món)</span>
                        </button>
                    )}
                </div>

                {/* 🏷️ TABS DANH MỤC ĐỘNG TỪ DATABASE */}
                <div className="flex space-x-2 overflow-x-auto pb-4 mb-6 border-b border-gray-200 dark:border-slate-800">
                    <button
                        onClick={() => setActiveCategory('all')}
                        className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${activeCategory === 'all'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'
                            }`}
                    >
                        Tất cả ({products.length})
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat._id}
                            onClick={() => setActiveCategory(cat._id)}
                            className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${activeCategory === cat._id
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'
                                }`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>

                {/* GRID SẢN PHẨM */}
                <div className={`grid gap-4 ${showCartDrawer ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'}`}>
                    {filteredProducts.map(product => {
                        const currentStoreId = selectedStore || user?.store_id || localStorage.getItem('storeId') || 'store_Q1';
                        const branchInventory = product.inventory?.find(i => i.store_id === currentStoreId);
                        const isBranchDisabled = branchInventory ? branchInventory.is_available === false : false;
                        const isStockEmpty = branchInventory ? (branchInventory.stock <= 0) : false;
                        const isOutOfStock = product.status === 'out_of_stock' || isBranchDisabled || isStockEmpty;

                        return (
                            <div key={product._id} className={`bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between hover:shadow-md transition-all space-y-2 ${isOutOfStock ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                                <div>
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-gray-800 dark:text-slate-200 text-sm line-clamp-1">{product.name}</h3>
                                        {product.is_on_sale ? (
                                            <div className="text-right">
                                                <span className="text-[10px] text-gray-400 dark:text-slate-500 line-through block">{product.price.toLocaleString()} đ</span>
                                                <span className="text-xs text-red-600 dark:text-red-400 font-black">
                                                    {(product.sale_price || product.price * (1 - product.discount_percent / 100)).toLocaleString()} đ
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-amber-600 dark:text-amber-400 font-black">{product.price.toLocaleString()} đ</span>
                                        )}
                                    </div>
                                    <div className="w-full h-36 bg-gray-100 dark:bg-slate-800 relative rounded-xl overflow-hidden my-2 border border-gray-100 dark:border-slate-800">
                                        {product.is_on_sale && (
                                            <span className="absolute top-2 left-2 bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-md z-10 animate-pulse">
                                                🏷️ SALE {product.discount_percent}%
                                            </span>
                                        )}
                                        {isOutOfStock && (
                                            <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center z-20 text-center px-2">
                                                <span className="bg-red-600 text-white font-black px-2.5 py-1 rounded-lg text-xs tracking-wide shadow-lg">
                                                    {isBranchDisabled ? '🚫 NGỪNG BÁN TẠI CN' : 'HẾT HÀNG TRONG KHO'}
                                                </span>
                                            </div>
                                        )}
                                        <img
                                            src={product.image_url || product.image || "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500"}
                                            alt={product.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={() => !isOutOfStock && handleAddProduct(product)}
                                    disabled={isOutOfStock}
                                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow-2xs ${isOutOfStock ? 'bg-gray-300 dark:bg-slate-800 text-gray-500 dark:text-slate-500 cursor-not-allowed' : 'cursor-pointer active:scale-95 bg-blue-600 hover:bg-blue-700 text-white'}`}
                                >
                                    {isOutOfStock ? (isBranchDisabled ? '🚫 Ngừng bán tại CN này' : '🚫 Hết hàng tại chi nhánh') : '+ Chọn món & Chỉnh thuộc tính'}
                                </button>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* 🔴 KHUNG CHI TIẾT ĐƠN HÀNG & CHỈNH SỬA THUỘC TÍNH (TỰ ĐỘNG ẨN KHI MỞ MODAL THANH TOÁN QR) */}
            {showCartDrawer && !showPayModal && (
                <div className="w-full sm:w-96 bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-slate-800 p-5 flex flex-col justify-between fixed right-0 top-24 bottom-0 shadow-2xl z-40 animate-in slide-in-from-right duration-200 text-slate-800 dark:text-slate-100 overflow-y-auto">
                    <div className="flex flex-col min-h-full justify-between space-y-4">
                        <div className="flex justify-between items-center border-b border-gray-200 dark:border-slate-800 pb-3 mb-3">
                            <h2 className="text-base font-black text-gray-800 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
                                <span>🛒 Chi Tiết Đơn Hàng</span>
                            </h2>
                            <button
                                onClick={() => setShowCartDrawer(false)}
                                className="text-xs bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                            >
                                ✕ Đóng khung
                            </button>
                        </div>

                        {/* 🛵 LỰA CHỌN HÌNH THỨC ĐẶT HÀNG & ĐỊA CHỈ GIAO HÀNG */}
                        <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2 mb-3">
                            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Hình thức nhận món:</div>
                            <div className="grid grid-cols-2 gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchParams(prev => {
                                            const next = new URLSearchParams(prev);
                                            next.set('type', 'dine-in');
                                            return next;
                                        }, { replace: true });
                                    }}
                                    className={`py-2 px-2.5 rounded-xl font-bold text-[11px] transition-all cursor-pointer flex items-center justify-center space-x-1 ${orderType === 'dine-in'
                                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                                        : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100'
                                        }`}
                                >
                                    <span>🍽️</span>
                                    <span>Ăn tại quán</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchParams(prev => {
                                            const next = new URLSearchParams(prev);
                                            next.set('type', 'take-away');
                                            return next;
                                        }, { replace: true });
                                    }}
                                    className={`py-2 px-2.5 rounded-xl font-bold text-[11px] transition-all cursor-pointer flex items-center justify-center space-x-1 ${orderType === 'take-away' || orderType === 'delivery'
                                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                                        : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100'
                                        }`}
                                >
                                    <span>🛵</span>
                                    <span>Giao tận nơi</span>
                                </button>
                            </div>

                            {/* 🏠 ĐỊA CHỈ NHÀ & SỐ ĐIỆN THOẠI (CHỈ HIỂN THỊ KHI CHỌN GIAO TẬN NƠI / MANG VỀ, TỰ ĐỘNG ẨN KHI ĂN TẠI QUÁN) */}
                            {orderType !== 'dine-in' && (
                                <div className="pt-2 space-y-2 animate-in fade-in duration-150">
                                    <div>
                                        <label className="block text-[11px] font-bold text-amber-800 dark:text-amber-300 mb-1">
                                            📞 Số điện thoại người nhận:
                                        </label>
                                        <input
                                            type="tel"
                                            placeholder="Nhập số điện thoại (VD: 0969...)"
                                            value={customerPhone}
                                            onChange={(e) => setCustomerPhone(e.target.value)}
                                            onBlur={() => syncCartToDatabase(cart, false)}
                                            className="w-full bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-amber-800 dark:text-amber-300 mb-1">
                                            🏠 Địa chỉ nhà (Giao hàng tận nơi):
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Nhập số nhà, tên đường, phường/xã..."
                                            value={deliveryAddress}
                                            onChange={(e) => setDeliveryAddress(e.target.value)}
                                            onBlur={() => syncCartToDatabase(cart, false)}
                                            className="w-full bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {cart.length === 0 ? (
                            <div className="text-center text-gray-400 dark:text-slate-500 mt-16 text-xs font-bold uppercase tracking-wider space-y-2">
                                <span className="text-3xl block">🍰</span>
                                <p>Giỏ hàng đang trống</p>
                                <p className="text-[10px] text-gray-400 dark:text-slate-500 font-normal">Hãy chọn món để tùy chỉnh Size, Đường, Đá nhé!</p>
                            </div>
                        ) : (
                            <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                                {cart.map((item, index) => (
                                    <div key={index} className="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/60 text-xs space-y-2 shadow-2xs">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">{item.name}</div>
                                                <div className="text-xs font-black text-blue-600 dark:text-blue-400">{(item.price * item.quantity).toLocaleString()} đ</div>
                                            </div>

                                            {/* Tăng giảm số lượng */}
                                            <div className="flex items-center space-x-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-1">
                                                <button
                                                    onClick={() => handleDecreaseQuantity(index)}
                                                    disabled={isOrderConfirmed}
                                                    className="w-6 h-6 rounded bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800/50 font-bold text-xs flex items-center justify-center cursor-pointer"
                                                >
                                                    -
                                                </button>
                                                <span className="font-bold text-xs w-4 text-center text-slate-800 dark:text-slate-100">{item.quantity}</span>
                                                <button
                                                    onClick={() => handleAddProduct({ product_id: item.product_id, name: item.name, price: item.base_price || item.price })}
                                                    disabled={isOrderConfirmed}
                                                    className="w-6 h-6 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/50 font-bold text-xs flex items-center justify-center cursor-pointer"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>

                                        {/* 🥤 KHU VỰC TÙY CHỈNH THUỘC TÍNH NƯỚC UỐNG (SIZE, ĐƯỜNG, ĐÁ) - CHỈ HIỂN THỊ NẾU LÀ ĐỒ UỐNG */}
                                        {checkIsDrink(item) && (
                                            <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 space-y-2 text-[11px]">
                                                {/* Tùy chọn Size */}
                                                <div className="flex items-center justify-between">
                                                    <span className="text-slate-500 dark:text-slate-400 font-bold">Kích cỡ (Size):</span>
                                                    <div className="flex gap-1">
                                                        {['M', 'L', 'XL'].map(sz => {
                                                            const targetId = item.product_id || item._id;
                                                            const masterProd = products.find(p => p._id === targetId) || item;
                                                            const extraL = Number(masterProd.attributes?.size_L_extra ?? masterProd.attributes?.sizes?.find(s => s.size === 'L')?.extra_price ?? masterProd.size_L_extra ?? 10000);
                                                            const extraXL = Number(masterProd.attributes?.size_XL_extra ?? masterProd.attributes?.sizes?.find(s => s.size === 'XL')?.extra_price ?? masterProd.size_XL_extra ?? 15000);

                                                            let extraTag = '';
                                                            if (sz === 'L' && extraL > 0) {
                                                                extraTag = `(+${extraL >= 1000 ? (extraL / 1000) + 'k' : extraL + 'đ'})`;
                                                            } else if (sz === 'XL' && extraXL > 0) {
                                                                extraTag = `(+${extraXL >= 1000 ? (extraXL / 1000) + 'k' : extraXL + 'đ'})`;
                                                            }

                                                            return (
                                                                <button
                                                                    key={sz}
                                                                    disabled={isOrderConfirmed}
                                                                    onClick={() => handleUpdateAttribute(index, 'size', sz)}
                                                                    className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${(item.size || 'M') === sz
                                                                        ? 'bg-purple-600 text-white shadow-2xs'
                                                                        : 'bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-500'
                                                                        }`}
                                                                >
                                                                    {sz} {extraTag}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* Tùy chọn Mức Đường */}
                                                <div className="flex items-center justify-between">
                                                    <span className="text-slate-500 dark:text-slate-400 font-bold">Mức đường:</span>
                                                    <select
                                                        disabled={isOrderConfirmed}
                                                        value={item.sugar || '100%'}
                                                        onChange={(e) => handleUpdateAttribute(index, 'sugar', e.target.value)}
                                                        className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-[10px] font-bold rounded px-2 py-1 focus:outline-none"
                                                    >
                                                        <option value="100%">100% đường (Mặc định)</option>
                                                        <option value="70%">70% đường</option>
                                                        <option value="50%">50% đường</option>
                                                        <option value="30%">30% đường</option>
                                                        <option value="0%">0% đường (Không đường)</option>
                                                    </select>
                                                </div>

                                                {/* Tùy chọn Lượng Đá */}
                                                <div className="flex items-center justify-between">
                                                    <span className="text-slate-500 dark:text-slate-400 font-bold">Lượng đá:</span>
                                                    <select
                                                        disabled={isOrderConfirmed}
                                                        value={item.ice || '100%'}
                                                        onChange={(e) => handleUpdateAttribute(index, 'ice', e.target.value)}
                                                        className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-[10px] font-bold rounded px-2 py-1 focus:outline-none"
                                                    >
                                                        <option value="100%">100% đá (Mặc định)</option>
                                                        <option value="70%">70% đá</option>
                                                        <option value="50%">50% đá</option>
                                                        <option value="Ít đá">Ít đá</option>
                                                        <option value="Không đá">Không đá</option>
                                                    </select>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Tổng thanh toán & Nút Xác nhận đơn */}
                        <div className="border-t border-gray-200 dark:border-slate-800 pt-3 bg-white dark:bg-slate-900 mt-2 space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500 dark:text-slate-400 font-bold uppercase text-xs">TỔNG THANH TOÁN:</span>
                                <span className="text-lg font-black text-red-600 dark:text-red-400">{calculateTotal().toLocaleString()} đ</span>
                            </div>

                            <button
                                disabled={cart.length === 0}
                                onClick={async () => {
                                    if (cart.length === 0) {
                                        toast.error("Vui lòng chọn ít nhất 1 món ăn!");
                                        return;
                                    }
                                    try {
                                        let currentId = orderId;
                                        // 💡 Nếu chưa có orderId -> Tự động khởi tạo đơn mới
                                        if (!currentId) {
                                            const createRes = await API.post('/orders/take-away', {
                                                store_id: selectedStore,
                                                order_type: orderType,
                                                delivery_address: orderType === 'dine-in' ? '' : deliveryAddress,
                                                customer_phone: orderType === 'dine-in' ? '' : customerPhone,
                                                items: cart.map(i => ({ product_id: i.product_id, name: i.name, price: i.price, quantity: i.quantity, selected_attributes: i.selected_attributes }))
                                            });
                                            if (createRes.data.success) {
                                                currentId = createRes.data.data._id || createRes.data.data.id;
                                            }
                                        }

                                        try {
                                            await API.post(`/orders/${currentId}/confirm`, { is_confirmed: true, phone: customerPhone });
                                        } catch (confirmErr) {
                                            // NẾU LỖI 404: Tự động tạo lại đơn mới và xác nhận
                                            if (confirmErr.response?.status === 404) {
                                                const freshRes = await API.post('/orders/take-away', {
                                                    store_id: selectedStore,
                                                    order_type: orderType,
                                                    delivery_address: orderType === 'dine-in' ? '' : deliveryAddress,
                                                    customer_phone: orderType === 'dine-in' ? '' : customerPhone,
                                                    items: cart.map(i => ({ product_id: i.product_id, name: i.name, price: i.price, quantity: i.quantity, selected_attributes: i.selected_attributes }))
                                                });
                                                if (freshRes.data.success) {
                                                    currentId = freshRes.data.data._id || freshRes.data.data.id;
                                                    await API.post(`/orders/${currentId}/confirm`, { is_confirmed: true, phone: customerPhone });
                                                }
                                            } else {
                                                throw confirmErr;
                                            }
                                        }

                                        // 💡 Đơn đặt thành công -> Đưa giỏ hàng & toàn bộ form về trạng thái ban đầu hoàn toàn rỗng
                                        setCart([]);
                                        setDeliveryAddress('');
                                        setCustomerPhone('');
                                        setIsSubmitted(false);
                                        setIsOrderConfirmed(false);
                                        setShowCartDrawer(false);

                                        const newParams = new URLSearchParams(searchParams);
                                        newParams.delete('orderId');
                                        newParams.delete('showPayModal');
                                        newParams.delete('showDrawer');
                                        setSearchParams(newParams, { replace: true });

                                        localStorage.removeItem('cart');
                                        sessionStorage.removeItem('cart');
                                        localStorage.removeItem('active_cart');

                                        toast.success("✅ Đặt hàng thành công! Đơn của bạn đã được gửi đến Quán và chờ xác nhận .", { duration: 4000 });
                                        navigate('/my-orders');
                                    } catch (err) {
                                        toast.error(err.response?.data?.message || "Lỗi khi chốt đơn hàng.");
                                    }
                                }}
                                className={`w-full py-3 font-black rounded-xl text-xs shadow-md transition-all cursor-pointer border ${cart.length > 0
                                        ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-400'
                                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-300 dark:border-slate-700 cursor-not-allowed'
                                    }`}
                            >
                                ✅ XÁC NHẬN ĐƠN HÀNG
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 💳 MODAL THANH TOÁN QR PAYOS */}
            {showPayModal && (
                <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-[70] p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden border border-gray-200 dark:border-slate-700 animate-in zoom-in-95 duration-150">
                        <div className="bg-emerald-600 p-5 text-white relative">
                            <h3 className="font-black text-base uppercase tracking-wide">Thanh Toán Đơn Hàng</h3>
                            <p className="text-emerald-100 text-xs mt-1">Quét mã QR qua ứng dụng ngân hàng</p>
                            <button
                                onClick={() => setShowPayModal(false)}
                                className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-1.5 transition-colors cursor-pointer"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>

                        <div className="p-6 flex flex-col items-center">
                            <div className="p-2 border-4 border-emerald-50 dark:border-emerald-900/50 rounded-2xl shadow-sm mb-4 bg-white">
                                <img
                                    src={qrUrl}
                                    alt="VietQR Code"
                                    className="w-56 h-56 object-contain rounded-xl"
                                />
                            </div>

                            {payosCheckoutUrl && (
                                <a
                                    href={payosCheckoutUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full mb-3 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer flex items-center justify-center space-x-1"
                                >
                                    <span>🔗 Mở Cổng Thanh Toán PayOS Chính Thức</span>
                                </a>
                            )}

                            <div className="w-full bg-gray-50 dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700 space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-slate-400">Số tiền:</span>
                                    <span className="font-black text-emerald-600 dark:text-emerald-400">{calculateTotal().toLocaleString()} VNĐ</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-slate-400">Nội dung CK:</span>
                                    <span className="font-bold text-gray-800 dark:text-slate-100">Thanh Toan Don {orderId ? orderId.slice(-6).toUpperCase() : 'Moi'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-slate-400">Chủ TK:</span>
                                    <span className="font-bold text-gray-800 dark:text-slate-100">{ACCOUNT_NAME}</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/60">
                            <button
                                onClick={() => setShowPayModal(false)}
                                className="w-full py-3 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-200 font-bold rounded-xl hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors cursor-pointer text-center text-xs"
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

export default OrderMenu;
const express = require('express');
const router = express.Router();

// Middlewares kiểm soát an ninh
const { protect, authorize } = require('../middlewares/authMiddleware');

// Controllers
const {
  register,
  login,
  googleAuth,
  refreshToken,
  getUserProfile,
  logout,
  getAllUsers,
  updateUserRole,
  verifyPin
} = require('../controllers/authController');

const {
  getInventorySummary,
  createInventoryLog
} = require('../controllers/inventoryController');

const {
  getStores,
  createStore,
  updateStore
} = require('../controllers/storeController');

const {
  getTablesByStore,
  updateTableStatus,
  createTable
} = require('../controllers/tableController');

const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductStock,
  toggleProductStatus,
  getCategories,
  createCategory
} = require('../controllers/productController');

const {
  createDineInOrder,
  createTakeAwayOrder,
  addItemsToOrder,
  editOrderItemsWithLog,
  getOrders,
  getOrderById,
  updateOrderItemStatus,
  settleOrder,
  cancelOrder,
  printDraftBill,
  acceptOrder,
  readyOrder,
  confirmOrder,
  deleteOrder,
  createPayOSPaymentLink,
  updateOrderNoteAndFlag
} = require('../controllers/orderController');

const {
  openShift,
  closeShift,
  handoverShift,
  getCurrentShift,
  getShiftHistory,
  syncCash
} = require('../controllers/shiftController');

const {
  applyCouponToOrder,
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon
} = require('../controllers/couponController');

const {
  createChatRoom,
  getChatRooms,
  getRoomMessages,
  sendRoomMessage
} = require('../controllers/chatController');

const {
  getRevenueStats,
  getTopSelling,
  getSlowMoving,
  getLowStock
} = require('../controllers/dashboardController');

const { handleAIChatAssistant } = require('../controllers/aiController');
const {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  createNotification
} = require('../controllers/notificationController');


// ==========================================
// 🔐 NHÁNH API AUTH & USERS
// ==========================================
router.post('/auth/register', register);
router.post('/auth/login', login);
router.post('/auth/google', googleAuth);
router.post('/auth/refresh-token', refreshToken);
router.post('/auth/logout', protect, logout);
router.post('/auth/verify-pin', protect, verifyPin);
router.get('/users/profile', protect, getUserProfile); 
router.get('/users', protect, authorize('admin'), getAllUsers);
router.patch('/users/:id/role', protect, authorize('admin'), updateUserRole);

// ==========================================
// 🏪 NHÁNH API STORES
// ==========================================
router.get('/stores', protect, getStores);
router.post('/stores', protect, authorize('admin'), createStore);
router.put('/stores/:id', protect, authorize('admin'), updateStore);

// ==========================================
// 🪑 NHÁNH API TABLES
// ==========================================
router.get('/stores/:store_id/tables', protect, authorize('admin', 'staff'), getTablesByStore);
router.post('/tables', protect, authorize('admin'), createTable);
router.patch('/tables/:id/status', protect, authorize('admin'), updateTableStatus);

// ==========================================
// 📦 NHÁNH API PRODUCTS & CATEGORIES
// ==========================================
router.get('/products', protect, getProducts);
router.get('/products/:id', protect, getProductById);
router.post('/products', protect, authorize('admin'), createProduct);
router.put('/products/:id', protect, authorize('admin'), updateProduct);
router.delete('/products/:id', protect, authorize('admin'), deleteProduct);
router.patch('/products/:id/stock', protect, authorize('admin', 'staff'), updateProductStock);
router.patch('/products/:id/toggle-status', protect, authorize('admin', 'staff'), toggleProductStatus);

router.get('/categories', protect, getCategories);
router.post('/categories', protect, authorize('admin'), createCategory);

// ==========================================
// 📋 NHÁNH API INVENTORY LOGS & REPORTING
// ==========================================
router.get('/inventory/summary', protect, authorize('admin', 'staff'), getInventorySummary);
router.post('/inventory/log', protect, authorize('admin', 'staff'), createInventoryLog);

// ==========================================
// 🛒 NHÁNH API ORDERS
// ==========================================
router.get('/orders', protect, authorize('admin', 'staff', 'user'), getOrders);
router.post('/orders/dine-in', protect, authorize('admin', 'staff'), createDineInOrder);
router.post('/orders/take-away', protect, authorize('admin', 'staff', 'user'), createTakeAwayOrder);
router.get('/orders/:id', protect, getOrderById);
router.patch('/orders/:id/add-items', protect, authorize('admin', 'staff', 'user'), addItemsToOrder);
router.put('/orders/:id/edit-items', protect, editOrderItemsWithLog);
router.patch('/orders/:id/item-status', protect, authorize('admin', 'staff'), updateOrderItemStatus);
router.post('/orders/:id/apply-coupon', protect, authorize('admin', 'staff'), applyCouponToOrder);
router.post('/orders/:id/settle', protect, authorize('admin', 'staff', 'user'), settleOrder);
router.post('/orders/:id/cancel', protect, authorize('admin', 'staff', 'user'), cancelOrder);
router.get('/orders/:id/print-draft', protect, authorize('admin', 'staff'), printDraftBill);
router.post('/orders/:id/accept', protect, authorize('admin', 'staff'), acceptOrder);
router.post('/orders/:id/ready', protect, authorize('admin', 'staff'), readyOrder);
router.post('/orders/:id/confirm', protect, confirmOrder);
router.post('/orders/:id/payos-link', protect, createPayOSPaymentLink);
router.patch('/orders/:id/flag', protect, authorize('admin', 'staff'), updateOrderNoteAndFlag);
router.delete('/orders/:id', protect, authorize('admin'), deleteOrder);

// ==========================================
// 🏁 NHÁNH API SHIFTS
// ==========================================
router.post('/shifts/open', protect, authorize('admin', 'staff'), openShift);
router.post('/shifts/close', protect, authorize('admin', 'staff'), closeShift);
router.post('/shifts/handover', protect, authorize('admin', 'staff'), handoverShift);
router.get('/shifts/current', protect, authorize('admin', 'staff'), getCurrentShift);
router.get('/shifts/history', protect, authorize('admin', 'staff'), getShiftHistory);
router.get('/shifts/sync-cash', protect, authorize('admin', 'staff'), syncCash);

// ==========================================
// 🏷️ NHÁNH API COUPONS
// ==========================================
router.get('/coupons', protect, getCoupons);
router.post('/coupons', protect, authorize('admin'), createCoupon);
router.put('/coupons/:id', protect, authorize('admin'), updateCoupon);
router.delete('/coupons/:id', protect, authorize('admin'), deleteCoupon);

// ==========================================
// 💬 NHÁNH API LIVE CHAT
// ==========================================
router.post('/chats/rooms', protect, createChatRoom);
router.get('/chats/rooms', protect, getChatRooms);
router.get('/chats/rooms/:id/messages', protect, getRoomMessages);
router.post('/chats/rooms/:id/messages', protect, sendRoomMessage);

// ==========================================
// 📊 NHÁNH API DASHBOARD
// ==========================================
router.get('/dashboard/revenue-stats', protect, authorize('admin'), getRevenueStats);
router.get('/dashboard/top-selling', protect, authorize('admin'), getTopSelling);
router.get('/dashboard/slow-moving', protect, authorize('admin'), getSlowMoving);
router.get('/dashboard/low-stock', protect, authorize('admin'), getLowStock);

// ==========================================
// 🤖 NHÁNH API AI CHAT
// ==========================================
router.post('/ai/chat-assistant', protect, handleAIChatAssistant);

// ==========================================
// 🔔 NHÁNH API NOTIFICATIONS
// ==========================================
router.get('/notifications', protect, getMyNotifications);
router.post('/notifications', protect, authorize('admin'), createNotification);
router.patch('/notifications/:id/read', protect, markAsRead);
router.patch('/notifications/read-all', protect, markAllAsRead);

module.exports = router;
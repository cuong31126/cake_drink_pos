const Order = require('../models/Order');
const Product = require('../models/Product');

/**
 * @desc    Admin xem thống kê doanh thu ngày & chi tiết phân loại theo Cửa hàng / Chi nhánh
 * @route   GET /api/v1/dashboard/revenue-stats
 * @access  Private (Admin)
 */
const getRevenueStats = async (req, res, next) => {
  try {
    const { store_id = 'all' } = req.query;

    const allCompletedOrders = await Order.find({ status: 'completed' });

    // Phân tích chi tiết từng cửa hàng (Store Q1 vs Store ThuDuc)
    const storeQ1Orders = allCompletedOrders.filter(o => o.store_id === 'store_Q1' || !o.store_id);
    const storeThuDucOrders = allCompletedOrders.filter(o => o.store_id === 'store_ThuDuc');

    const revQ1 = storeQ1Orders.reduce((sum, o) => sum + (o.final_total || 0), 0);
    const revThuDuc = storeThuDucOrders.reduce((sum, o) => sum + (o.final_total || 0), 0);
    const grandTotalRevenue = revQ1 + revThuDuc;

    // Doanh thu theo bộ lọc cửa hàng đang chọn
    const selectedOrders = allCompletedOrders.filter(o => {
      if (store_id === 'all') return true;
      if (store_id === 'store_Q1') return o.store_id === 'store_Q1' || !o.store_id;
      return o.store_id === store_id;
    });

    const totalRevenue = selectedOrders.reduce((sum, o) => sum + (o.final_total || 0), 0);
    const totalOrders = selectedOrders.length;
    const averageBill = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    // Phân tích hình thức thanh toán (Tiền mặt vs Chuyển khoản QR PayOS)
    const cashRevenue = selectedOrders.filter(o => o.payment_method === 'cash' || !o.payment_method).reduce((sum, o) => sum + (o.final_total || 0), 0);
    const bankingRevenue = selectedOrders.filter(o => o.payment_method === 'payos' || o.payment_method === 'bank' || o.payment_method === 'momo').reduce((sum, o) => sum + (o.final_total || 0), 0);

    // Phân tích loại đơn (Ăn tại quán vs Mang đi)
    const dineInCount = selectedOrders.filter(o => o.order_type === 'dine-in').length;
    const takeAwayCount = selectedOrders.filter(o => o.order_type === 'take-away' || o.order_type === 'delivery').length;

    res.status(200).json({
      success: true,
      data: {
        totalRevenue,
        totalOrders,
        averageBill,
        cashRevenue,
        bankingRevenue,
        dineInCount,
        takeAwayCount,
        storeBreakdown: {
          store_Q1: {
            name: 'Chi nhánh 1 (Quận 1)',
            revenue: revQ1,
            orders: storeQ1Orders.length,
            percentage: grandTotalRevenue > 0 ? Math.round((revQ1 / grandTotalRevenue) * 100) : 0
          },
          store_ThuDuc: {
            name: 'Chi nhánh 2 (Thủ Đức)',
            revenue: revThuDuc,
            orders: storeThuDucOrders.length,
            percentage: grandTotalRevenue > 0 ? Math.round((revThuDuc / grandTotalRevenue) * 100) : 0
          }
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Thống kê top món bán chạy nhất theo chi nhánh
 * @route   GET /api/v1/dashboard/top-selling
 * @access  Private (Admin)
 */
const getTopSelling = async (req, res, next) => {
  try {
    const { store_id = 'all' } = req.query;
    const matchStage = { status: 'completed' };
    if (store_id !== 'all') {
      if (store_id === 'store_Q1') {
        matchStage.$or = [{ store_id: 'store_Q1' }, { store_id: { $exists: false } }, { store_id: null }];
      } else {
        matchStage.store_id = store_id;
      }
    }

    const stats = await Order.aggregate([
      { $match: matchStage },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product_id',
          name: { $first: '$items.name' },
          totalQuantity: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 5 }
    ]);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Thống kê món bán chậm theo chi nhánh
 * @route   GET /api/v1/dashboard/slow-moving
 * @access  Private (Admin)
 */
const getSlowMoving = async (req, res, next) => {
  try {
    const { store_id = 'all' } = req.query;
    const matchStage = { status: 'completed' };
    if (store_id !== 'all') {
      if (store_id === 'store_Q1') {
        matchStage.$or = [{ store_id: 'store_Q1' }, { store_id: { $exists: false } }, { store_id: null }];
      } else {
        matchStage.store_id = store_id;
      }
    }

    const stats = await Order.aggregate([
      { $match: matchStage },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product_id',
          name: { $first: '$items.name' },
          totalQuantity: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      },
      { $sort: { totalQuantity: 1 } },
      { $limit: 5 }
    ]);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cảnh báo tồn kho thấp (dưới mức 5) phân theo chi nhánh
 * @route   GET /api/v1/dashboard/low-stock
 * @access  Private (Admin)
 */
const getLowStock = async (req, res, next) => {
  try {
    const { store_id = 'all' } = req.query;

    const products = await Product.find({
      'inventory.stock': { $lte: 5 }
    });

    const data = [];
    products.forEach(p => {
      if (p.inventory && p.inventory.length > 0) {
        p.inventory.forEach(inv => {
          if (inv.stock <= 5 && (store_id === 'all' || inv.store_id === store_id)) {
            data.push({
              _id: p._id,
              name: p.name,
              store_id: inv.store_id,
              current_stock: inv.stock
            });
          }
        });
      }
    });

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRevenueStats,
  getTopSelling,
  getSlowMoving,
  getLowStock
};

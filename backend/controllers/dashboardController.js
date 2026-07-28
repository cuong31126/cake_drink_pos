const Order = require('../models/Order');
const Product = require('../models/Product');

/**
 * @desc    Admin xem thống kê doanh thu ngày
 * @route   GET /api/v1/dashboard/revenue-stats
 * @access  Private (Admin)
 */
const getRevenueStats = async (req, res, next) => {
  try {
    const completedOrders = await Order.find({ status: 'completed' });
    const totalRevenue = completedOrders.reduce((sum, o) => sum + o.final_total, 0);
    const totalOrders = completedOrders.length;
    const averageBill = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    res.status(200).json({
      success: true,
      data: {
        totalRevenue,
        totalOrders,
        averageBill
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Thống kê top món bán chạy nhất
 * @route   GET /api/v1/dashboard/top-selling
 * @access  Private (Admin)
 */
const getTopSelling = async (req, res, next) => {
  try {
    const stats = await Order.aggregate([
      { $match: { status: 'completed' } },
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
 * @desc    Thống kê món bán chậm
 * @route   GET /api/v1/dashboard/slow-moving
 * @access  Private (Admin)
 */
const getSlowMoving = async (req, res, next) => {
  try {
    const stats = await Order.aggregate([
      { $match: { status: 'completed' } },
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
 * @desc    Cảnh báo tồn kho thấp (dưới mức 5)
 * @route   GET /api/v1/dashboard/low-stock
 * @access  Private (Admin)
 */
const getLowStock = async (req, res, next) => {
  try {
    const products = await Product.find({
      'inventory.stock': { $lte: 5 }
    });

    const data = [];
    products.forEach(p => {
      if (p.inventory && p.inventory.length > 0) {
        p.inventory.forEach(inv => {
          if (inv.stock <= 5) {
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

const InventoryLog = require('../models/InventoryLog');
const Product = require('../models/Product');

/**
 * @desc    Lấy báo cáo tổng quan tồn kho theo Ngày / Tuần / Tháng
 * @route   GET /api/v1/inventory/summary
 * @access  Private (Admin/Staff)
 */
const getInventorySummary = async (req, res, next) => {
  try {
    const { period = 'day', store_id = 'all' } = req.query;

    const now = new Date();
    let startDate = new Date();

    if (period === 'week') {
      const day = startDate.getDay();
      const diff = startDate.getDate() - day + (day === 0 ? -6 : 1); // Thứ hai đầu tuần
      startDate.setDate(diff);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      // 'day'
      startDate.setHours(0, 0, 0, 0);
    }

    // Query sản phẩm
    const products = await Product.find({ status: 'selling' });

    let totalStock = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    const productStockDetails = [];

    products.forEach(p => {
      let itemStock = 0;
      let isAvail = true;

      if (store_id === 'all') {
        itemStock = (p.inventory || []).reduce((acc, inv) => acc + (inv.stock || 0), 0);
        isAvail = (p.inventory || []).some(inv => inv.is_available !== false);
      } else {
        const inv = (p.inventory || []).find(i => i.store_id === store_id);
        itemStock = inv ? (inv.stock || 0) : 0;
        isAvail = inv ? inv.is_available !== false : true;
      }

      totalStock += itemStock;

      if (!isAvail || itemStock === 0) {
        outOfStockCount++;
      } else if (itemStock < 10) {
        lowStockCount++;
      }

      productStockDetails.push({
        _id: p._id,
        name: p.name,
        category: p.category,
        image_url: p.image_url,
        stock: itemStock,
        is_available: isAvail
      });
    });

    // Fetch logs trong khoảng thời gian
    const logQuery = { createdAt: { $gte: startDate } };
    if (store_id !== 'all') {
      logQuery.store_id = store_id;
    }

    const logs = await InventoryLog.find(logQuery).sort({ createdAt: -1 }).limit(50);

    res.status(200).json({
      success: true,
      data: {
        period,
        store_id,
        stats: {
          totalProducts: products.length,
          totalStock,
          lowStockCount,
          outOfStockCount
        },
        productStockDetails,
        logs
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Ghi nhận nhật ký tồn kho / Chốt kho đầu ngày / cuối ngày
 * @route   POST /api/v1/inventory/log
 * @access  Private (Admin/Staff)
 */
const createInventoryLog = async (req, res, next) => {
  try {
    const { store_id, product_id, product_name, type, previous_stock = 0, new_stock, note } = req.body;

    if (!store_id || new_stock === undefined) {
      res.status(400);
      throw new Error('Vui lòng cung cấp đầy đủ chi nhánh và số lượng tồn kho mới.');
    }

    let prodName = product_name || '';

    // Cập nhật số lượng trong Product model nếu có product_id
    if (product_id) {
      const product = await Product.findById(product_id);
      if (product) {
        prodName = product.name;
        const idx = product.inventory.findIndex(i => i.store_id === store_id);
        if (idx > -1) {
          product.inventory[idx].stock = Number(new_stock);
        } else {
          product.inventory.push({ store_id, stock: Number(new_stock), is_available: true });
        }
        await product.save();
      }
    }

    const change_amount = Number(new_stock) - Number(previous_stock);

    const log = await InventoryLog.create({
      store_id,
      product_id: product_id || 'all_products',
      product_name: prodName || (type === 'start_of_day' ? 'Chốt kho đầu ngày' : 'Chốt kho cuối ngày'),
      type: type || 'manual_adjustment',
      previous_stock: Number(previous_stock),
      new_stock: Number(new_stock),
      change_amount,
      note: note || '',
      performed_by: req.user?.name || req.user?.email || 'Nhân viên'
    });

    res.status(201).json({
      success: true,
      message: 'Đã lưu nhật ký tồn kho thành công!',
      data: log
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInventorySummary,
  createInventoryLog
};

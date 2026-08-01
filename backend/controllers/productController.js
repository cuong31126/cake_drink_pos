const Product = require('../models/Product');
const Category = require('../models/Category');
const { getCache, setCache, deleteCache } = require('../config/redis');

/**
 * @desc    Lấy danh sách tất cả sản phẩm bánh & nước đang bán (Tích hợp Redis Cache)
 * @route   GET /api/v1/products
 * @access  Private
 */
const getProducts = async (req, res, next) => {
  try {
    const cacheKey = 'products_all_menu';

    // ⚡ BƯỚC 1: Thử lấy dữ liệu từ Redis Cache
    const cachedProducts = await getCache(cacheKey);
    if (cachedProducts) {
      return res.status(200).json({
        success: true,
        source: 'redis_cache',
        count: cachedProducts.length,
        data: cachedProducts
      });
    }

    // 📦 BƯỚC 2: Nếu chưa có Cache -> Lấy từ MongoDB Atlas
    const products = await Product.find({ status: 'selling' }).sort({ name: 1 });

    // 💾 BƯỚC 3: Lưu dữ liệu vào Redis Cache trong 5 phút (300s)
    await setCache(cacheKey, products, 300);

    res.status(200).json({
      success: true,
      source: 'mongodb',
      count: products.length,
      data: products
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Xem chi tiết một sản phẩm
 * @route   GET /api/v1/products/:id
 * @access  Private
 */
const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404);
      throw new Error('Không tìm thấy sản phẩm yêu cầu.');
    }

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Tạo món mới
 * @route   POST /api/v1/products
 * @access  Private (Admin)
 */
const createProduct = async (req, res, next) => {
  try {
    const newProduct = await Product.create(req.body);
    
    // 🧹 Xóa cache thực đơn cũ khi thêm món mới
    await deleteCache('products_all_menu');

    res.status(201).json({
      success: true,
      data: newProduct
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cập nhật thông tin món
 * @route   PUT /api/v1/products/:id
 * @access  Private (Admin)
 */
const updateProduct = async (req, res, next) => {
  try {
    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) {
      res.status(404);
      throw new Error('Không tìm thấy sản phẩm để cập nhật.');
    }

    // 🧹 Xóa cache thực đơn cũ để đồng bộ giá mới
    await deleteCache('products_all_menu');

    res.status(200).json({
      success: true,
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Xóa món (Chuyển trạng thái ngừng bán)
 * @route   DELETE /api/v1/products/:id
 * @access  Private (Admin)
 */
const deleteProduct = async (req, res, next) => {
  try {
    const deleted = await Product.findByIdAndUpdate(req.params.id, { status: 'out_of_stock' }, { new: true });
    if (!deleted) {
      res.status(404);
      throw new Error('Không tìm thấy sản phẩm.');
    }

    // 🧹 Xóa cache thực đơn cũ
    await deleteCache('products_all_menu');

    res.status(200).json({
      success: true,
      message: 'Ngừng bán sản phẩm thành công.',
      data: deleted
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cập nhật số lượng kho riêng của chi nhánh
 * @route   PATCH /api/v1/products/:id/stock
 * @access  Private (Admin/Staff)
 */
const updateProductStock = async (req, res, next) => {
  try {
    const { store_id, stock } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404);
      throw new Error('Không tìm thấy sản phẩm.');
    }

    const stockNum = Number(stock);
    const isAvail = stockNum > 0;

    const idx = product.inventory.findIndex(inv => inv.store_id === store_id);
    if (idx > -1) {
      product.inventory[idx].stock = stockNum;
      product.inventory[idx].is_available = isAvail;
    } else {
      product.inventory.push({ store_id, stock: stockNum, is_available: isAvail });
    }

    // ⚡ TỰ ĐỘNG ĐỒNG BỘ TRẠNG THÁI STATUS TỔNG CỦA MÓN ĂN (SELLING / OUT_OF_STOCK)
    const totalStock = (product.inventory || []).reduce((sum, inv) => sum + (inv.stock || 0), 0);
    if (totalStock <= 0) {
      product.status = 'out_of_stock';
    } else {
      product.status = 'selling';
    }

    await product.save();

    // 🧹 Xóa cache thực đơn cũ khi tồn kho thay đổi
    await deleteCache('products_all_menu');

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy danh sách các danh mục
 * @route   GET /api/v1/categories
 * @access  Private
 */
const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ is_active: true });
    res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Thêm danh mục mới
 * @route   POST /api/v1/categories
 * @access  Private (Admin)
 */
const createCategory = async (req, res, next) => {
  try {
    const newCategory = await Category.create(req.body);
    res.status(201).json({
      success: true,
      data: newCategory
    });
  } catch (error) {
    next(error);
  }
};

const toggleProductStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) {
      res.status(404);
      throw new Error('Không tìm thấy sản phẩm.');
    }

    const nextStatus = product.status === 'selling' ? 'out_of_stock' : 'selling';
    product.status = nextStatus;

    // Tự động đồng bộ trạng thái is_available cho toàn bộ kho chi nhánh tương ứng
    if (nextStatus === 'out_of_stock') {
      product.inventory.forEach(inv => {
        inv.is_available = false;
      });
    } else {
      product.inventory.forEach(inv => {
        if (inv.stock > 0) inv.is_available = true;
      });
    }

    const updatedProduct = await product.save();

    // 🧹 Xóa cache thực đơn cũ khi chuyển trạng thái
    await deleteCache('products_all_menu');

    res.status(200).json({
      success: true,
      message: `Đã cập nhật trạng thái món ăn thành công sang: ${nextStatus === 'selling' ? 'Đang bán' : 'Hết hàng'}`,
      data: updatedProduct
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductStock,
  toggleProductStatus,
  getCategories,
  createCategory
};
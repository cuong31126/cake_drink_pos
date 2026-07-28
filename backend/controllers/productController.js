const Product = require('../models/Product');
const Category = require('../models/Category');

/**
 * @desc    Lấy danh sách tất cả sản phẩm bánh & nước đang bán
 * @route   GET /api/v1/products
 * @access  Private
 */
const getProducts = async (req, res, next) => {
  try {
    const products = await Product.find({ status: 'selling' }).sort({ name: 1 });

    res.status(200).json({
      success: true,
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

    const idx = product.inventory.findIndex(inv => inv.store_id === store_id);
    if (idx > -1) {
      product.inventory[idx].stock = stock;
    } else {
      product.inventory.push({ store_id, stock, is_available: true });
    }

    await product.save();
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

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductStock,
  getCategories,
  createCategory
};
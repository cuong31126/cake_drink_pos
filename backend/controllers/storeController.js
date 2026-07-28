const Store = require('../models/Store');

/**
 * @desc    Lấy danh sách tất cả các chi nhánh cửa hàng hoạt động
 * @route   GET /api/v1/stores
 * @access  Public
 */
const getStores = async (req, res, next) => {
  try {
    const stores = await Store.find({ is_active: true });

    res.status(200).json({
      success: true,
      data: stores
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin thêm chi nhánh mới
 * @route   POST /api/v1/stores
 * @access  Private (Admin)
 */
const createStore = async (req, res, next) => {
  try {
    const { _id, store_name, address, phone } = req.body;
    const store = await Store.create({ _id, store_name, address, phone });

    res.status(201).json({
      success: true,
      data: store
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin cập nhật thông tin chi nhánh
 * @route   PUT /api/v1/stores/:id
 * @access  Private (Admin)
 */
const updateStore = async (req, res, next) => {
  try {
    const store = await Store.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!store) {
      res.status(404);
      throw new Error('Không tìm thấy chi nhánh yêu cầu.');
    }

    res.status(200).json({
      success: true,
      data: store
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getStores, createStore, updateStore };
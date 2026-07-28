const Table = require('../models/Table');

/**
 * @desc    Lấy danh sách sơ đồ bàn ăn thuộc một chi nhánh cụ thể
 * @route   GET /api/v1/stores/:store_id/tables
 * @access  Private (Staff/Admin)
 */
const getTablesByStore = async (req, res, next) => {
  try {
    const { store_id } = req.params;

    // Tìm kiếm tất cả các bàn ăn thuộc store_id yêu cầu, sắp xếp theo số thứ tự bàn
    const tables = await Table.find({ store_id }).sort({ table_number: 1 });

    res.status(200).json({
      success: true,
      data: tables
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cập nhật thủ công trạng thái bàn ăn (Ví dụ: Chuyển từ Occupied về Available thủ công)
 * @route   PATCH /api/v1/tables/:id/status
 * @access  Private (Admin)
 */
const updateTableStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    const table = await Table.findById(req.params.id);
    if (!table) {
      res.status(404);
      throw new Error('Không tìm thấy bàn ăn yêu cầu.');
    }

    table.status = status;
    if (status === 'available') {
      table.current_order_id = null; // Ngắt liên kết đơn hàng nếu chuyển về bàn trống
    }

    const updatedTable = await table.save();

    res.status(200).json({
      success: true,
      message: 'Cập nhật trạng thái bàn ăn thành công.',
      data: updatedTable
    });
  } catch (error) {
    next(error);
  }
};

const createTable = async (req, res, next) => {
  try {
    const { _id, store_id, table_number, seating_capacity } = req.body;
    const table = await Table.create({ _id, store_id, table_number, seating_capacity });

    res.status(201).json({
      success: true,
      data: table
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getTablesByStore, updateTableStatus, createTable };
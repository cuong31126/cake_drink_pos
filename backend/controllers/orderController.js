const Order = require('../models/Order');
const Table = require('../models/Table');
const Product = require('../models/Product');
const Notification = require('../models/Notification');

// 💡 CÔNG TẮC TẮT/BẬT TỰ ĐỘNG TRỪ TỒN KHO KHI TEST ĐƠN HÀNG:
// - Đặt false: Tắt tự động trừ tồn kho
// - Đặt true : Bật tự động trừ tồn kho khi chạy thật
const ENABLE_AUTO_STOCK_DEDUCTION = true;

/**
 * 💡 Hàm phụ trợ: Tự động trừ tồn kho sản phẩm theo chi nhánh khi có đơn hàng mới hoặc thêm món
 */
const deductProductStock = async (storeId, items) => {
  if (!ENABLE_AUTO_STOCK_DEDUCTION) return; // 💡 Bị chặn nếu công tắc đang tắt (false)
  if (!items || items.length === 0) return;
  try {
    for (const item of items) {
      const productId = item.product_id || item._id;
      if (!productId) continue;
      
      const deductQty = item.quantity || 1;
      // 🔒 RỦI RO 3 KHIẾN CONCURRENCY RACE CONDITION: Sử dụng toán tử $inc nguyên tử của MongoDB Atlas
      await Product.updateOne(
        { _id: productId, "inventory.store_id": storeId },
        { $inc: { "inventory.$.stock": -deductQty } }
      );
      await Product.updateOne(
        { _id: productId, "inventory.store_id": storeId, "inventory.stock": { $lte: 0 } },
        { $set: { "inventory.$.stock": 0, "inventory.$.is_available": false } }
      );
    }
  } catch (err) {
    console.error("Lỗi tự động trừ tồn kho:", err);
  }
};

/**
 * @desc    Mở bàn ăn, Khởi tạo đơn hàng nháp tại quán (Trạng thái bàn chuyển sang occupied)
 * @route   POST /api/v1/orders/dine-in
 * @access  Private (Staff/Admin)
 */



/**
 * @desc    Lấy danh sách hóa đơn từ MongoDB Atlas có phân quyền theo chi nhánh
 * @route   GET /api/v1/orders
 * @access  Private (Chỉ cho phép Nhân viên Staff hoặc Quản trị Admin)
 * 
 * 💡 GIẢI THÍCH CHO NGƯỜI MỚI HỌC:
 * - Admin (Chủ chuỗi): Cần xem toàn bộ hóa đơn của tất cả các chi nhánh để thống kê doanh thu.
 * - Staff (Nhân viên trực quầy): Chỉ được phép xem các hóa đơn phát sinh tại chi nhánh mình đang làm việc.
 * - Ta lọc dữ liệu ở Backend (DB query) thay vì Frontend để đảm bảo bảo mật dữ liệu tuyệt đối.
 */
const getOrders = async (req, res, next) => {
  try {
    // Khởi tạo đối tượng bộ lọc rỗng (Mặc định không lọc gì cả, dùng cho Admin để lấy tất cả)
    let filter = {};

    // Kiểm tra nếu vai trò của người đăng nhập hiện tại là Nhân viên (staff)
    if (req.user.role === 'staff') {
      filter.store_id = req.user.store_id || 'store_Q1';
    } else if (req.user.role === 'user') {
      const userId = req.user._id.toString();
      const userName = req.user.name;
      const userEmail = req.user.email;
      const conditions = [{ customer_id: userId }];
      if (userName) conditions.push({ created_by: userName });
      if (userEmail) conditions.push({ created_by: userEmail });
      filter.$or = conditions;
      // Chỉ hiển thị đơn có ít nhất 1 món (loại bỏ đơn nháp rỗng)
      filter['items.0'] = { $exists: true };
    }

    // Truy vấn cơ sở dữ liệu MongoDB thông qua Model Order:
    // - find(filter): Lọc theo điều kiện vừa thiết lập ở trên
    // - sort({ createdAt: -1 }): Sắp xếp các hóa đơn mới tạo nhất lên trên đầu
    const orders = await Order.find(filter).sort({ createdAt: -1 });

    // Trả kết quả thành công dạng JSON về cho Frontend hiển thị
    res.status(200).json({
      success: true,
      data: orders
    });
  } catch (error) {
    // Chuyển tiếp lỗi phát sinh cho errorMiddleware xử lý tập trung
    next(error);
  }
};

// Nhớ xuất hàm này ra cùng các hàm cũ của bạn:
// module.exports = { createDineInOrder, addItemsToOrder, editOrderItemsWithLog, getOrders };


const createDineInOrder = async (req, res, next) => {
  try {
    const { table_id, items, store_id } = req.body;

    // 1. Kiểm tra trạng thái hiện tại của bàn ăn trong cơ sở dữ liệu
    const table = await Table.findById(table_id);
    if (!table) {
      res.status(404);
      throw new Error('Không tìm thấy mã số bàn ăn yêu cầu.');
    }

    if (table.status === 'occupied') {
      res.status(400);
      throw new Error('Bàn ăn này hiện đang có lượt khách khác ngồi, không thể mở đơn mới.');
    }

    // 2. Tính toán sơ bộ tổng tiền của danh sách món ăn khởi tạo gửi lên
    let subTotal = 0;
    if (items && items.length > 0) {
      items.forEach(item => {
        subTotal += item.price * item.quantity;
      });
    }

    // 3. Khởi tạo một Document đơn hàng mới ở trạng thái chưa thanh toán
    const order = new Order({
      store_id: store_id || 'store_Q1',
      customer_id: req.user._id.toString(),
      table_id,
      created_by: req.user.name || req.user.email || req.user._id, // Lấy tên người lập đơn từ protect auth
      order_type: 'dine-in',
      items: items || [],
      sub_total: subTotal,
      final_total: subTotal,
      status: 'serving',
      payment_status: 'unpaid'
    });

    const savedOrder = await order.save();
    await deductProductStock(store_id || 'store_Q1', items);

    // 4. Cập nhật khóa trạng thái bàn sang "Đang có khách" và găm mã đơn hàng nháp này vào bàn
    table.status = 'occupied';
    table.current_order_id = savedOrder._id;
    await table.save();

    res.status(201).json({
      success: true,
      message: 'Mở bàn ăn và tạo đơn hàng nháp thành công.',
      data: savedOrder
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Nhân viên gọi thêm món mới cho bàn (Frontend Append món vào đơn)
 * @route   PATCH /api/v1/orders/:id/add-items
 * @access  Private (Staff/Admin)
 */
const addItemsToOrder = async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const { new_items } = req.body; // Mảng danh sách các món gọi thêm

    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404);
      throw new Error('Không tìm thấy đơn hàng yêu cầu.');
    }

    // 🔒 RỦI RO 1: Kiểm tra quyền sở hữu đơn hàng (Ownership Security Check)
    if (req.user && req.user.role === 'user') {
      const isOwner = (order.customer_id && order.customer_id.toString() === req.user._id.toString()) ||
                      (order.created_by && (order.created_by === req.user.name || order.created_by === req.user.email));
      if (!isOwner) {
        res.status(403);
        throw new Error('Bạn không có quyền thêm món vào đơn hàng của người khác!');
      }
    }

    if (order.status !== 'serving' && order.status !== 'pending_confirm') {
      res.status(400);
      throw new Error('Đơn hàng này đã được chốt hoặc hủy bỏ trước đó, không thể gọi thêm món.');
    }

    // Đẩy các món mới vào mảng items hiện có của đơn hàng
    new_items.forEach(item => {
      order.items.push({
        product_id: item.product_id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        selected_attributes: item.selected_attributes,
        item_status: 'cooking' // Mặc định món mới vào tab đang chế biến
      });
    });

    // Tính toán lại tổng tiền của hóa đơn
    let updatedSubTotal = 0;
    order.items.forEach(item => {
      updatedSubTotal += item.price * item.quantity;
    });

    order.sub_total = updatedSubTotal;
    order.final_total = updatedSubTotal - order.discount_amount;

    const updatedOrder = await order.save();
    await deductProductStock(order.store_id || 'store_Q1', new_items);

    res.status(200).json({
      success: true,
      message: 'Đã gọi thêm món mới vào đơn hàng thành công.',
      data: updatedOrder
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Sửa đổi số lượng hoặc Xóa hẳn món (Chỉ Admin/Manager duyệt - Lưu Log cancelled_items)
 * @route   PUT /api/v1/orders/:id/edit-items
 * @access  Private (Cần kèm thông tin Admin phê duyệt hoặc kiểm soát qua Role)
 */
const editOrderItemsWithLog = async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const { updated_items, reason, admin_approver_id } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404);
      throw new Error('Không tìm thấy đơn hàng cần điều chỉnh.');
    }

    if (req.body.delivery_address !== undefined) {
      order.delivery_address = req.body.delivery_address;
    }
    if (req.body.customer_phone !== undefined) {
      order.customer_phone = req.body.customer_phone;
    }
    if (req.body.order_type !== undefined) {
      order.order_type = req.body.order_type;
    }

    // 🔒 RỦI RO 1: Kiểm tra quyền sở hữu đơn hàng (Ownership Security Check)
    if (req.user && req.user.role === 'user') {
      const isOwner = (order.customer_id && order.customer_id.toString() === req.user._id.toString()) ||
                      (order.created_by && (order.created_by === req.user.name || order.created_by === req.user.email));
      if (!isOwner) {
        res.status(403);
        throw new Error('Bạn không có quyền chỉnh sửa đơn hàng của người khác!');
      }
    }

    // Duyệt qua mảng món cũ trong DB để so sánh đối chiếu tìm ra các món bị giảm/xóa
    order.items.forEach(oldItem => {
      // Tìm xem món cũ này còn nằm trong mảng cập nhật mới gửi lên không
      const matchedNewItem = updated_items.find(newItem => newItem.product_id === oldItem.product_id);

      if (!matchedNewItem) {
        // Trường hợp 1: Món ăn đã bị xóa HOÀN TOÀN khỏi danh sách
        order.cancelled_items.push({
          product_id: oldItem.product_id,
          name: oldItem.name,
          quantity: oldItem.quantity, // Ghi vết toàn bộ số lượng bị hủy
          reason: reason || 'Hủy bỏ món ăn khỏi bàn',
          updated_by: admin_approver_id || req.user._id
        });
      } else if (matchedNewItem.quantity < oldItem.quantity) {
        // Trường hợp 2: Số lượng của món ăn bị CẮT GIẢM bớt đi
        const diffQuantity = oldItem.quantity - matchedNewItem.quantity;
        order.cancelled_items.push({
          product_id: oldItem.product_id,
          name: oldItem.name,
          quantity: diffQuantity, // Ghi vết số lượng chênh lệch bị giảm
          reason: reason || 'Giảm bớt số lượng phần ăn',
          updated_by: admin_approver_id || req.user._id
        });
      }
    });

    // Tiến hành ghi đè mảng items mới và tính toán lại bài toán dòng tiền tài chính
    order.items = updated_items;
    order.is_confirmed = false;

    let newSubTotal = 0;
    order.items.forEach(item => {
      newSubTotal += item.price * item.quantity;
    });

    order.sub_total = newSubTotal;
    order.final_total = newSubTotal - order.discount_amount;

    const savedOrder = await order.save();

    res.status(200).json({
      success: true,
      message: 'Điều chỉnh danh sách món và lưu nhật ký đối soát thành công.',
      data: savedOrder
    });
  } catch (error) {
    next(error);
  }
};

const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      res.status(404);
      throw new Error('Không tìm thấy đơn hàng yêu cầu.');
    }
    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

const updateOrderItemStatus = async (req, res, next) => {
  try {
    const { product_id, item_status } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) {
      res.status(404);
      throw new Error('Không tìm thấy đơn hàng yêu cầu.');
    }

    const item = order.items.find(i => i.product_id === product_id);
    if (!item) {
      res.status(404);
      throw new Error('Không tìm thấy món ăn trong đơn hàng.');
    }

    item.item_status = item_status;
    await order.save();

    res.status(200).json({
      success: true,
      message: 'Cập nhật trạng thái chế biến món ăn thành công.',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

const settleOrder = async (req, res, next) => {
  try {
    const { payment_method } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) {
      res.status(404);
      throw new Error('Không tìm thấy đơn hàng yêu cầu.');
    }

    if (payment_method) {
      order.payment_method = payment_method;
    }
    order.payment_status = 'paid';
    order.status = 'completed';
    await order.save();

    if (order.table_id) {
      await Table.findByIdAndUpdate(order.table_id, {
        status: 'available',
        current_order_id: null
      });
    }

    res.status(200).json({
      success: true,
      message: 'Thanh toán hóa đơn thành công và giải phóng bàn ăn.',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

const cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      res.status(404);
      throw new Error('Không tìm thấy đơn hàng yêu cầu.');
    }

    // 🔒 RỦI RO 1: Kiểm tra quyền sở hữu đơn hàng (Ownership Security Check)
    if (req.user && req.user.role === 'user') {
      const isOwner = (order.customer_id && order.customer_id.toString() === req.user._id.toString()) ||
                      (order.created_by && (order.created_by === req.user.name || order.created_by === req.user.email));
      if (!isOwner) {
        res.status(403);
        throw new Error('Bạn không có quyền hủy đơn hàng của người khác!');
      }
    }

    // 💡 KHÁCH HÀNG KHÔNG ĐƯỢC TỰ HỦY KHI BẾP ĐÃ NHẬN ĐƠN (SERVED / READY / COMPLETED)
    if (req.user.role === 'user' && order.status !== 'pending_confirm') {
      res.status(400);
      throw new Error('Đơn hàng đã được Nhân viên tiếp nhận và Bếp đang chế biến. Bạn không thể tự hủy đơn nữa, vui lòng nhắn tin cho Nhân viên để hỗ trợ!');
    }

    order.status = 'cancelled';
    await order.save();

    if (order.table_id) {
      await Table.findByIdAndUpdate(order.table_id, {
        status: 'available',
        current_order_id: null
      });
    }

    res.status(200).json({
      success: true,
      message: 'Hủy đơn hàng thành công và giải phóng bàn ăn.',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

const printDraftBill = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      res.status(404);
      throw new Error('Không tìm thấy đơn hàng yêu cầu.');
    }
    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

const createTakeAwayOrder = async (req, res, next) => {
  try {
    const { items, store_id, order_type, delivery_address, customer_phone } = req.body;

    let subTotal = 0;
    if (items && items.length > 0) {
      items.forEach(item => {
        subTotal += item.price * item.quantity;
      });
    }

    const order = new Order({
      store_id: store_id || 'store_Q1',
      customer_id: req.user._id.toString(),
      created_by: req.user.name || req.user.email || req.user._id.toString(),
      order_type: order_type || 'take-away',
      delivery_address: delivery_address || "",
      customer_phone: customer_phone || "",
      items: items || [],
      sub_total: subTotal,
      final_total: subTotal,
      status: 'pending_confirm',
      payment_status: 'unpaid'
    });

    const savedOrder = await order.save();
    await deductProductStock(store_id || 'store_Q1', items);

    res.status(201).json({
      success: true,
      message: 'Khởi tạo đơn hàng mang đi thành công.',
      data: savedOrder
    });
  } catch (error) {
    next(error);
  }
};

const acceptOrder = async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404);
      throw new Error('Không tìm thấy đơn hàng.');
    }

    order.status = 'serving';
    order.is_confirmed = true;
    const savedOrder = await order.save();

    // 🔔 TỰ ĐỘNG PHÁT THÔNG BÁO CHO KHÁCH HÀNG KHI NHÂN VIÊN NHẬN ĐƠN
    try {
      const targetUserId = order.customer_id || order.created_by;
      await Notification.create({
        user_id: targetUserId,
        title: '👨‍🍳 Bếp đã tiếp nhận đơn hàng!',
        message: `Đơn hàng #${order._id.slice(-6).toUpperCase()} của bạn đã được Nhân viên chấp nhận và Bếp đang bắt đầu chế biến.`,
        type: 'order_status',
        order_id: order._id
      });
    } catch (e) {
      console.warn("Lỗi phát thông báo nhận đơn:", e.message);
    }

    res.status(200).json({
      success: true,
      message: 'Nhận đơn hàng thành công và chuyển vào bếp.',
      data: savedOrder
    });
  } catch (error) {
    next(error);
  }
};

const readyOrder = async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404);
      throw new Error('Không tìm thấy đơn hàng.');
    }

    order.status = 'ready';
    order.items.forEach(item => {
      item.item_status = 'served';
    });

    const savedOrder = await order.save();

    // 🔔 TỰ ĐỘNG PHÁT THÔNG BÁO CHO KHÁCH HÀNG KHI MÓN ĂN SẴN SÀNG
    try {
      const targetUserId = order.customer_id || order.created_by;
      await Notification.create({
        user_id: targetUserId,
        title: '🎉 Món ăn đã sẵn sàng!',
        message: `Đơn hàng #${order._id.slice(-6).toUpperCase()} đã chế biến xong. Vui lòng nhận món hoặc chờ phục vụ!`,
        type: 'order_status',
        order_id: order._id
      });
    } catch (e) {
      console.warn("Lỗi phát thông báo món ready:", e.message);
    }

    res.status(200).json({
      success: true,
      message: 'Đã hoàn thành chế biến món ăn cho đơn hàng này.',
      data: savedOrder
    });
  } catch (error) {
    next(error);
  }
};

const confirmOrder = async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const { is_confirmed } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404);
      throw new Error('Không tìm thấy đơn hàng.');
    }

    // 🔒 RỦI RO 1: Kiểm tra quyền sở hữu đơn hàng (Ownership Security Check)
    if (req.user && req.user.role === 'user') {
      const isOwner = (order.customer_id && order.customer_id.toString() === req.user._id.toString()) ||
                      (order.created_by && (order.created_by === req.user.name || order.created_by === req.user.email));
      if (!isOwner) {
        res.status(403);
        throw new Error('Bạn không có quyền xác nhận đơn hàng của người khác!');
      }
    }

    order.is_confirmed = is_confirmed;
    // Nếu khách hàng hủy xác nhận để sửa đổi, đưa trạng thái về pending_confirm
    if (!is_confirmed && order.status === 'serving') {
      order.status = 'pending_confirm';
    } else if (is_confirmed && req.user && (req.user.role === 'admin' || req.user.role === 'staff')) {
      // Tự động đẩy đơn vào Bếp nếu người xác nhận là Staff hoặc Admin
      order.status = 'serving';
    }

    const savedOrder = await order.save();

    res.status(200).json({
      success: true,
      message: is_confirmed ? 'Xác nhận đơn hàng thành công.' : 'Hủy xác nhận đơn hàng thành công.',
      data: savedOrder
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Xóa vĩnh viễn đơn hàng (Chỉ dành cho Admin)
 * @route   DELETE /api/v1/orders/:id
 * @access  Private (Admin only)
 */
const deleteOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      res.status(404);
      throw new Error('Không tìm thấy đơn hàng cần xóa.');
    }

    // Giải phóng bàn ăn nếu đây là đơn dine-in đang phục vụ
    if (order.order_type === 'dine-in' && order.table_id) {
      const otherActiveOrders = await Order.find({
        table_id: order.table_id,
        _id: { $ne: order._id },
        status: { $in: ['pending_confirm', 'serving', 'ready'] }
      });
      if (otherActiveOrders.length === 0) {
        await Table.findOneAndUpdate({ _id: order.table_id }, { status: 'available' });
      }
    }

    await Order.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: `Đã xóa vĩnh viễn đơn hàng #${req.params.id.slice(-6).toUpperCase()} khỏi MongoDB Atlas.`
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { 
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
  deleteOrder
};
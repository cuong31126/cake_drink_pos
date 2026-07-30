const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
  name: { type: String, required: [true, 'Tên món ăn/nước uống là bắt buộc'], trim: true },
  price: { type: Number, required: [true, 'Giá tiền là bắt buộc'], min: 0 },
  category: { type: String, required: true },
  status: { type: String, enum: ['selling', 'out_of_stock'], default: 'selling' },
  image_url: { type: String, default: "" },
  
  category_id: { type: String, default: "" },
  slug: { type: String, default: "" },
  origin_price: { type: Number, default: 0 },
  sale_price: { type: Number, default: 0 },
  discount_percent: { type: Number, default: 0 }, // Phần trăm giảm giá (VD: 10 = 10%)
  is_on_sale: { type: Boolean, default: false },   // Công tắc bật/tắt khuyến mãi món
  attributes: { type: Object, default: {} },
  inventory: {
    type: [{
      store_id: { type: String },
      stock: { type: Number, default: 0 },
      is_available: { type: Boolean, default: true }
    }],
    default: []
  }
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
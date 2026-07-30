const mongoose = require('mongoose');

const inventoryLogSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => new mongoose.Types.ObjectId().toString()
  },
  store_id: {
    type: String,
    required: true
  },
  product_id: {
    type: String,
    ref: 'Product',
    required: true
  },
  product_name: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    enum: ['start_of_day', 'end_of_day', 'manual_adjustment'],
    default: 'manual_adjustment'
  },
  previous_stock: {
    type: Number,
    default: 0
  },
  new_stock: {
    type: Number,
    required: true
  },
  change_amount: {
    type: Number,
    default: 0
  },
  note: {
    type: String,
    default: ''
  },
  performed_by: {
    type: String,
    default: 'Staff/Admin'
  }
}, {
  timestamps: true
});

const InventoryLog = mongoose.model('InventoryLog', inventoryLogSchema);
module.exports = InventoryLog;

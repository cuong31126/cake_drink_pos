const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  store_name: { type: String, required: true, trim: true },
  address: { type: String, required: true },
  phone: { type: String },
  is_active: { type: Boolean, default: true }
}, { timestamps: true });

const Store = mongoose.model('Store', storeSchema);
module.exports = Store;

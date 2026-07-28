const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true },
  is_active: { type: Boolean, default: true }
}, { timestamps: true });

const Category = mongoose.model('Category', categorySchema);
module.exports = Category;

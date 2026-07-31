require('dotenv').config({ path: './backend/.env' });
const connectDB = require('./backend/config/db');
const Product = require('./backend/models/Product');

const updateThuDucStock = async () => {
  try {
    await connectDB();

    const products = await Product.find({});
    console.log(`Tìm thấy ${products.length} sản phẩm trong database...`);

    let updatedCount = 0;

    for (const p of products) {
      if (!p.inventory || !Array.isArray(p.inventory)) {
        p.inventory = [];
      }

      const idx = p.inventory.findIndex(inv => inv.store_id === 'store_ThuDuc');
      if (idx > -1) {
        p.inventory[idx].stock = 100;
        p.inventory[idx].is_available = true;
      } else {
        p.inventory.push({
          store_id: 'store_ThuDuc',
          stock: 100,
          is_available: true
        });
      }

      p.status = 'selling';
      await p.save();
      updatedCount++;
    }

    console.log(`✅ ĐÃ CẬP NHẬT THÀNH CÔNG ${updatedCount} SẢN PHẨM Ở CHI NHÁNH THỦ ĐỨC LÊN 100 MÓN (TRẠNG THÁI: ĐANG BÁN)!`);
    process.exit(0);
  } catch (err) {
    console.error("Lỗi khi cập nhật kho Thủ Đức:", err);
    process.exit(1);
  }
};

updateThuDucStock();

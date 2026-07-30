// const path = require('path');
// require('dotenv').config();
// const mongoose = require('mongoose');
// const Product = require('./models/Product');

// async function resetProducts() {
//     try {
//         await mongoose.connect(process.env.MONGO_URI);
//         console.log("Connected to MongoDB Atlas");
//         const res = await Product.updateMany({}, { status: 'selling' });
//         console.log(`Updated ${res.modifiedCount} products to status: 'selling'`);
//         const total = await Product.countDocuments();
//         console.log(`Total products in DB: ${total}`);
//         mongoose.disconnect();
//     } catch (err) {
//         console.error(err);
//     }
// }

// resetProducts();

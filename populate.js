// populateData.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './models/productModel.js';
import Inventory from './models/inventoryModel.js';
import InventoryRecord from './models/inventoryRecordModel.js';
import Stock from './models/stockModel.js';
import Transaction from './models/transactionModel.js';
import TransactionItem from './models/transactionItem.js';
import User from './models/userModel.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URL || 'mongodb://localhost:27017/yourdb';

await mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

console.log('MongoDB connected');

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(arr) {
  return arr[randomInt(0, arr.length - 1)];
}

async function seedStock(products) {
  console.log('Seeding stock orders...');
  const startDate = new Date('2025-07-01');
  const endDate = new Date('2025-08-31');

  for (const product of products) {
    const ordersCount = randomInt(1, 5); // 1-5 orders per product
    for (let i = 0; i < ordersCount; i++) {
      // Scheduled delivery date
      const deliveryDate = new Date(
        startDate.getTime() +
          randomInt(0, (endDate - startDate) / (1000 * 60 * 60 * 24)) *
            24 *
            60 *
            60 *
            1000
      );

      // Determine status
      let status = 'pending';
      let deliveredQuantity = 0;
      let deliveredDate = null;
      const isCancelled = Math.random() < 0.1;

      if (isCancelled) {
        status = 'cancelled';
      } else {
        // Randomly some deliveries are already delivered
        if (Math.random() < 0.7) {
          status = 'delivered';
          deliveredQuantity = randomInt(
            Math.floor(product.lowStockThreshold / 2),
            100
          );
          // Delivered date: on or shortly after deliveryDate
          const delay = randomInt(0, 5); // 0-5 days late
          deliveredDate = new Date(deliveryDate);
          deliveredDate.setDate(deliveredDate.getDate() + delay);
          if (deliveredDate > endDate) deliveredDate = new Date(endDate);
        }
      }

      const orderQty = randomInt(20, 100);

      await Stock.create({
        productId: product._id,
        supplierId: product.supplierId,
        supplierName: `Supplier ${product.supplierId}`,
        orderQuantity: orderQty,
        deliveredQuantity,
        deliveryDate,
        deliveredDate,
        acquisitionPrice: Number(product.price) * 0.5,
        status,
      });
    }
  }
}

async function seedInventoryRecords(inventories) {
  console.log('Seeding daily inventory records...');
  const startDate = new Date('2025-07-01');
  const endDate = new Date('2025-08-31');

  for (const inv of inventories) {
    let currentQty = inv.quantity;
    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      const change = randomInt(-5, 5); // simulate daily change
      const prevQty = currentQty;
      currentQty = Math.max(0, currentQty + change);

      await InventoryRecord.create({
        productId: inv.productId,
        inventoryId: inv._id,
        quantity: currentQty,
        prevQuantity: prevQty,
        acquisitionPrice: inv.acquisitionPrice,
        dateRecorded: new Date(d),
      });
    }
  }
}

async function seedTransactions(products, user) {
  console.log('Seeding transactions...');
  const startDate = new Date('2025-07-01');
  const endDate = new Date('2025-08-31');

  const totalDays = (endDate - startDate) / (1000 * 60 * 60 * 24) + 1;

  for (let i = 0; i < totalDays; i++) {
    const txDate = new Date(startDate);
    txDate.setDate(txDate.getDate() + i);

    const txCount = randomInt(1, 5); // transactions per day
    for (let j = 0; j < txCount; j++) {
      const itemsCount = randomInt(1, 3); // items per transaction
      const selectedProducts = [];

      while (selectedProducts.length < itemsCount) {
        const prod = randomChoice(products);
        if (!selectedProducts.includes(prod)) selectedProducts.push(prod);
      }

      let grossAmount = 0;
      const txItems = [];

      for (const p of selectedProducts) {
        const quantity = randomInt(1, 5);
        const price = Number(p.price);
        const totalAmount = price * quantity;
        grossAmount += totalAmount;

        txItems.push({ product: p, quantity, price, totalAmount });
      }

      const totalDiscount = Math.random() < 0.2 ? grossAmount * 0.1 : 0;
      const totalAmount = grossAmount - totalDiscount;

      const transaction = await Transaction.create({
        receiptNum: `R-${txDate.getTime()}-${j}`,
        totalQty: txItems.reduce((a, b) => a + b.quantity, 0),
        grossAmount,
        totalAmount,
        totalDiscount,
        discountType: totalDiscount > 0 ? 'senior' : 'none',
        cashier: user._id,
        createdAt: txDate,
      });

      for (const item of txItems) {
        await TransactionItem.create({
          transactionId: transaction._id,
          productId: item.product._id,
          quantity: item.quantity,
          price: item.price,
          totalAmount: item.totalAmount,
          vatType: 'vatable',
          createdAt: txDate,
        });
      }
    }
  }
}

async function main() {
  try {
    const products = await Product.find({ status: 'active' });
    const inventories = await Inventory.find({ status: 'active' });
    const user = await User.findOne({ email: 'admin@gmail.com' });

    await seedStock(products);
    await seedInventoryRecords(inventories);
    await seedTransactions(products, user);

    console.log('Seeding completed');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();

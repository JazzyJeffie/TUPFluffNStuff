import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Transaction from '../models/transactionModel.js';
import TransactionItem from '../models/transactionItem.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URL;

async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected ✅');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
}

// Daily quantities for July 1-31
const dailyQty = [
  { date: '2025-07-01', qty: 0 }, // Added July 1 (not in your list, assumed 0)
  { date: '2025-07-02', qty: 5 },
  { date: '2025-07-03', qty: 5 },
  { date: '2025-07-04', qty: 5 },
  { date: '2025-07-05', qty: 5 },
  { date: '2025-07-06', qty: 5 },
  { date: '2025-07-07', qty: 5 },
  { date: '2025-07-08', qty: 5 },
  { date: '2025-07-09', qty: 5 },
  { date: '2025-07-10', qty: 7 },
  { date: '2025-07-11', qty: 4 },
  { date: '2025-07-12', qty: 5 },
  { date: '2025-07-13', qty: 4 },
  { date: '2025-07-14', qty: 5 },
  { date: '2025-07-15', qty: 5 },
  { date: '2025-07-16', qty: 5 },
  { date: '2025-07-17', qty: 5 },
  { date: '2025-07-18', qty: 5 },
  { date: '2025-07-19', qty: 5 },
  { date: '2025-07-20', qty: 10 },

  { date: '2025-07-22', qty: 10 },
  { date: '2025-07-23', qty: 10 },
  { date: '2025-07-24', qty: 5 },
  { date: '2025-07-25', qty: 5 },
  { date: '2025-07-26', qty: 10 },
  { date: '2025-07-27', qty: 15 },
  { date: '2025-07-28', qty: 15 },
  { date: '2025-07-29', qty: 10 },
  { date: '2025-07-30', qty: 10 },
  { date: '2025-07-31', qty: 10 },
];

const productId = '68adc3ac61739e2064aa6a8c';
const price = 50.0;

// Generate a random 9-digit number for receipt
function generateReceiptNum() {
  const num = Math.floor(Math.random() * 1_000_000_000); // 0 - 999999999
  return `FNS-${String(num).padStart(9, '0')}`;
}

async function createTransactions(cashierId) {
  for (const day of dailyQty) {
    const qty = day.qty;
    const totalAmount = qty * price;
    const vatAmount = totalAmount - totalAmount / 1.12;
    const netAmount = totalAmount - vatAmount;

    const receiptNum = generateReceiptNum();

    const transaction = new Transaction({
      receiptNum,
      totalQty: qty,
      grossAmount: mongoose.Types.Decimal128.fromString(totalAmount.toFixed(2)),
      vatableAmount: mongoose.Types.Decimal128.fromString(netAmount.toFixed(2)),
      vatExemptSales: mongoose.Types.Decimal128.fromString('0.00'),
      vatZeroRatedSales: mongoose.Types.Decimal128.fromString('0.00'),
      vatAmount: mongoose.Types.Decimal128.fromString(vatAmount.toFixed(2)),
      totalAmount: mongoose.Types.Decimal128.fromString(totalAmount.toFixed(2)),
      totalDiscount: mongoose.Types.Decimal128.fromString('0.00'),
      discountType: 'none',
      paymentMethod: 'cash',
      cash: mongoose.Types.Decimal128.fromString(totalAmount.toFixed(2)),
      change: mongoose.Types.Decimal128.fromString('0.00'),
      cashier: cashierId,
      createdAt: new Date(day.date),
    });

    await transaction.save();

    const transItem = new TransactionItem({
      transactionId: transaction._id,
      productId,
      quantity: qty,
      price: mongoose.Types.Decimal128.fromString(price.toFixed(2)),
      totalAmount: mongoose.Types.Decimal128.fromString(totalAmount.toFixed(2)),
      vatAmount: mongoose.Types.Decimal128.fromString(vatAmount.toFixed(2)),
      netAmount: mongoose.Types.Decimal128.fromString(netAmount.toFixed(2)),
      vatType: 'vatable',
      isRefunded: false,
      createdAt: new Date(day.date),
    });

    await transItem.save();

    console.log(`Transaction for ${day.date} created: ${receiptNum}`);
  }
}

async function run() {
  await connectDB();
  await createTransactions('68ad846a8455bdee5f67a3b5'); // replace with actual cashier ID
  mongoose.disconnect();
}

run();

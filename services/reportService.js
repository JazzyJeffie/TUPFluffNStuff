import mongoose from 'mongoose';
import Transaction from '../models/transactionModel.js';

import moment from 'moment-timezone';
import TransactionItem from '../models/transactionItem.js';
import Product from '../models/productModel.js';
import Category from '../models/categoryModel.js';

export const getSalesReportService = async (fromDate, toDate) => {
  // --- 🔑 Always compute range in PH timezone ---
  const start = moment.tz(fromDate, 'Asia/Manila').startOf('day').toDate();
  const end = moment.tz(toDate, 'Asia/Manila').endOf('day').toDate();

  // 1️⃣ Fetch transactions in date range
  const transactions = await Transaction.find({
    createdAt: { $gte: start, $lte: end },
    isDeleted: false,
  }).lean();

  if (!transactions.length) {
    return {
      volume: 0,
      grossSales: 0,
      netProfit: 0,
      totalRevenue: 0,
      totalVAT: 0,
      totalDiscount: 0,
      topSellingBySKU: [],
      topSellingByCategory: [],
      dailyBreakdown: [],
      transactionBreakdown: [],
    };
  }

  const transactionIds = transactions.map(t => t._id);

  // 2️⃣ Fetch transaction items
  const transactionItems = await TransactionItem.find({
    transactionId: { $in: transactionIds },
    isDeleted: false,
    isRefunded: false,
  }).lean();

  // 3️⃣ Map products
  const productIds = [
    ...new Set(transactionItems.map(item => item.productId.toString())),
  ];
  const products = await Product.find({ _id: { $in: productIds } }).lean();
  const productMap = {};
  products.forEach(p => (productMap[p._id.toString()] = p));

  // 4️⃣ Map categories
  const categoryIds = [
    ...new Set(products.map(p => p.categoryId).filter(Boolean)),
  ];
  const categories = await Category.find({
    _id: { $in: categoryIds.map(id => new mongoose.Types.ObjectId(id)) },
    isDeleted: false,
  }).lean();
  const categoryMap = {};
  categories.forEach(c => (categoryMap[c._id.toString()] = c.name));

  // 5️⃣ Initialize totals
  let grossSales = 0;
  let netProfit = 0;
  let totalRevenue = 0;
  let totalVAT = 0;
  let totalDiscount = 0;
  const skuMap = {};
  const categoryStatMap = {};

  transactions.forEach(t => {
    let tGross = 0;
    const items = transactionItems.filter(
      item => item.transactionId.toString() === t._id.toString()
    );

    items.forEach(item => {
      tGross += Number(item.price || 0) * Number(item.quantity || 0);
    });

    t._computedGross = tGross;

    // Totals
    grossSales += tGross;
    totalRevenue += Number(t.totalAmount || 0);
    totalDiscount += Number(t.totalDiscount || 0);

    items.forEach(item => {
      const product = productMap[item.productId.toString()];
      if (!product) return;

      const acquisitionPrice = Number(product.acquisitionPrice || 0);
      const netAmount = Number(item.netAmount || 0);
      const quantity = Number(item.quantity || 0);
      const profit = netAmount - acquisitionPrice * quantity;

      netProfit += profit;
      totalVAT += Number(item.vatAmount || 0);

      // SKU stats
      const sku = product.sku || 'UNKNOWN';
      if (!skuMap[sku])
        skuMap[sku] = {
          name: product.name || 'Unknown',
          quantity: 0,
          netProfit: 0,
        };
      skuMap[sku].quantity += quantity;
      skuMap[sku].netProfit += profit;

      // Category stats
      const categoryName = categoryMap[product.categoryId] || 'Uncategorized';
      if (!categoryStatMap[categoryName])
        categoryStatMap[categoryName] = { quantity: 0, netProfit: 0 };
      categoryStatMap[categoryName].quantity += quantity;
      categoryStatMap[categoryName].netProfit += profit;
    });
  });

  const topSellingBySKU = Object.entries(skuMap)
    .map(([sku, data]) => ({ sku, ...data }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  const topSellingByCategory = Object.entries(categoryStatMap)
    .map(([categoryKey, data]) => ({ category: categoryKey, ...data }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  // --- Daily breakdown ---
  const breakdownMap = {};
  transactions.forEach(t => {
    // const dateKey = new Date(t.createdAt).toISOString().split('T')[0];

    const dateKey = moment(t.createdAt).tz('Asia/Manila').format('YYYY-MM-DD');
    if (!breakdownMap[dateKey])
      breakdownMap[dateKey] = {
        date: dateKey,
        transactions: 0,
        grossSales: 0,
        totalRevenue: 0,
        totalVAT: 0,
        totalDiscount: 0,
      };
    breakdownMap[dateKey].transactions += 1;
    breakdownMap[dateKey].grossSales += Number(t.grossAmount || 0);
    breakdownMap[dateKey].totalRevenue += Number(t.totalAmount || 0);
    breakdownMap[dateKey].totalVAT += Number(t.vatAmount || 0);
    breakdownMap[dateKey].totalDiscount += Number(t.totalDiscount || 0);
  });
  const dailyBreakdown = Object.values(breakdownMap).sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  // --- Transaction breakdown with totalQty ---
  const transactionBreakdownMap = {};
  transactions.forEach(t => {
    // const dateKey = new Date(t.createdAt).toISOString().split('T')[0];
    const dateKey = moment(t.createdAt).tz('Asia/Manila').format('YYYY-MM-DD');
    if (!transactionBreakdownMap[dateKey])
      transactionBreakdownMap[dateKey] = [];

    transactionBreakdownMap[dateKey].push({
      id: t.receiptNum,
      grossAmount: Number(t.grossAmount || 0),
      totalAmount: Number(t.totalAmount || 0),
      vatAmount: Number(t.vatAmount || 0),
      quantity: Number(t.totalQty || 0), // ✅ totalQty from Transaction
      discount: Number(t.totalDiscount || 0),
      createdAt: t.createdAt,
    });
  });
  const transactionBreakdown = Object.entries(transactionBreakdownMap).map(
    ([date, transactions]) => ({ date, transactions })
  );

  // --- Total quantity sold ---
  const totalQuantitySold = transactionItems.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );

  return {
    volume: totalQuantitySold,
    grossSales,
    netProfit,
    totalRevenue,
    totalVAT,
    totalDiscount,
    topSellingBySKU,
    topSellingByCategory,
    dailyBreakdown,
    transactionBreakdown,
  };
};

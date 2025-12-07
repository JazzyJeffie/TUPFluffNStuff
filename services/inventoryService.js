import Inventory from '../models/inventoryModel.js';
import Product from '../models/productModel.js';
import Stock from '../models/stockModel.js';
import transactionModel from '../models/transactionModel.js';
import InventoryRecord from '../models/inventoryRecordModel.js';
import refund from '../models/refundModel.js';
import transactionItem from '../models/transactionItem.js';
import stockAdjustment from '../models/stockAdjustment.js';

const createInventory = async data => {
  const inventory = await Inventory.create({
    productId: data.productId,
    quantity: data.quantity,
    acquisitionPrice: data.acquisitionPrice || 0, // <- Add this line
  });

  return inventory;
};

const getInventoryById = async id => {
  const inventory = await Inventory.findOne({ _id: id, status: 'active' });
  return inventory;
};

const getInventoryByProductId = async productId => {
  return Inventory.findOne({ productId, status: 'active' });
};

// Update inventory quantity for a product
const updateQuantity = async (productId, quantity) => {
  const inventory = await Inventory.findOneAndUpdate(
    { productId: productId, status: 'active' },
    { quantity: quantity, updatedAt: Date.now() },
    { new: true }
  );

  return inventory;
};

const updateInventory = async ({ productId, quantity, acquisitionPrice }) => {
  return await Inventory.findOneAndUpdate(
    { productId },
    { $set: { quantity, acquisitionPrice } },
    { new: true, upsert: true }
  );
};

const deleteInventory = async id => {
  const inventory = await Inventory.findOneAndUpdate({
    productId: id,
    status: 'deleted',
  });
};

const stockStatus = async () => {
  const stock = await Inventory.aggregate([
    {
      $lookup: {
        from: 'products', // collection name in MongoDB (lowercase plural)
        localField: 'productId',
        foreignField: '_id',
        as: 'product',
      },
    },
    { $unwind: '$product' },
    {
      $project: {
        _id: 0,
        name: '$product.name',
        sku: '$product.sku',
        quantity: 1,
        lowStockThreshold: '$product.lowStockThreshold',
        status: {
          $switch: {
            branches: [
              {
                case: { $lte: ['$quantity', '$product.lowStockThreshold'] },
                then: 'Low Stock',
              },
              {
                case: { $eq: ['$quantity', 0] },
                then: 'Out of Stock',
              },
            ],
            default: 'In Stock',
          },
        },
      },
    },
  ]);

  return { stock }; // labeled as 'stock'
};

const getOrderSummary = async () => {
  // Get current date in PH timezone
  const nowPH = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })
  );

  // Get Monday of this week
  const dayOfWeek = nowPH.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // if Sunday, go back 6 days
  const monday = new Date(nowPH);
  monday.setDate(nowPH.getDate() - diffToMonday);
  monday.setHours(0, 0, 0, 0);

  // Get Sunday of this week
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const summary = await Stock.aggregate([
    {
      $match: {
        isDeleted: false,
        deliveryDate: {
          $gte: monday,
          $lte: sunday,
        },
      },
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalOrdered: { $sum: '$orderQuantity' },
        totalDelivered: { $sum: '$deliveredQuantity' },
      },
    },
  ]);

  const result = {
    pending: { count: 0, totalOrdered: 0, totalDelivered: 0 },
    delivered: { count: 0, totalOrdered: 0, totalDelivered: 0 },
    cancelled: { count: 0, totalOrdered: 0 }, // slightly different format
  };

  summary.forEach(item => {
    if (item._id === 'cancelled') {
      result.cancelled = {
        count: item.count,
        totalOrdered: item.totalOrdered,
      };
    } else {
      result[item._id] = {
        count: item.count,
        totalOrdered: item.totalOrdered,
        totalDelivered: item.totalDelivered,
      };
    }
  });

  return result;
};

const getInventorySummary = async (startDate, endDate) => {
  const dateFilter = {};
  if (startDate || endDate) {
    dateFilter.$and = [];
    if (startDate)
      dateFilter.$and.push({ deliveredDate: { $gte: new Date(startDate) } });
    if (endDate)
      dateFilter.$and.push({ deliveredDate: { $lte: new Date(endDate) } });
  }

  const products = await Product.find({ status: 'active' });

  const summary = await Promise.all(
    products.map(async p => {
      // ✅ Total received
      const receivedAgg = await Stock.aggregate([
        {
          $match: {
            productId: p._id,
            status: 'delivered',
            isDeleted: false,
            ...(dateFilter.$and?.length ? { $and: dateFilter.$and } : {}),
          },
        },
        { $group: { _id: null, total: { $sum: '$deliveredQuantity' } } },
      ]);
      const qtyReceived = receivedAgg[0]?.total || 0;

      // ✅ Total sold
      const soldAgg = await transactionItem.aggregate([
        {
          $match: {
            productId: p._id,
            isDeleted: false,
            isRefunded: false,
            ...(startDate || endDate
              ? {
                  createdAt: {
                    ...(startDate ? { $gte: new Date(startDate) } : {}),
                    ...(endDate ? { $lte: new Date(endDate) } : {}),
                  },
                }
              : {}),
          },
        },
        { $group: { _id: null, total: { $sum: '$quantity' } } },
      ]);
      const qtySold = soldAgg[0]?.total || 0;

      // ✅ Refunds
      const refundAgg = await refund.aggregate([
        {
          $match: {
            productId: p._id,
            isDeleted: false,
            ...(startDate || endDate
              ? {
                  refundedAt: {
                    ...(startDate ? { $gte: new Date(startDate) } : {}),
                    ...(endDate ? { $lte: new Date(endDate) } : {}),
                  },
                }
              : {}),
          },
        },
        { $group: { _id: null, total: { $sum: '$quantity' } } },
      ]);
      const qtyRefunded = refundAgg[0]?.total || 0;

      // ✅ On hand (from InventoryRecord latest before or on endDate, no fallback)
      let qtyOnHand = 0;
      let acquisitionPrice = 0;

      const onHandRecord = await InventoryRecord.findOne({
        productId: p._id,
        ...(endDate
          ? {
              dateRecorded: {
                $lte: new Date(endDate).setHours(23, 59, 59, 999),
              },
            }
          : {}),
      })
        .sort({ dateRecorded: -1 }) // get the latest record
        .exec();

      if (onHandRecord) {
        qtyOnHand = onHandRecord.quantity || 0;
        acquisitionPrice = onHandRecord.acquisitionPrice || 0;
      }
      return {
        productId: p._id,
        productName: p.name,
        qtyReceived,
        qtySold,
        qtyRefunded,
        qtyOnHand,
        acquisitionPrice,
      };
    })
  );

  return summary;
};

// DETAILS: full history for one product
// ✅ Inventory Details
const getInventoryDetails = async (productId, startDate, endDate) => {
  const product = await Product.findById(productId);
  if (!product) return null;

  // 🔹 build date filter for Transactions
  const txnDateFilter = {};
  if (startDate || endDate) {
    txnDateFilter.createdAt = {};
    if (startDate) txnDateFilter.createdAt.$gte = new Date(startDate);
    if (endDate) txnDateFilter.createdAt.$lte = new Date(endDate);
  }

  // 🔹 build date filter for Receives (deliveryDate)
  const receiveDateFilter = {};
  if (startDate || endDate) {
    receiveDateFilter.deliveredDate = {};
    if (startDate) receiveDateFilter.deliveredDate.$gte = new Date(startDate);
    if (endDate) receiveDateFilter.deliveredDate.$lte = new Date(endDate);
  }

  // ✅ Receives (Orders / deliveries) — filter by deliveredDate
  const receives = await Stock.find({
    productId,
    deliveredDate: { $ne: null }, // only consider stocks that were actually delivered
    ...receiveDateFilter,
  })
    .sort({ deliveredDate: 1 })
    .lean();

  // ✅ Solds (filter by Transaction date, not by item)
  const solds = await transactionItem
    .find({ productId, isDeleted: false })
    .populate({
      path: 'transactionId',
      match: txnDateFilter, // filter by parent Transaction createdAt
      select: 'createdAt receiptNum', // keep createdAt + optional receipt reference
    })
    .lean();

  // remove transactionItems whose parent Transaction didn’t match date filter
  const validSolds = solds.filter(s => s.transactionId);

  // ✅ Refunds — only from Refund model, filter by refundedAt
  const refunds = await refund
    .find({
      productId,
      isDeleted: false,
      ...(startDate || endDate
        ? {
            refundedAt: {
              ...(startDate ? { $gte: new Date(startDate) } : {}),
              ...(endDate ? { $lte: new Date(endDate) } : {}),
            },
          }
        : {}),
    })
    .lean();

  return {
    productName: product.name,
    receives: receives.map(r => ({
      product: product.name,
      deliveryDate: r.deliveryDate,
      dateReceived: r.deliveredDate,
      qtyReceived: r.deliveredQuantity,
      supplier: r.supplierName,
    })),
    solds: validSolds.map(s => ({
      dateSold: s.transactionId?.createdAt,
      receiptNum: s.transactionId?.receiptNum || null,
      qtySold: s.quantity,
      totalAmount: Number(s.totalAmount),
    })),
    refunds: refunds.map(r => ({
      product: product.name,
      dateReturned: r.refundedAt,
      qtyReturned: r.quantity,
      reason: r.reason || 'Refund',
    })),
  };
};

export default {
  createInventory,
  getInventoryById,
  updateQuantity,
  deleteInventory,
  getInventoryByProductId,
  updateInventory,
  stockStatus,
  getInventoryDetails,
  getInventorySummary,
  getOrderSummary,
};

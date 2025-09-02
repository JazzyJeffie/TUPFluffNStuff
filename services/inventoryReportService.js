import Inventory from '../models/inventoryModel.js';
import Product from '../models/productModel.js';
import Refund from '../models/refundModel.js';
import StockAdjustment from '../models/stockAdjustment.js';
import Category from '../models/categoryModel.js';
import TransactionItem from '../models/transactionItem.js';
import Transaction from '../models/transactionModel.js';
import Stock from '../models/stockModel.js';
import InventoryRecord from '../models/inventoryRecordModel.js'; // ✅ added
// services/reportService.js
import moment from 'moment-timezone'; // for date handling

/*
export const getInventoryReport = async (fromDate, toDate) => {
  const from = new Date(fromDate);
  const to = new Date(toDate);
  // -----------------------------
  // 1) CURRENT INVENTORY (on hand, sold, damaged, expired, shrinkage, correction, restocked)
  // -----------------------------
  // -----------------------------
  // INVENTORY SUMMARY
  // -----------------------------
  const products = await Product.find({ status: 'active' }).lean();

  const inventoryData = await Promise.all(
    products.map(async p => {
      // 1) On hand
      const inv = await Inventory.findOne({
        productId: p._id,
        status: 'active',
      }).lean();
      const onHand = inv?.quantity || 0;

      // 2) Sold
      const solds = await TransactionItem.aggregate([
        {
          $lookup: {
            from: 'transactions',
            localField: 'transactionId',
            foreignField: '_id',
            as: 'txn',
          },
        },
        { $unwind: '$txn' },
        {
          $match: {
            productId: p._id,
            isDeleted: false,
            'txn.createdAt': { $gte: from, $lte: to },
          },
        },
        { $group: { _id: null, qty: { $sum: '$quantity' } } },
      ]);
      const sold = solds[0]?.qty || 0;

      // 3) Stock adjustments (normalize negatives to positive)
      const adjustments = await StockAdjustment.aggregate([
        {
          $match: {
            product: p._id,
            date: { $gte: from, $lte: to },
          },
        },
        {
          $group: {
            _id: '$reason',
            qty: {
              $sum: {
                $cond: [
                  { $lt: [{ $toDouble: '$change' }, 0] },
                  { $multiply: [{ $toDouble: '$change' }, -1] },
                  { $toDouble: '$change' },
                ],
              },
            },
          },
        },
      ]);

      const adjMap = adjustments.reduce((acc, a) => {
        acc[a._id] = a.qty;
        return acc;
      }, {});

      // 4) Refunds (group by reason)
      const refundsAgg = await Refund.aggregate([
        {
          $match: {
            productId: p._id,
            refundedAt: { $gte: from, $lte: to },
          },
        },
        {
          $group: {
            _id: '$reason',
            qty: { $sum: '$quantity' },
          },
        },
      ]);

      const refundMap = refundsAgg.reduce((acc, r) => {
        acc[r._id] = r.qty;
        return acc;
      }, {});

      // 5) Restocked (from stock deliveries)
      const restocks = await Stock.aggregate([
        {
          $match: {
            productId: p._id,
            status: 'delivered',
            deliveredDate: { $gte: from, $lte: to },
          },
        },
        {
          $group: {
            _id: null,
            qty: { $sum: '$deliveredQuantity' },
          },
        },
      ]);
      const restocked = restocks[0]?.qty || 0;

      // ✅ Merge refunds + adjustments for totals
      const damaged = (adjMap['damaged'] || 0) + (refundMap['damaged'] || 0);
      const expired = (adjMap['expired'] || 0) + (refundMap['expired'] || 0);
      const shrinkage =
        (adjMap['shrinkage'] || 0) + (refundMap['shrinkage'] || 0);
      const correction = adjMap['correction'] || 0; // refunds never have correction

      return {
        product: p.name,
        onHand,
        sold,
        damaged,
        expired,
        shrinkage,
        correction,
        restocked,
      };
    })
  );

  console.log(inventoryData);

  // -----------------------------
  // 2) ORDERS (deliveries)
  // -----------------------------
  const orders = await Stock.find({
    deliveredDate: { $gte: from, $lte: to },
  })
    .populate('productId supplierId')
    .lean();

  const orderTable = orders.map(o => ({
    product: o.productId?.name,
    quantityOrdered: o.orderQuantity,
    quantityReceived: o.deliveredQuantity,
    acquisitionPrice: o.acquisitionPrice,
    supplier: o.supplierName || o.supplierId?.name,
    deliveryDate: o.deliveryDate,
    deliveredDate: o.deliveredDate,
  }));

  // -----------------------------
  // 3) LOW STOCK
  // -----------------------------
  const lowStockRaw = await Inventory.find({ quantity: { $lte: 5 } }).populate(
    'productId'
  );
  const lowStock = lowStockRaw.map(i => ({
    product: i.productId?.name,
    days: Math.ceil((to - i.updatedAt) / (1000 * 60 * 60 * 24)),
  }));

  // -----------------------------
  // 4) REFUNDS + BREAKDOWN
  // -----------------------------
  const refundsRaw = await Refund.find({
    refundedAt: { $gte: from, $lte: to },
  }).populate('productId');

  const refunds = refundsRaw.map(r => ({
    product: r.productId?.name,
    quantity: r.quantity,
    // Convert Decimal128 to Number
    price: parseFloat(r.refundPrice.toString()),
    reason: r.reason,
    refundedAt: r.refundedAt,
  }));

  const refundSummary = refunds.reduce((acc, r) => {
    if (!acc[r.reason]) acc[r.reason] = { qty: 0, total: 0 };
    acc[r.reason].qty += r.quantity;
    acc[r.reason].total += r.price; // now this is a number
    return acc;
  }, {});

  const refundSummaryTable = Object.entries(refundSummary).map(
    ([reason, val]) => ({
      reason,
      quantity: val.qty,
      totalAmount: val.total,
    })
  );

  // -----------------------------
  // 5) SUMMARY VALUES
  // -----------------------------
  const totalInventoryValue = await Inventory.aggregate([
    {
      $group: {
        _id: null,
        value: { $sum: { $multiply: ['$acquisitionPrice', '$quantity'] } },
      },
    },
  ]);

  // 🔹 Total sold from TransactionItem model
  const txnSoldAgg = await TransactionItem.aggregate([
    {
      $lookup: {
        from: 'transactions',
        localField: 'transactionId',
        foreignField: '_id',
        as: 'txn',
      },
    },
    { $unwind: '$txn' },
    {
      $match: {
        isDeleted: false,
        'txn.createdAt': { $gte: from, $lte: to },
      },
    },
    { $group: { _id: null, qty: { $sum: '$quantity' } } },
  ]);
  const totalQuantitySold = txnSoldAgg[0]?.qty || 0;

  // 🔹 Total refunds from Refund model (all quantities)
  const refundAgg = await Refund.aggregate([
    {
      $match: { refundedAt: { $gte: from, $lte: to } },
    },
    { $group: { _id: null, qty: { $sum: '$quantity' } } },
  ]);
  const totalRefunds = refundAgg[0]?.qty || 0;

  return {
    currentInventory: inventoryData,
    orders: orderTable,
    lowStock,
    refunds,
    refundSummary: refundSummaryTable,
    summary: {
      totalInventoryValue: totalInventoryValue[0]?.value || 0,
      totalQuantitySold,
      totalRefunds,
    },
  };
};
*/

// export const getInventoryReport = async (fromDate, toDate) => {
//   const from = new Date(fromDate);
//   const to = new Date(toDate);
//   // end-of-day cap for on-hand snapshot
//   const endOfTo = new Date(new Date(to).setHours(23, 59, 59, 999));

//   // -----------------------------
//   // INVENTORY SUMMARY
//   // -----------------------------
//   const products = await Product.find({ status: 'active' }).lean();

//   const inventoryData = await Promise.all(
//     products.map(async p => {
//       // 1) On hand — use latest InventoryRecord snapshot <= endOfTo
//       let onHand = 0;

//       const onHandRecord = await InventoryRecord.findOne({
//         productId: p._id,
//         dateRecorded: { $lte: endOfTo },
//       })
//         .sort({ dateRecorded: -1 })
//         .select('quantity')
//         .lean();

//       if (onHandRecord) {
//         onHand = onHandRecord.quantity || 0;
//       }

//       // 2) Sold
//       const solds = await TransactionItem.aggregate([
//         {
//           $lookup: {
//             from: 'transactions',
//             localField: 'transactionId',
//             foreignField: '_id',
//             as: 'txn',
//           },
//         },
//         { $unwind: '$txn' },
//         {
//           $match: {
//             productId: p._id,
//             isDeleted: false,
//             'txn.createdAt': { $gte: from, $lte: to },
//           },
//         },
//         { $group: { _id: null, qty: { $sum: '$quantity' } } },
//       ]);
//       const sold = solds[0]?.qty || 0;

//       // 3) Stock adjustments (normalize negatives to positive)
//       const adjustments = await StockAdjustment.aggregate([
//         {
//           $match: {
//             product: p._id,
//             date: { $gte: from, $lte: to },
//           },
//         },
//         {
//           $group: {
//             _id: '$reason',
//             qty: {
//               $sum: {
//                 $cond: [
//                   { $lt: [{ $toDouble: '$change' }, 0] },
//                   { $multiply: [{ $toDouble: '$change' }, -1] },
//                   { $toDouble: '$change' },
//                 ],
//               },
//             },
//           },
//         },
//       ]);

//       const adjMap = adjustments.reduce((acc, a) => {
//         acc[a._id] = a.qty;
//         return acc;
//       }, {});

//       // 4) Refunds (group by reason)
//       const refundsAgg = await Refund.aggregate([
//         {
//           $match: {
//             productId: p._id,
//             refundedAt: { $gte: from, $lte: to },
//           },
//         },
//         {
//           $group: {
//             _id: '$reason',
//             qty: { $sum: '$quantity' },
//           },
//         },
//       ]);

//       const refundMap = refundsAgg.reduce((acc, r) => {
//         acc[r._id] = r.qty;
//         return acc;
//       }, {});

//       // 5) Restocked (from stock deliveries)
//       const restocks = await Stock.aggregate([
//         {
//           $match: {
//             productId: p._id,
//             status: 'delivered',
//             deliveredDate: { $gte: from, $lte: to },
//           },
//         },
//         { $group: { _id: null, qty: { $sum: '$deliveredQuantity' } } },
//       ]);
//       const restocked = restocks[0]?.qty || 0;

//       // ✅ Merge refunds + adjustments for totals
//       const damaged = (adjMap['damaged'] || 0) + (refundMap['damaged'] || 0);
//       const expired = (adjMap['expired'] || 0) + (refundMap['expired'] || 0);
//       const shrinkage =
//         (adjMap['shrinkage'] || 0) + (refundMap['shrinkage'] || 0);
//       const correction = adjMap['correction'] || 0;
//       const customerRequest = refundMap['customer request'] || 0;
//       return {
//         product: p.name,
//         onHand,
//         sold,
//         damaged,
//         expired,
//         shrinkage,
//         correction,
//         restocked,
//         customerRequest,
//       };
//     })
//   );

//   // -----------------------------
//   // ORDERS (deliveries)
//   // -----------------------------
//   const orders = await Stock.find({
//     deliveredDate: { $gte: from, $lte: to },
//   })
//     .populate('productId supplierId')
//     .lean();

//   const orderTable = orders.map(o => ({
//     product: o.productId?.name,
//     quantityOrdered: o.orderQuantity,
//     quantityReceived: o.deliveredQuantity,
//     acquisitionPrice: o.acquisitionPrice,
//     supplier: o.supplierName || o.supplierId?.name,
//     deliveryDate: o.deliveryDate,
//     deliveredDate: o.deliveredDate,
//   }));

//   // -----------------------------
//   // LOW STOCK
//   // -----------------------------
//   const lowStockRaw = await Inventory.find({ quantity: { $lte: 5 } }).populate(
//     'productId'
//   );
//   const lowStock = lowStockRaw.map(i => ({
//     product: i.productId?.name,
//     days: Math.ceil((to - i.updatedAt) / (1000 * 60 * 60 * 24)),
//   }));

//   // -----------------------------
//   // REFUNDS + BREAKDOWN
//   // -----------------------------
//   const refundsRaw = await Refund.find({
//     refundedAt: { $gte: from, $lte: to },
//   }).populate('productId');

//   const refunds = refundsRaw.map(r => ({
//     product: r.productId?.name,
//     quantity: r.quantity,
//     price: parseFloat(r.refundPrice.toString()),
//     reason: r.reason,
//     refundedAt: r.refundedAt,
//   }));

//   const refundSummary = refunds.reduce((acc, r) => {
//     if (!acc[r.reason]) acc[r.reason] = { qty: 0, total: 0 };
//     acc[r.reason].qty += r.quantity;
//     acc[r.reason].total += r.price;
//     return acc;
//   }, {});

//   const refundSummaryTable = Object.entries(refundSummary).map(
//     ([reason, val]) => ({
//       reason,
//       quantity: val.qty,
//       totalAmount: val.total,
//     })
//   );

//   // -----------------------------
//   // SUMMARY VALUES
//   // -----------------------------
//   const totalInventoryValue = await Inventory.aggregate([
//     {
//       $group: {
//         _id: null,
//         value: { $sum: { $multiply: ['$acquisitionPrice', '$quantity'] } },
//       },
//     },
//   ]);

//   const txnSoldAgg = await TransactionItem.aggregate([
//     {
//       $lookup: {
//         from: 'transactions',
//         localField: 'transactionId',
//         foreignField: '_id',
//         as: 'txn',
//       },
//     },
//     { $unwind: '$txn' },
//     { $match: { isDeleted: false, 'txn.createdAt': { $gte: from, $lte: to } } },
//     { $group: { _id: null, qty: { $sum: '$quantity' } } },
//   ]);
//   const totalQuantitySold = txnSoldAgg[0]?.qty || 0;

//   const refundAgg = await Refund.aggregate([
//     { $match: { refundedAt: { $gte: from, $lte: to } } },
//     { $group: { _id: null, qty: { $sum: '$quantity' } } },
//   ]);
//   const totalRefunds = refundAgg[0]?.qty || 0;

//   // -----------------------------
//   // INVENTORY BREAKDOWN (by date filter only)
//   // -----------------------------
//   const inventoryBreakdown = [];

//   for (const product of products) {
//     // fetch all records within the filter range
//     const records = await InventoryRecord.find({
//       productId: product._id,
//       dateRecorded: { $gte: from, $lte: endOfTo },
//     })
//       .sort({ dateRecorded: 1 }) // chronological order
//       .populate('productId')
//       .lean();

//     for (const record of records) {
//       inventoryBreakdown.push({
//         date: moment(record.dateRecorded).format('YYYY-MM-DD'),
//         product: product.name,
//         previousQuantity: record.prevQuantity ?? null,
//         currentQuantity: record.quantity,
//       });
//     }
//   }
//   return {
//     currentInventory: inventoryData,
//     orders: orderTable,
//     lowStock,
//     refunds,
//     refundSummary: refundSummaryTable,
//     inventoryBreakdown,
//     summary: {
//       totalInventoryValue: totalInventoryValue[0]?.value || 0,
//       totalQuantitySold,
//       totalRefunds,
//     },
//   };
// };

export const getInventoryReport = async (fromDate, toDate) => {
  // Convert incoming dates to Manila timezone and start/end of day
  const from = moment.tz(fromDate, 'Asia/Manila').startOf('day').toDate();
  const to = moment.tz(toDate, 'Asia/Manila').endOf('day').toDate();

  let adjustments;
  // -----------------------------
  // INVENTORY SUMMARY
  // -----------------------------
  const products = await Product.find({ status: 'active' }).lean();

  const inventoryData = await Promise.all(
    products.map(async p => {
      // --- On hand (latest snapshot <= endOfTo) ---
      let onHand = 0;
      const onHandRecord = await InventoryRecord.findOne({
        productId: p._id,
        dateRecorded: { $lte: to },
      })
        .sort({ dateRecorded: -1 })
        .select('quantity')
        .lean();
      if (onHandRecord) onHand = onHandRecord.quantity || 0;

      // --- Sold (transactions) ---
      const solds = await TransactionItem.aggregate([
        {
          $lookup: {
            from: 'transactions',
            localField: 'transactionId',
            foreignField: '_id',
            as: 'txn',
          },
        },
        { $unwind: '$txn' },
        {
          $addFields: {
            localDate: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$txn.createdAt',
                timezone: 'Asia/Manila',
              },
            },
          },
        },
        {
          $match: {
            productId: p._id,
            isDeleted: false,
            localDate: {
              $gte: moment(from).format('YYYY-MM-DD'),
              $lte: moment(to).format('YYYY-MM-DD'),
            },
          },
        },
        { $group: { _id: null, qty: { $sum: '$quantity' } } },
      ]);
      const sold = solds[0]?.qty || 0;

      // --- Stock adjustments ---
      adjustments = await StockAdjustment.aggregate([
        {
          $addFields: {
            localDate: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$date',
                timezone: 'Asia/Manila',
              },
            },
          },
        },
        {
          $match: {
            product: p._id,
            localDate: {
              $gte: moment(from).format('YYYY-MM-DD'),
              $lte: moment(to).format('YYYY-MM-DD'),
            },
          },
        },
        {
          $group: {
            _id: '$reason',
            qty: {
              $sum: {
                $cond: [
                  { $lt: [{ $toDouble: '$change' }, 0] },
                  { $multiply: [{ $toDouble: '$change' }, -1] },
                  { $toDouble: '$change' },
                ],
              },
            },
          },
        },
      ]);
      const adjMap = adjustments.reduce((acc, a) => {
        acc[a._id] = a.qty;
        return acc;
      }, {});

      // --- Refunds ---
      const refundsAgg = await Refund.aggregate([
        {
          $addFields: {
            localDate: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$refundedAt',
                timezone: 'Asia/Manila',
              },
            },
          },
        },
        {
          $match: {
            productId: p._id,
            localDate: {
              $gte: moment(from).format('YYYY-MM-DD'),
              $lte: moment(to).format('YYYY-MM-DD'),
            },
          },
        },
        { $group: { _id: '$reason', qty: { $sum: '$quantity' } } },
      ]);
      const refundMap = refundsAgg.reduce((acc, r) => {
        acc[r._id] = r.qty;
        return acc;
      }, {});

      // --- Restocked ---
      const restocks = await Stock.aggregate([
        {
          $addFields: {
            localDate: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$deliveredDate',
                timezone: 'Asia/Manila',
              },
            },
          },
        },
        {
          $match: {
            productId: p._id,
            status: 'delivered',
            localDate: {
              $gte: moment(from).format('YYYY-MM-DD'),
              $lte: moment(to).format('YYYY-MM-DD'),
            },
          },
        },
        { $group: { _id: null, qty: { $sum: '$deliveredQuantity' } } },
      ]);
      const restocked = (restocks[0]?.qty || 0) + (adjMap['restocked'] || 0);

      // --- Merge adjustments + refunds ---
      const damaged = (adjMap['damaged'] || 0) + (refundMap['damaged'] || 0);
      const expired = (adjMap['expired'] || 0) + (refundMap['expired'] || 0);
      const shrinkage =
        (adjMap['shrinkage'] || 0) + (refundMap['shrinkage'] || 0);
      const correction = adjMap['correction'] || 0;
      const customerRequest = refundMap['customer request'] || 0;

      return {
        product: p.name,
        onHand,
        sold,
        damaged,
        expired,
        shrinkage,
        correction,
        restocked,
        customerRequest,
      };
    })
  );

  // --- Stock Adjustment Manual Table ---
const manualTable = await StockAdjustment.aggregate([
  {
    $addFields: {
      localDate: {
        $dateToString: {
          format: '%Y-%m-%d',
          date: '$date',
          timezone: 'Asia/Manila',
        },
      },
    },
  },
  {
    $match: {
      localDate: {
        $gte: moment(from).format('YYYY-MM-DD'),
        $lte: moment(to).format('YYYY-MM-DD'),
      },
    },
  },
  {
    $lookup: {
      from: 'products',
      localField: 'product',
      foreignField: '_id',
      as: 'product',
    },
  },
  { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
  {
    $project: {
      product: '$product.name',
      previousQuantity: 1,
      currentQuantity: '$adjustedQuantity',
      reason: 1,
      note: 1,
      date: '$localDate',
    },
  },
  { $sort: { date: -1 } }, // optional: latest first
]);

  // // --- Orders (deliveries) ---
  // const orders = await Stock.find({
  //   deliveredDate: { $gte: from, $lte: to },
  // })
  //   .populate('productId supplierId')
  //   .lean();

  // --- Orders (deliveries) ---
  const orders = await Stock.aggregate([
    {
      $addFields: {
        localDeliveredDate: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$deliveredDate',
            timezone: 'Asia/Manila',
          },
        },
        localDeliveryDate: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$deliveryDate',
            timezone: 'Asia/Manila',
          },
        },
      },
    },
    {
      $match: {
        status: 'delivered',
        localDeliveredDate: {
          $gte: moment(from).format('YYYY-MM-DD'),
          $lte: moment(to).format('YYYY-MM-DD'),
        },
      },
    },
    {
      $lookup: {
        from: 'products',
        localField: 'productId',
        foreignField: '_id',
        as: 'product',
      },
    },
    { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'suppliers',
        localField: 'supplierId',
        foreignField: '_id',
        as: 'supplier',
      },
    },
    { $unwind: { path: '$supplier', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        product: '$product.name',
        quantityOrdered: '$orderQuantity',
        quantityReceived: '$deliveredQuantity',
        acquisitionPrice: 1,
        supplier: { $ifNull: ['$supplierName', '$supplier.name'] },
        deliveryDate: '$localDeliveryDate',
        deliveredDate: '$localDeliveredDate',
      },
    },
  ]);

  const orderTable = orders;

  // --- Low stock ---

  const lowStockRaw = await Inventory.find({ quantity: { $lte: 5 } }).populate(
    'productId'
  );
  const lowStock = lowStockRaw.map(i => ({
    product: i.productId?.name,
    days: Math.ceil((to - i.updatedAt) / (1000 * 60 * 60 * 24)),
  }));

  // --- Refunds + summary ---
  const refundsRaw = await Refund.find({
    refundedAt: { $gte: from, $lte: to },
  }).populate('productId');

  const refunds = refundsRaw.map(r => ({
    product: r.productId?.name,
    quantity: r.quantity,
    price: parseFloat(r.refundPrice.toString()),
    reason: r.reason,
    refundedAt: r.refundedAt
      ? moment(r.refundedAt).tz('Asia/Manila').format('YYYY-MM-DD')
      : null,
  }));

  const refundSummary = refunds.reduce((acc, r) => {
    if (!acc[r.reason]) acc[r.reason] = { qty: 0, total: 0 };
    acc[r.reason].qty += r.quantity;
    acc[r.reason].total += r.price;
    return acc;
  }, {});
  const refundSummaryTable = Object.entries(refundSummary).map(
    ([reason, val]) => ({
      reason,
      quantity: val.qty,
      totalAmount: val.total,
    })
  );

  // --- Inventory breakdown ---
  const inventoryBreakdown = [];

  for (const product of products) {
    const records = await InventoryRecord.find({
      productId: product._id,
      dateRecorded: { $gte: from, $lte: to },
    })
      .sort({ dateRecorded: 1 })
      .populate('productId')
      .lean();

    for (const record of records) {
      inventoryBreakdown.push({
        date: record.dateRecorded
          ? moment(record.dateRecorded).tz('Asia/Manila').format('YYYY-MM-DD')
          : null,
        product: product.name,
        previousQuantity: record.prevQuantity ?? null,
        currentQuantity: record.quantity,
      });
    }
  }

  // --- Summary values ---
  const totalInventoryValue = await Inventory.aggregate([
    {
      $group: {
        _id: null,
        value: { $sum: { $multiply: ['$acquisitionPrice', '$quantity'] } },
      },
    },
  ]);
  const txnSoldAgg = await TransactionItem.aggregate([
    {
      $lookup: {
        from: 'transactions',
        localField: 'transactionId',
        foreignField: '_id',
        as: 'txn',
      },
    },
    { $unwind: '$txn' },
    {
      $addFields: {
        localDate: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$txn.createdAt',
            timezone: 'Asia/Manila',
          },
        },
      },
    },
    {
      $match: {
        isDeleted: false,
        localDate: {
          $gte: moment(from).format('YYYY-MM-DD'),
          $lte: moment(to).format('YYYY-MM-DD'),
        },
      },
    },
    { $group: { _id: null, qty: { $sum: '$quantity' } } },
  ]);
  const totalQuantitySold = txnSoldAgg[0]?.qty || 0;

  const refundAgg = await Refund.aggregate([
    {
      $addFields: {
        localDate: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$refundedAt',
            timezone: 'Asia/Manila',
          },
        },
      },
    },
    {
      $match: {
        localDate: {
          $gte: moment(from).format('YYYY-MM-DD'),
          $lte: moment(to).format('YYYY-MM-DD'),
        },
      },
    },
    { $group: { _id: null, qty: { $sum: '$quantity' } } },
  ]);
  const totalRefunds = refundAgg[0]?.qty || 0;

  return {
    currentInventory: inventoryData,
    manual: manualTable,
    orders: orderTable,
    lowStock,
    refunds,
    refundSummary: refundSummaryTable,
    inventoryBreakdown,
    summary: {
      totalInventoryValue: totalInventoryValue[0]?.value || 0,
      totalQuantitySold,
      totalRefunds,
    },
  };
};

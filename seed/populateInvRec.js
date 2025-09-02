import mongoose from 'mongoose';
import dotenv from 'dotenv';
import inventoryRecordModel from '../models/inventoryRecordModel.js';

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

const data = [
  {
    productId: '68adc3ac61739e2064aa6a8c',
    inventoryId: '68adc3ac61739e2064aa6a8e',
    quantity: 100,
    prevQuantity: 0,
    acquisitionPrice: 12,
    dateRecorded: '2025-07-01T14:24:44.865Z',
  },
  {
    productId: '68adc3ac61739e2064aa6a8c',
    inventoryId: '68adc3ac61739e2064aa6a8e',
    quantity: 95,
    prevQuantity: 100,
    acquisitionPrice: 12,
    dateRecorded: '2025-07-02T14:24:44.865Z',
  },
  {
    productId: '68adc3ac61739e2064aa6a8c',
    inventoryId: '68adc3ac61739e2064aa6a8e',
    quantity: 90,
    prevQuantity: 95,
    acquisitionPrice: 12,
    dateRecorded: '2025-07-03T14:24:44.865Z',
  },
  {
    productId: '68adc3ac61739e2064aa6a8c',
    inventoryId: '68adc3ac61739e2064aa6a8e',
    quantity: 85,
    prevQuantity: 90,
    acquisitionPrice: 12,
    dateRecorded: '2025-07-04T14:24:44.865Z',
  },
  {
    productId: '68adc3ac61739e2064aa6a8c',
    inventoryId: '68adc3ac61739e2064aa6a8e',
    quantity: 80,
    prevQuantity: 85,
    acquisitionPrice: 12,
    dateRecorded: '2025-07-05T14:24:44.865Z',
  },
  {
    productId: '68adc3ac61739e2064aa6a8c',
    inventoryId: '68adc3ac61739e2064aa6a8e',
    quantity: 75,
    prevQuantity: 80,
    acquisitionPrice: 12,
    dateRecorded: '2025-07-06T14:24:44.865Z',
  },
  {
    productId: '68adc3ac61739e2064aa6a8c',
    inventoryId: '68adc3ac61739e2064aa6a8e',
    quantity: 70,
    prevQuantity: 75,
    acquisitionPrice: 12,
    dateRecorded: '2025-07-07T14:24:44.865Z',
  },
  {
    productId: '68adc3ac61739e2064aa6a8c',
    inventoryId: '68adc3ac61739e2064aa6a8e',
    quantity: 65,
    prevQuantity: 70,
    acquisitionPrice: 12,
    dateRecorded: '2025-07-08T14:24:44.865Z',
  },
  {
    productId: '68adc3ac61739e2064aa6a8c',
    inventoryId: '68adc3ac61739e2064aa6a8e',
    quantity: 60,
    prevQuantity: 65,
    acquisitionPrice: 12,
    dateRecorded: '2025-07-09T14:24:44.865Z',
  },
  {
    productId: '68adc3ac61739e2064aa6a8c',
    inventoryId: '68adc3ac61739e2064aa6a8e',
    quantity: 53,
    prevQuantity: 60,
    acquisitionPrice: 12,
    dateRecorded: '2025-07-10T14:24:44.865Z',
  },

  // JULY 11
  {
    productId: '68adc3ac61739e2064aa6a8c',
    inventoryId: '68adc3ac61739e2064aa6a8e',
    quantity: 49,
    prevQuantity: 53,
    acquisitionPrice: 12,
    dateRecorded: '2025-07-11T14:24:44.865Z',
  },
  {
    productId: '68adc3ac61739e2064aa6a8c',
    inventoryId: '68adc3ac61739e2064aa6a8e',
    quantity: 44,
    prevQuantity: 49,
    acquisitionPrice: 12,
    dateRecorded: '2025-07-12T14:24:44.865Z',
  },
  {
    productId: '68adc3ac61739e2064aa6a8c',
    inventoryId: '68adc3ac61739e2064aa6a8e',
    quantity: 40,
    prevQuantity: 44,
    acquisitionPrice: 12,
    dateRecorded: '2025-07-13T14:24:44.865Z',
  },
  {
    productId: '68adc3ac61739e2064aa6a8c',
    inventoryId: '68adc3ac61739e2064aa6a8e',
    quantity: 35,
    prevQuantity: 40,
    acquisitionPrice: 12,
    dateRecorded: '2025-07-14T14:24:44.865Z',
  },
  {
    productId: '68adc3ac61739e2064aa6a8c',
    inventoryId: '68adc3ac61739e2064aa6a8e',
    quantity: 30,
    prevQuantity: 35,
    acquisitionPrice: 12,
    dateRecorded: '2025-07-15T14:24:44.865Z',
  },
  {
    productId: '68adc3ac61739e2064aa6a8c',
    inventoryId: '68adc3ac61739e2064aa6a8e',
    quantity: 25,
    prevQuantity: 30,
    acquisitionPrice: 12,
    dateRecorded: '2025-07-16T14:24:44.865Z',
  },
  {
    productId: '68adc3ac61739e2064aa6a8c',
    inventoryId: '68adc3ac61739e2064aa6a8e',
    quantity: 20,
    prevQuantity: 25,
    acquisitionPrice: 12,
    dateRecorded: '2025-07-17T14:24:44.865Z',
  },
  {
    productId: '68adc3ac61739e2064aa6a8c',
    inventoryId: '68adc3ac61739e2064aa6a8e',
    quantity: 15,
    prevQuantity: 20,
    acquisitionPrice: 12,
    dateRecorded: '2025-07-18T14:24:44.865Z',
  },
  {
    productId: '68adc3ac61739e2064aa6a8c',
    inventoryId: '68adc3ac61739e2064aa6a8e',
    quantity: 10,
    prevQuantity: 15,
    acquisitionPrice: 12,
    dateRecorded: '2025-07-19T14:24:44.865Z',
  },
  {
    productId: '68adc3ac61739e2064aa6a8c',
    inventoryId: '68adc3ac61739e2064aa6a8e',
    quantity: 0,
    prevQuantity: 10,
    acquisitionPrice: 12,
    dateRecorded: '2025-07-20T14:24:44.865Z',
  },

  //july 21
  {
    productId: '68adc3ac61739e2064aa6a8c',
    inventoryId: '68adc3ac61739e2064aa6a8e',
    quantity: 100,
    prevQuantity: 0,
    acquisitionPrice: 12,
    dateRecorded: '2025-07-21T14:24:44.865Z',
  },
  {
    productId: '68adc3ac61739e2064aa6a8c',
    inventoryId: '68adc3ac61739e2064aa6a8e',
    quantity: 90,
    prevQuantity: 100,
    acquisitionPrice: 12,
    dateRecorded: '2025-07-22T14:24:44.865Z',
  },
  {
    productId: '68adc3ac61739e2064aa6a8c',
    inventoryId: '68adc3ac61739e2064aa6a8e',
    quantity: 80,
    prevQuantity: 90,
    acquisitionPrice: 12,
    dateRecorded: '2025-07-23T14:24:44.865Z',
  },
  {
    productId: '68adc3ac61739e2064aa6a8c',
    inventoryId: '68adc3ac61739e2064aa6a8e',
    quantity: 75,
    prevQuantity: 80,
    acquisitionPrice: 12,
    dateRecorded: '2025-07-24T14:24:44.865Z',
  },
  {
    productId: '68adc3ac61739e2064aa6a8c',
    inventoryId: '68adc3ac61739e2064aa6a8e',
    quantity: 70,
    prevQuantity: 75,
    acquisitionPrice: 12,
    dateRecorded: '2025-07-25T14:24:44.865Z',
  },
  {
    productId: '68adc3ac61739e2064aa6a8c',
    inventoryId: '68adc3ac61739e2064aa6a8e',
    quantity: 60,
    prevQuantity: 70,
    acquisitionPrice: 12,
    dateRecorded: '2025-07-26T14:24:44.865Z',
  },
  {
    productId: '68adc3ac61739e2064aa6a8c',
    inventoryId: '68adc3ac61739e2064aa6a8e',
    quantity: 45,
    prevQuantity: 60,
    acquisitionPrice: 12,
    dateRecorded: '2025-07-27T14:24:44.865Z',
  },
  {
    productId: '68adc3ac61739e2064aa6a8c',
    inventoryId: '68adc3ac61739e2064aa6a8e',
    quantity: 30,
    prevQuantity: 45,
    acquisitionPrice: 12,
    dateRecorded: '2025-07-28T14:24:44.865Z',
  },
  {
    productId: '68adc3ac61739e2064aa6a8c',
    inventoryId: '68adc3ac61739e2064aa6a8e',
    quantity: 20,
    prevQuantity: 30,
    acquisitionPrice: 12,
    dateRecorded: '2025-07-29T14:24:44.865Z',
  },
  {
    productId: '68adc3ac61739e2064aa6a8c',
    inventoryId: '68adc3ac61739e2064aa6a8e',
    quantity: 10,
    prevQuantity: 20,
    acquisitionPrice: 12,
    dateRecorded: '2025-07-30T14:24:44.865Z',
  },
  {
    productId: '68adc3ac61739e2064aa6a8c',
    inventoryId: '68adc3ac61739e2064aa6a8e',
    quantity: 0,
    prevQuantity: 10,
    acquisitionPrice: 12,
    dateRecorded: '2025-07-31T14:24:44.865Z',
  },

  //AUG 1
  {
    productId: '68adc3ac61739e2064aa6a8c',
    inventoryId: '68adc3ac61739e2064aa6a8e',
    quantity: 50,
    prevQuantity: 0,
    acquisitionPrice: 12,
    dateRecorded: '2025-08-01T14:24:44.865Z',
  },
  {
    productId: '68adc3ac61739e2064aa6a8c',
    inventoryId: '68adc3ac61739e2064aa6a8e',
    quantity: 45,
    prevQuantity: 50,
    acquisitionPrice: 12,
    dateRecorded: '2025-08-02T14:24:44.865Z',
  },
  {
    productId: '68adc3ac61739e2064aa6a8c',
    inventoryId: '68adc3ac61739e2064aa6a8e',
    quantity: 40,
    prevQuantity: 45,
    acquisitionPrice: 12,
    dateRecorded: '2025-08-03T14:24:44.865Z',
  },
  {
    productId: '68adc3ac61739e2064aa6a8c',
    inventoryId: '68adc3ac61739e2064aa6a8e',
    quantity: 35,
    prevQuantity: 40,
    acquisitionPrice: 12,
    dateRecorded: '2025-08-04T14:24:44.865Z',
  },
  {
    productId: '68adc3ac61739e2064aa6a8c',
    inventoryId: '68adc3ac61739e2064aa6a8e',
    quantity: 30,
    prevQuantity: 35,
    acquisitionPrice: 12,
    dateRecorded: '2025-08-05T14:24:44.865Z',
  },
  {
    productId: '68adc3ac61739e2064aa6a8c',
    inventoryId: '68adc3ac61739e2064aa6a8e',
    quantity: 25,
    prevQuantity: 30,
    acquisitionPrice: 12,
    dateRecorded: '2025-08-06T14:24:44.865Z',
  },
  {
    productId: '68adc3ac61739e2064aa6a8c',
    inventoryId: '68adc3ac61739e2064aa6a8e',
    quantity: 20,
    prevQuantity: 25,
    acquisitionPrice: 12,
    dateRecorded: '2025-08-07T14:24:44.865Z',
  },
  {
    productId: '68adc3ac61739e2064aa6a8c',
    inventoryId: '68adc3ac61739e2064aa6a8e',
    quantity: 15,
    prevQuantity: 20,
    acquisitionPrice: 12,
    dateRecorded: '2025-08-08T14:24:44.865Z',
  },
  {
    productId: '68adc3ac61739e2064aa6a8c',
    inventoryId: '68adc3ac61739e2064aa6a8e',
    quantity: 10,
    prevQuantity: 15,
    acquisitionPrice: 12,
    dateRecorded: '2025-08-09T14:24:44.865Z',
  },
  {
    productId: '68adc3ac61739e2064aa6a8c',
    inventoryId: '68adc3ac61739e2064aa6a8e',
    quantity: 0,
    prevQuantity: 10,
    acquisitionPrice: 12,
    dateRecorded: '2025-08-10T14:24:44.865Z',
  },

  // AUG 11
  {
    productId: '68adc3ac61739e2064aa6a8c',
    inventoryId: '68adc3ac61739e2064aa6a8e',
    quantity: 40,
    prevQuantity: 0,
    acquisitionPrice: 12,
    dateRecorded: '2025-08-11T14:24:44.865Z',
  },
  {
    productId: '68adc3ac61739e2064aa6a8c',
    inventoryId: '68adc3ac61739e2064aa6a8e',
    quantity: 37,
    prevQuantity: 40,
    acquisitionPrice: 12,
    dateRecorded: '2025-08-12T14:24:44.865Z',
  },
  {
    productId: '68adc3ac61739e2064aa6a8c',
    inventoryId: '68adc3ac61739e2064aa6a8e',
    quantity: 35,
    prevQuantity: 37,
    acquisitionPrice: 12,
    dateRecorded: '2025-08-13T14:24:44.865Z',
  },
  {
    productId: '68adc3ac61739e2064aa6a8c',
    inventoryId: '68adc3ac61739e2064aa6a8e',
    quantity: 30,
    prevQuantity: 35,
    acquisitionPrice: 12,
    dateRecorded: '2025-08-14T14:24:44.865Z',
  },
  {
    productId: '68adc3ac61739e2064aa6a8c',
    inventoryId: '68adc3ac61739e2064aa6a8e',
    quantity: 26,
    prevQuantity: 30,
    acquisitionPrice: 12,
    dateRecorded: '2025-08-15T14:24:44.865Z',
  },
  {
    productId: '68adc3ac61739e2064aa6a8c',
    inventoryId: '68adc3ac61739e2064aa6a8e',
    quantity: 24,
    prevQuantity: 26,
    acquisitionPrice: 12,
    dateRecorded: '2025-08-16T14:24:44.865Z',
  },
  {
    productId: '68adc3ac61739e2064aa6a8c',
    inventoryId: '68adc3ac61739e2064aa6a8e',
    quantity: 22,
    prevQuantity: 24,
    acquisitionPrice: 12,
    dateRecorded: '2025-08-17T14:24:44.865Z',
  },
  {
    productId: '68adc3ac61739e2064aa6a8c',
    inventoryId: '68adc3ac61739e2064aa6a8e',
    quantity: 20,
    prevQuantity: 22,
    acquisitionPrice: 12,
    dateRecorded: '2025-08-18T14:24:44.865Z',
  },
  {
    productId: '68adc3ac61739e2064aa6a8c',
    inventoryId: '68adc3ac61739e2064aa6a8e',
    quantity: 18,
    prevQuantity: 20,
    acquisitionPrice: 12,
    dateRecorded: '2025-08-19T14:24:44.865Z',
  },
  {
    productId: '68adc3ac61739e2064aa6a8c',
    inventoryId: '68adc3ac61739e2064aa6a8e',
    quantity: 16,
    prevQuantity: 18,
    acquisitionPrice: 12,
    dateRecorded: '2025-08-20T14:24:44.865Z',
  },

  // AUG 21
  {
    productId: '68adc3ac61739e2064aa6a8c',
    inventoryId: '68adc3ac61739e2064aa6a8e',
    quantity: 14,
    prevQuantity: 16,
    acquisitionPrice: 12,
    dateRecorded: '2025-08-21T14:24:44.865Z',
  },
  {
    productId: '68adc3ac61739e2064aa6a8c',
    inventoryId: '68adc3ac61739e2064aa6a8e',
    quantity: 10,
    prevQuantity: 14,
    acquisitionPrice: 12,
    dateRecorded: '2025-08-22T14:24:44.865Z',
  },
  {
    productId: '68adc3ac61739e2064aa6a8c',
    inventoryId: '68adc3ac61739e2064aa6a8e',
    quantity: 8,
    prevQuantity: 10,
    acquisitionPrice: 12,
    dateRecorded: '2025-08-23T14:24:44.865Z',
  },
  {
    productId: '68adc3ac61739e2064aa6a8c',
    inventoryId: '68adc3ac61739e2064aa6a8e',
    quantity: 6,
    prevQuantity: 8,
    acquisitionPrice: 12,
    dateRecorded: '2025-08-24T14:24:44.865Z',
  },
  {
    productId: '68adc3ac61739e2064aa6a8c',
    inventoryId: '68adc3ac61739e2064aa6a8e',
    quantity: 0,
    prevQuantity: 6,
    acquisitionPrice: 12,
    dateRecorded: '2025-08-25T14:24:44.865Z',
  },
];

async function insertInventoryRecords() {
  await connectDB();

  try {
    const inserted = await inventoryRecordModel.insertMany(data);
    console.log(`Inserted ${inserted.length} inventory records ✅`);
  } catch (err) {
    console.error('Error inserting inventory records:', err);
  } finally {
    mongoose.disconnect();
  }
}

insertInventoryRecords();

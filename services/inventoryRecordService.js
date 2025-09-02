// services/inventoryRecordService.js
import inventoryModel from '../models/inventoryModel.js';
import Inventory from '../models/inventoryModel.js';
import InventoryRecord from '../models/inventoryRecordModel.js';

export const recordDailyInventory = async () => {
  try {
    // Get all active inventory items
    const inventories = await Inventory.find({ status: 'active' });

    if (inventories.length === 0)
      return { message: 'No active inventory found' };

    const records = inventories.map(inv => ({
      productId: inv.productId,
      inventoryId: inv._id,
      quantity: inv.quantity,
      prevQuantity: inv.quantity,
      acquisitionPrice: inv.acquisitionPrice,
      dateRecorded: new Date(),
    }));

    await InventoryRecord.insertMany(records);
    return {
      message: 'Daily inventory recorded successfully',
      count: records.length,
    };
  } catch (error) {
    throw new Error(error.message);
  }
};

export const recordInitialProduct = async data => {
  const product = await inventoryModel.create({
    productId: data.productId,
    inventoryId: data.inventoryId,
    quantity: data.quantity,
    acquisitionPrice: data.acquisitionPrice,
    prevQuantity: data.prevQuantity,
  });

  return product;
};

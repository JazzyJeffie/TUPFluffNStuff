import inventoryRecordModel from '../models/inventoryRecordModel.js';

export const recordInitialProduct = async data => {
  const product = await inventoryRecordModel.create({
    productId: data.productId,
    inventoryId: data.inventoryId,
    quantity: data.quantity,
    acquisitionPrice: data.acquisitionPrice,
    prevQuantity: data.prevQuantity,
  });

  return product;
};

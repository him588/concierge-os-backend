import { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler";
import { ServiceItem } from "../models/service-item.model";
import { Service } from "../models/service.model";
import {
  createServiceItemSchema,
  updateServiceItemSchema,
} from "../validators/service-item.validator";
import { ZodError } from "zod";

async function createServiceItem(req: Request, res: Response) {
  const hotelId = req.user?.hotelId;

  if (!hotelId) {
    return res.status(401).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  const itemData = {
    ...req.body,
    hotelId,
  };

  createServiceItemSchema.parse(itemData);

  // Verify service exists and belongs to hotel
  const service = await Service.findOne({
    _id: itemData.serviceId,
    hotelId,
    isActive: true,
  });

  if (!service) {
    return res.status(404).json({
      success: false,
      message: "Service not found or inactive",
    });
  }

  // Check for duplicate item name in same service
  const existingItem = await ServiceItem.findOne({
    serviceId: itemData.serviceId,
    name: itemData.name,
  });

  if (existingItem) {
    return res.status(409).json({
      success: false,
      message: "Service item with this name already exists for this service",
    });
  }

  const serviceItem = await ServiceItem.create(itemData);

  return res.status(201).json({
    success: true,
    message: "Service item created successfully",
    data: serviceItem,
  });
}

async function getServiceItems(req: Request, res: Response) {
  const hotelId = req.user?.hotelId;
  const { serviceId, isAvailable } = req.query;

  if (!hotelId) {
    return res.status(401).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  const filter: any = { hotelId };

  if (serviceId) {
    filter.serviceId = serviceId;
  }

  if (isAvailable !== undefined) {
    filter.isAvailable = isAvailable === "true";
  }

  const items = await ServiceItem.find(filter)
    .populate({
      path: "serviceId",
      select: "name description",
    })
    .sort({ createdAt: -1 })
    .select("-__v");

  return res.status(200).json({
    success: true,
    message: "Service items fetched successfully",
    data: items,
  });
}

async function getServiceItemById(req: Request, res: Response) {
  const { id } = req.params;
  const hotelId = req.user?.hotelId;

  if (!hotelId) {
    return res.status(401).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  const item = await ServiceItem.findOne({ _id: id, hotelId }).populate({
    path: "serviceId",
    select: "name description",
  });

  if (!item) {
    return res.status(404).json({
      success: false,
      message: "Service item not found",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Service item fetched successfully",
    data: item,
  });
}

async function updateServiceItem(req: Request, res: Response) {
  const { id } = req.params;
  const hotelId = req.user?.hotelId;

  if (!hotelId) {
    return res.status(401).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  const updateData = updateServiceItemSchema.parse(req.body);

  // If updating name, check for duplicates
  if (updateData.name) {
    const existingItem = await ServiceItem.findOne({
      _id: { $ne: id },
      serviceId: (await ServiceItem.findById(id))?.serviceId,
      name: updateData.name,
    });

    if (existingItem) {
      return res.status(409).json({
        success: false,
        message: "Service item with this name already exists for this service",
      });
    }
  }

  // Recompute isFree if price is being updated
  if (updateData.price !== undefined) {
    updateData.isAutoIncluded = updateData.price === 0;
    // If price > 0, isAutoIncluded must be false
    if (updateData.price > 0) {
      updateData.isAutoIncluded = false;
    }
  }

  const item = await ServiceItem.findOneAndUpdate(
    { _id: id, hotelId },
    { $set: updateData },
    { new: true, runValidators: true },
  );

  if (!item) {
    return res.status(404).json({
      success: false,
      message: "Service item not found",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Service item updated successfully",
    data: item,
  });
}

async function deleteServiceItem(req: Request, res: Response) {
  const { id } = req.params;
  const hotelId = req.user?.hotelId;

  if (!hotelId) {
    return res.status(401).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  // Soft delete by setting isAvailable to false
  const item = await ServiceItem.findOneAndUpdate(
    { _id: id, hotelId },
    { $set: { isAvailable: false } },
    { new: true },
  );

  if (!item) {
    return res.status(404).json({
      success: false,
      message: "Service item not found",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Service item deleted successfully",
  });
}

export const createServiceItemHandler = asyncHandler(createServiceItem);
export const getServiceItemsHandler = asyncHandler(getServiceItems);
export const getServiceItemByIdHandler = asyncHandler(getServiceItemById);
export const updateServiceItemHandler = asyncHandler(updateServiceItem);
export const deleteServiceItemHandler = asyncHandler(deleteServiceItem);

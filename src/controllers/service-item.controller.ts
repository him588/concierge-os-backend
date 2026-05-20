import { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler";
import { ServiceItem } from "../models/service-item.model";
import { Service } from "../models/service.model";
import {
  createServiceItemSchema,
  updateServiceItemSchema,
} from "../validators/service-item.validator";
import { ZodError } from "zod";
import { handleZodError } from "../utils/zod-handler";

async function createServiceItem(req: Request, res: Response) {
  console.log("create sercice item playload");
  const hotelId = req.user?.hotelId;

  if (!hotelId) {
    return res.status(401).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  console.log(req.body.name);
  const validatePayload = createServiceItemSchema.safeParse({
    ...req.body,
    hotelId,
  });
  console.log("validated payload", validatePayload.data);
  if (!validatePayload.success) {
    const error = handleZodError(validatePayload.error);
    return res.status(400).json({ status: false, message: error });
  }

  // Verify service exists and belongs to hotel
  const service = await Service.findOne({
    _id: validatePayload.data.serviceId,
    hotelId,
  });

  if (!service) {
    return res.status(404).json({
      success: false,
      message: "Service not found or inactive",
    });
  }

  // Check for duplicate item name in same service
  const existingItem = await ServiceItem.findOne({
    serviceId: validatePayload.data.serviceId,
    name: validatePayload.data.name,
  });

  if (existingItem) {
    return res.status(409).json({
      success: false,
      message: "Service item with this name already exists for this service",
    });
  }

  const serviceItem = await ServiceItem.create(validatePayload.data);

  return res.status(201).json({
    success: true,
    message: "Service item created successfully",
    data: serviceItem,
  });
}

async function getServiceItems(req: Request, res: Response) {
  const hotelId = req.user?.hotelId;
  const { serviceItem: serviceId } = req.query;
  console.log("serviceId", serviceId);

  if (!hotelId) {
    return res.status(400).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  if (!serviceId) {
    return res.status(400).json({
      success: false,
      message: "Service ID is required",
    });
  }

  const filter: any = { hotelId };

  if (serviceId) {
    filter.serviceId = serviceId;
  }

  console.log({ filter });

  const items = await ServiceItem.find(filter)
    .populate({
      path: "serviceId",
      select: "name description",
    })
    .sort({ createdAt: -1 })
    .select("-__v -createdAt -updatedAt -hotelId -serviceId");

  return res.status(200).json({
    success: true,
    message: "Service items fetched successfully",
    subServices: items,
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
  if (!id) {
    return res.status(401).json({
      success: false,
      message: "Service item id is required",
    });
  }
  const { markUnavailable } = req.body;
  if (typeof markUnavailable !== "boolean") {
    return res.status(400).json({
      message: "Required boolean value for markunavailabe",
    });
  }

  const item = await ServiceItem.findOneAndUpdate(
    { _id: id, hotelId },
    { $set: { isAvailable: markUnavailable } },
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
  const item = await ServiceItem.findOneAndDelete({ _id: id, hotelId });

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

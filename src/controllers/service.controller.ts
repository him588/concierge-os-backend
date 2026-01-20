import { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler";
import { Service } from "../models/service.model";
import {
  createServiceSchema,
  updateServiceSchema,
} from "../validators/service.validator";
import { ZodError } from "zod";

async function createService(req: Request, res: Response) {
  const hotelId = req.user?.hotelId;

  if (!hotelId) {
    return res.status(401).json({
      success: false,
      message: "Hotel ID is required. Please ensure you own a property.",
    });
  }

  const serviceData = {
    ...req.body,
    hotelId,
  };

  createServiceSchema.parse(serviceData);

  // Check for duplicate service name
  const existingService = await Service.findOne({
    hotelId,
    name: serviceData.name,
  });

  if (existingService) {
    return res.status(409).json({
      success: false,
      message: "Service with this name already exists for this hotel",
    });
  }

  const service = await Service.create(serviceData);

  return res.status(201).json({
    success: true,
    message: "Service created successfully",
    data: service,
  });
}

async function getServices(req: Request, res: Response) {
  const hotelId = req.user?.hotelId;

  if (!hotelId) {
    return res.status(401).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  const { isActive } = req.query;
  const filter: any = { hotelId };

  if (isActive !== undefined) {
    filter.isActive = isActive === "true";
  }

  const services = await Service.find(filter)
    .sort({ createdAt: -1 })
    .select("-__v");

  return res.status(200).json({
    success: true,
    message: "Services fetched successfully",
    services,
  });
}

async function getServiceById(req: Request, res: Response) {
  const { id } = req.params;
  const hotelId = req.user?.hotelId;

  if (!hotelId) {
    return res.status(401).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  const service = await Service.findOne({ _id: id, hotelId });

  if (!service) {
    return res.status(404).json({
      success: false,
      message: "Service not found",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Service fetched successfully",
    data: service,
  });
}

async function updateService(req: Request, res: Response) {
  const { id } = req.params;
  const hotelId = req.user?.hotelId;

  if (!hotelId) {
    return res.status(401).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  const updateData = updateServiceSchema.parse(req.body);

  // If updating name, check for duplicates
  if (updateData.name) {
    const existingService = await Service.findOne({
      _id: { $ne: id },
      hotelId,
      name: updateData.name,
    });

    if (existingService) {
      return res.status(409).json({
        success: false,
        message: "Service with this name already exists for this hotel",
      });
    }
  }

  const service = await Service.findOneAndUpdate(
    { _id: id, hotelId },
    { $set: updateData },
    { new: true, runValidators: true },
  );

  if (!service) {
    return res.status(404).json({
      success: false,
      message: "Service not found",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Service updated successfully",
    data: service,
  });
}

async function deleteService(req: Request, res: Response) {
  const { id } = req.params;
  const hotelId = req.user?.hotelId;

  if (!hotelId) {
    return res.status(401).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  // Soft delete by setting isActive to false
  const service = await Service.findOneAndUpdate(
    { _id: id, hotelId },
    { $set: { isActive: false } },
    { new: true },
  );

  if (!service) {
    return res.status(404).json({
      success: false,
      message: "Service not found",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Service deleted successfully",
  });
}

export const createServiceHandler = asyncHandler(createService);
export const getServicesHandler = asyncHandler(getServices);
export const getServiceByIdHandler = asyncHandler(getServiceById);
export const updateServiceHandler = asyncHandler(updateService);
export const deleteServiceHandler = asyncHandler(deleteService);

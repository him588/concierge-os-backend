import { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler";
import { Service } from "../models/service.model";
import { Staff } from "../models/staff.model";
import {
  createServiceSchema,
  updateServiceSchema,
} from "../validators/service.validator";
import { ServiceItem } from "../models/service-item.model";
import { StaffServiceMapping } from "../models/staff-service-mapping.model";

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

  const isStaffAvailable = await Staff.findOne({
    hotelId,
    isAvailable: true,
  });

  if (!isStaffAvailable) {
    return res.status(400).json({
      success: false,
      message: "No staff is available to create a service",
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

  const [subServices, staffServiceMapping, services] = await Promise.all([
    ServiceItem.find({ hotelId }),
    StaffServiceMapping.find({ hotelId }),
    Service.find({ hotelId }).sort({ createdAt: -1 }).select("-__v").lean(),
  ]);

  const response = services.map((item) => {
    const staffCount = staffServiceMapping.filter(
      (mapping) => mapping.serviceId.toString() === item._id.toString(),
    ).length;
    const servicesCount = subServices.filter(
      (sub) => sub.serviceId.toString() === item._id.toString(),
    ).length;

    const newObj = {
      id: item._id,
      name: item.name,
      color: item.color,
      description: item.description,
      status: item.isActive,
      staffAssigned: staffCount,
      subServices: servicesCount,
    };
    return newObj;
  });

  console.log(response);

  return res.status(200).json({
    success: true,
    message: "Services fetched successfully",
    services: response,
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

  const [staff, subServices, service] = await Promise.all([
    StaffServiceMapping.find({ serviceId: id, hotelId })
      .select("-__V -createdAt -updatedAt")
      .populate("staffId"),
    ServiceItem.find({ serviceId: id, hotelId }),
    Service.findOne({ _id: id, hotelId }),
  ]);

  if (!service) {
    return res.status(404).json({
      success: false,
      message: "Service not found",
    });
  }

  const response = {
    serviceName: service?.name,
    color: service?.color,
    serviceId: service?.id,
    staffList: staff || [],
    subServices: subServices || [],
  };

  // const service = await Service.findOne({ _id: id, hotelId });

  return res.status(200).json({
    success: true,
    message: "Service fetched successfully",
    serviceDetails: response,
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

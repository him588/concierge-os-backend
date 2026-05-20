import { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler";
import { StaffServiceMapping } from "../models/staff-service-mapping.model";
import { Staff } from "../models/staff.model";
import { Service } from "../models/service.model";
import {
  createStaffServiceMappingSchema,
  updateStaffServiceMappingSchema,
} from "../validators/staff-service-mapping.validator";
import mongoose from "mongoose";

async function createStaffServiceMapping(req: Request, res: Response) {
  const hotelId = req.user?.hotelId;

  if (!hotelId) {
    return res.status(401).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  const mappingData = {
    ...req.body,
    hotelId,
  };

  createStaffServiceMappingSchema.parse(mappingData);

  // Verify staff exists and belongs to hotel
  const staff = await Staff.findOne({
    _id: mappingData.staffId,
    hotelId,
  });

  if (!staff) {
    return res.status(404).json({
      success: false,
      message: "Staff not found or inactive",
    });
  }

  // Verify service exists and belongs to hotel
  const service = await Service.findOne({
    _id: mappingData.serviceId,
    hotelId,
  });

  if (!service) {
    return res.status(404).json({
      success: false,
      message: "Service not found or inactive",
    });
  }

  // Check for existing mapping
  const existingMapping = await StaffServiceMapping.findOne({
    staffId: mappingData.staffId,
    serviceId: mappingData.serviceId,
  });

  if (existingMapping) {
    // If exists but inactive, reactivate it
    if (!existingMapping.isActive) {
      existingMapping.isActive = true;
      await existingMapping.save();
      return res.status(200).json({
        success: true,
        message: "Staff-service mapping reactivated successfully",
        data: existingMapping,
      });
    }

    return res.status(409).json({
      success: false,
      message: "Staff-service mapping already exists",
    });
  }

  const mapping = await StaffServiceMapping.create(mappingData);
  await StaffServiceMapping.updateMany(
    {
      hotelId,
      serviceId: mappingData.serviceId,
    },
    { $set: { serviceCount: 0 } },
  );

  const populatedMapping = await StaffServiceMapping.findById(mapping._id)
    .populate({ path: "staffId", select: "name email" })
    .populate({ path: "serviceId", select: "name description" });

  return res.status(201).json({
    success: true,
    message: "Staff-service mapping created successfully",
    data: populatedMapping,
  });
}

async function getStaffServiceMappings(req: Request, res: Response) {
  const hotelId = req.user?.hotelId;
  const { id } = req.params;

  if (!hotelId) {
    return res.status(401).json({
      success: false,
      message: "Hotel ID is required",
    });
  }
  if (!id) {
    return res.status(401).json({
      success: false,
      message: "Service ID is required",
    });
  }

  const mappings = await StaffServiceMapping.find({
    serviceId: new mongoose.Types.ObjectId(id),
  })
    .populate({ path: "staffId", select: "name email isAvailable" })
    .populate({ path: "serviceId", select: "name description" })
    .sort({ createdAt: -1 })
    .select("-__v");

  console.log("staff linked to service", mappings);

  return res.status(200).json({
    success: true,
    message: "Staff-service mappings fetched successfully",
    data: mappings,
  });
}

async function updateStaffServiceMapping(req: Request, res: Response) {
  const { id } = req.params;
  const hotelId = req.user?.hotelId;

  if (!hotelId) {
    return res.status(401).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  const updateData = updateStaffServiceMappingSchema.parse(req.body);

  const mapping = await StaffServiceMapping.findOneAndUpdate(
    { _id: id, hotelId },
    { $set: updateData },
    { new: true, runValidators: true },
  )
    .populate({ path: "staffId", select: "name email" })
    .populate({ path: "serviceId", select: "name description" });

  if (!mapping) {
    return res.status(404).json({
      success: false,
      message: "Staff-service mapping not found",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Staff-service mapping updated successfully",
    data: mapping,
  });
}

async function deleteStaffServiceMapping(req: Request, res: Response) {
  const { staffId, serviceId } = req.query;
  const hotelId = req.user?.hotelId;
  if (!staffId || !serviceId) {
    return res.status(400).json({
      success: false,
      message: "Staff ID and Service ID are required",
    });
  }

  if (!hotelId) {
    return res.status(401).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  // Soft delete by setting isActive to false
  const mapping = await StaffServiceMapping.deleteOne({
    staffId,
    serviceId,
    hotelId,
  });

  if (!mapping) {
    return res.status(404).json({
      success: false,
      message: "Staff-service mapping not found",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Staff-service mapping deleted successfully",
  });
}

export const createStaffServiceMappingHandler = asyncHandler(
  createStaffServiceMapping,
);
export const getStaffServiceMappingsHandler = asyncHandler(
  getStaffServiceMappings,
);
export const updateStaffServiceMappingHandler = asyncHandler(
  updateStaffServiceMapping,
);
export const deleteStaffServiceMappingHandler = asyncHandler(
  deleteStaffServiceMapping,
);

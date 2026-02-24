import { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler";
import { Staff } from "../models/staff.model";
import { StaffServiceMapping } from "../models/staff-service-mapping.model";
import {
  createStaffSchema,
  updateStaffSchema,
} from "../validators/staff.validator";
import { User } from "../models/user.model";

async function createStaff(req: Request, res: Response) {
  const hotelId = req.user?.hotelId;
  const { email } = req.body;

  if (!hotelId) {
    return res.status(401).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  const [userExist, staffExist] = await Promise.all([
    User.findOne({ email }),
    Staff.findOne({ email }),
  ]);

  if (userExist || staffExist) {
    return res.status(400).json({
      status: false,
      message: "Email id already exists",
    });
  }

  const staffData = {
    ...req.body,
    hotelId,
  };

  createStaffSchema.parse(staffData);

  const staff = await Staff.create(staffData);

  return res.status(201).json({
    success: true,
    message: "Staff created successfully",
    data: staff,
  });
}

async function getStaff(req: Request, res: Response) {
  const hotelId = req.user?.hotelId;

  if (!hotelId) {
    return res.status(401).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  const { isAvailable, isActive } = req.query;
  const filter: any = { hotelId };

  if (isAvailable !== undefined) {
    filter.isAvailable = isAvailable === "true";
  }

  if (isActive !== undefined) {
    filter.isActive = isActive === "true";
  }

  const staffList = await Staff.find(filter)
    .sort({ createdAt: -1 })
    .select("-__v");

  // Optionally populate service mappings to show roles
  const staffWithServices = await Promise.all(
    staffList.map(async (staffMember) => {
      const serviceMappings = await StaffServiceMapping.find({
        staffId: staffMember._id,
        isActive: true,
      }).populate({
        path: "serviceId",
        select: "name",
      });

      const staffObj = staffMember.toObject();
      (staffObj as any).services = serviceMappings.map(
        (mapping: any) => mapping.serviceId,
      );
      return staffObj;
    }),
  );

  return res.status(200).json({
    success: true,
    message: "Staff list fetched successfully",
    staff: staffWithServices,
  });
}

async function getStaffById(req: Request, res: Response) {
  const { id } = req.params;
  const hotelId = req.user?.hotelId;

  if (!hotelId) {
    return res.status(401).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  const staff = await Staff.findOne({ _id: id, hotelId });

  if (!staff) {
    return res.status(404).json({
      success: false,
      message: "Staff not found",
    });
  }

  // Get service mappings to show dynamic roles
  const serviceMappings = await StaffServiceMapping.find({
    staffId: id,
    isActive: true,
  }).populate({
    path: "serviceId",
    select: "name description",
  });

  const staffObj = staff.toObject();
  (staffObj as any).services = serviceMappings.map((mapping: any) => ({
    service: mapping.serviceId,
    mappingId: mapping._id,
  }));

  return res.status(200).json({
    success: true,
    message: "Staff fetched successfully",
    data: staffObj,
  });
}

async function updateStaff(req: Request, res: Response) {
  const { id } = req.params;
  const hotelId = req.user?.hotelId;

  if (!hotelId) {
    return res.status(401).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  const updateData = updateStaffSchema.parse(req.body);

  const staff = await Staff.findOneAndUpdate(
    { _id: id, hotelId },
    { $set: updateData },
    { new: true, runValidators: true },
  );

  if (!staff) {
    return res.status(404).json({
      success: false,
      message: "Staff not found",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Staff updated successfully",
    data: staff,
  });
}

async function deleteStaff(req: Request, res: Response) {
  const { id } = req.params;
  const hotelId = req.user?.hotelId;

  if (!hotelId) {
    return res.status(401).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  // Soft delete by setting isActive to false
  const staff = await Staff.findOneAndUpdate(
    { _id: id, hotelId },
    { $set: { isActive: false, isAvailable: false } },
    { new: true },
  );

  if (!staff) {
    return res.status(404).json({
      success: false,
      message: "Staff not found",
    });
  }

  // Also deactivate all service mappings
  await StaffServiceMapping.updateMany(
    { staffId: id },
    { $set: { isActive: false } },
  );

  return res.status(200).json({
    success: true,
    message: "Staff deleted successfully",
  });
}

export const createStaffHandler = asyncHandler(createStaff);
export const getStaffHandler = asyncHandler(getStaff);
export const getStaffByIdHandler = asyncHandler(getStaffById);
export const updateStaffHandler = asyncHandler(updateStaff);
export const deleteStaffHandler = asyncHandler(deleteStaff);

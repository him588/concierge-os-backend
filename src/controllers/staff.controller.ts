import { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler";
import { Staff } from "../models/staff.model";
import { StaffServiceMapping } from "../models/staff-service-mapping.model";
import {
  createStaffSchema,
  updateStaffSchema,
} from "../validators/staff.validator";
import { User } from "../models/user.model";
import mongoose from "mongoose";

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
    phone: req.body.mobileNo,
  };

  createStaffSchema.parse(staffData);

  const staff = await Staff.create(staffData);

  return res.status(201).json({
    success: true,
    message: "Staff created successfully",
    data: staff,
  });
}

async function getStaffDetails(req: Request, res: Response) {
  const hotelId = req.user?.hotelId;

  if (!hotelId) {
    return res.status(401).json({
      success: false,
      message: "Hotel ID is required",
    });
  }
  const query = { hotelId };

  const [totalStaff, availableStaff, unavailableStaff, inactiveStaff] =
    await Promise.all([
      Staff.countDocuments(query),
      Staff.countDocuments({ ...query, isAvailable: true }),
      Staff.countDocuments({ ...query, isAvailable: false }),
      Staff.countDocuments({ ...query, isActive: false }),
    ]);

  return res.status(200).json({
    success: true,
    message: "Staff list fetched successfully",
    staffInfo: { totalStaff, availableStaff, unavailableStaff, inactiveStaff },
  });
}

async function getStaffList(req: Request, res: Response) {
  const hotelId = req.user?.hotelId;
  const staffTypes = ["include", "exclude", "all"];

  if (!hotelId) {
    return res.status(401).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  const { pageSize, pageNo, search, serviceId, staffType } = req.query;

  if (!staffTypes.includes(String(staffType))) {
    return res.status(400).json({
      success: false,
      message: "Invalid staffType. Allowed values are include, exclude, all",
    });
  }

  if ((staffType === "include" || staffType === "exclude") && !serviceId) {
    return res.status(400).json({
      success: false,
      message: "serviceId is required when staffType is include or exclude",
    });
  }

  let filter: any = {
    hotelId: new mongoose.Types.ObjectId(hotelId),
    isActive: true, // Only return active staff
  };

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const aggregationPipeline: any[] = [
    { $match: filter },
    {
      $lookup: {
        from: "staffservicemappings",
        let: { staffId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$staffId", "$$staffId"] },
                  { $eq: ["$isActive", true] },
                  ...(serviceId
                    ? [
                        {
                          $eq: [
                            "$serviceId",
                            new mongoose.Types.ObjectId(String(serviceId)),
                          ],
                        },
                      ]
                    : []),
                ],
              },
            },
          },
        ],
        as: "services",
      },
    },
  ];

  if (staffType === "include") {
    aggregationPipeline.push({
      $match: {
        "services.0": { $exists: true }, // Has at least one service mapping
      },
    });
  } else if (staffType === "exclude") {
    aggregationPipeline.push({
      $match: {
        "services.0": { $exists: false }, // Has no service mappings
      },
    });
  }

  const countPipeline = [...aggregationPipeline, { $count: "total" }];
  const countResult = await Staff.aggregate(countPipeline);
  const totalCount = countResult.length > 0 ? countResult[0].total : 0;

  aggregationPipeline.push(
    {
      $project: {
        name: 1,
        email: 1,
        phone: 1,
        isAvailable: 1,
        isActive: 1,
        staffId: "$_id",
        servicesMapped: { $size: "$services" }, // Count of services mapped
        _id: 0,
      },
    },
    {
      $skip: ((Number(pageNo) || 1) - 1) * (Number(pageSize) || 10),
    },
    {
      $limit: Number(pageSize) || 10,
    },
  );

  const staff = await Staff.aggregate(aggregationPipeline);

  return res.status(200).json({
    success: true,
    staff,
    pagination: {
      total: totalCount,
      pageNo: Number(pageNo) || 1,
      pageSize: Number(pageSize) || 10,
      totalPages: Math.ceil(totalCount / (Number(pageSize) || 10)),
    },
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
export const getStaffHandler = asyncHandler(getStaffDetails);
export const deleteStaffHandler = asyncHandler(deleteStaff);
export const fetchStaffListHandler = asyncHandler(getStaffList);

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

  if (!hotelId) {
    return res
      .status(401)
      .json({ success: false, message: "Hotel ID is required" });
  }

  const { pageSize, pageNo, search, serviceId, staffType } = req.query;
  const validStaffTypes = ["include", "exclude", "all"];

  if (!validStaffTypes.includes(String(staffType))) {
    return res.status(400).json({
      success: false,
      message: "Invalid staffType. Allowed values are include, exclude, all",
    });
  }

  // ── Sanitize & validate serviceId early ────────────────────────────────────
  const rawServiceId = String(serviceId ?? "").trim();
  const validServiceId = mongoose.Types.ObjectId.isValid(rawServiceId)
    ? new mongoose.Types.ObjectId(rawServiceId)
    : null;

  console.log("valid service id", validServiceId);

  if ((staffType === "include" || staffType === "exclude") && !validServiceId) {
    return res.status(400).json({
      success: false,
      message:
        "A valid serviceId is required when staffType is include or exclude",
    });
  }

  const page = Number(pageNo) || 1;
  const limit = Number(pageSize) || 10;
  const hotelObjectId = new mongoose.Types.ObjectId(String(hotelId));

  // ── Base filter ─────────────────────────────────────────────────────────────
  const matchFilter: any = { hotelId: hotelObjectId };

  if (search) {
    matchFilter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  // ── Lookup: scoped to serviceId — used only for include/exclude filtering ───
  const filteredServicesLookup = {
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
                ...(validServiceId
                  ? [{ $eq: ["$serviceId", validServiceId] }]
                  : []),
              ],
            },
          },
        },
        { $project: { _id: 1 } },
      ],
      as: "filteredServices",
    },
  };

  // ── Lookup: all active services with full details for display ───────────────
  const assignedServicesLookup = {
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
              ],
            },
          },
        },
        {
          $lookup: {
            from: "services",
            localField: "serviceId",
            foreignField: "_id",
            as: "serviceDetails",
          },
        },
        {
          $unwind: {
            path: "$serviceDetails",
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $project: {
            _id: 0,
            serviceId: "$serviceDetails._id",
            name: "$serviceDetails.name",
            description: "$serviceDetails.description",
            color: "$serviceDetails.color",
            isPaid: "$serviceDetails.isPaid",
          },
        },
      ],
      as: "assignedServices",
    },
  };

  // ── Build pipeline ──────────────────────────────────────────────────────────
  const pipeline: any[] = [
    { $match: matchFilter },
    filteredServicesLookup,
    assignedServicesLookup,
  ];

  if (staffType === "include") {
    pipeline.push({ $match: { "filteredServices.0": { $exists: true } } });
  } else if (staffType === "exclude") {
    pipeline.push({ $match: { "filteredServices.0": { $exists: false } } });
  }

  // ── Total count before pagination ───────────────────────────────────────────
  const [countResult] = await Staff.aggregate([
    ...pipeline,
    { $count: "total" },
  ]);
  const totalCount = countResult?.total ?? 0;

  // ── Final projection + pagination ───────────────────────────────────────────
  pipeline.push(
    {
      $project: {
        _id: 0,
        staffId: "$_id",
        name: 1,
        email: 1,
        phone: 1,
        isAvailable: 1,
        isActive: 1,
        servicesMapped: { $size: "$assignedServices" },
        assignedServices: 1,
        createdAt: 1,
      },
    },
    { $skip: (page - 1) * limit },
    { $limit: limit },
  );

  const staff = await Staff.aggregate(pipeline);

  return res.status(200).json({
    success: true,
    staff,
    pagination: {
      total: totalCount,
      pageNo: page,
      pageSize: limit,
      totalPages: Math.ceil(totalCount / limit),
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
  const staff = await Staff.deleteOne({ _id: id, hotelId });

  if (!staff) {
    return res.status(404).json({
      success: false,
      message: "Staff not found",
    });
  }

  // Also deactivate all service mappings
  await StaffServiceMapping.deleteMany({ staffId: id });

  return res.status(200).json({
    success: true,
    message: "Staff deleted successfully",
  });
}

export const createStaffHandler = asyncHandler(createStaff);
export const getStaffHandler = asyncHandler(getStaffDetails);
export const deleteStaffHandler = asyncHandler(deleteStaff);
export const fetchStaffListHandler = asyncHandler(getStaffList);

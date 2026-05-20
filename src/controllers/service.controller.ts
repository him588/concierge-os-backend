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
import mongoose from "mongoose";
import { createServiceItemSchema } from "../validators/service-item.validator";
import { handleZodError } from "../utils/zod-handler";

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
  const { id } = req.query;
  const hotelId = id ? id : req.user?.hotelId;
  const status = req.query.status;
  console.log("status", req.query);

  if (!hotelId) {
    return res.status(400).json({
      success: false,
      message: "Hotel ID is required",
    });
  }
  const findServices = await Service.aggregate([
    {
      $match: {
        hotelId: new mongoose.Types.ObjectId(hotelId.toString()),
        isActive: status?.toString() === "Active" ? true : false,
      },
    },
    {
      $lookup: {
        from: "serviceitems",
        localField: "_id",
        foreignField: "serviceId",
        as: "serviceItems",
      },
    },
    {
      $lookup: {
        from: "staffservicemappings",
        localField: "_id",
        foreignField: "serviceId",
        as: "staff",
      },
    },
    {
      $addFields: {
        serviceCount: { $size: "$serviceItems" },
      },
    },
    {
      $addFields: {
        staffCount: { $size: "$staff" },
      },
    },
    {
      $project: {
        name: 1,
        description: 1,
        color: 1,
        isActive: 1,
        serviceId: "$_id",
        serviceCount: 1,
        staffCount: 1,
        serviceItems: 1,
        _id: 0,
      },
    },
  ]);

  console.log(findServices);

  // const [subServices, staffServiceMapping, services] = await Promise.all([
  //   ServiceItem.find({ hotelId }),
  //   StaffServiceMapping.find({ hotelId }),
  //   Service.find({ hotelId }).sort({ createdAt: -1 }).select("-__v").lean(),
  // ]);

  // const response = services.map((item) => {
  //   const staffCount = staffServiceMapping.filter(
  //     (mapping) => mapping.serviceId.toString() === item._id.toString(),
  //   ).length;
  //   const servicesCount = subServices.filter(
  //     (sub) => sub.serviceId.toString() === item._id.toString(),
  //   ).length;

  //   const newObj = {
  //     id: item._id,
  //     name: item.name,
  //     color: item.color,
  //     description: item.description,
  //     status: item.isActive,
  //     staffAssigned: staffCount,
  //     subServices: servicesCount,
  //   };
  //   return newObj;
  // });

  // console.log(response);

  return res.status(200).json({
    success: true,
    message: "Services fetched successfully",
    services: findServices,
  });
}

async function getServiceById(req: Request, res: Response) {
  console.log(req.query.id);
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      message: "serviceid is required ",
    });
  }
  let serviceDetails: {
    totalRevenue: number;
    totalBookingsCount: number;
    canceledBookingsCount: number;
    staffCount: number;
    name: string;
    isActive: boolean;
  } = {
    totalRevenue: 0,
    totalBookingsCount: 0,
    canceledBookingsCount: 0,
    staffCount: 0,
    name: "",
    isActive: false,
  };

  const services = await Service.aggregate([
    {
      $match: { _id: new mongoose.Types.ObjectId(id) },
    },
    {
      $lookup: {
        from: "bookings",
        localField: "_id",
        foreignField: "serviceId",
        as: "totalBookings",
      },
    },
    {
      $lookup: {
        from: "staffservicemappings",
        localField: "_id",
        foreignField: "serviceId",
        as: "totalStaff",
      },
    },
    {
      $addFields: {
        totalRevenue: {
          $sum: "$totalBookings.totalAmount",
        },
      },
    },
    {
      $addFields: {
        totalBookingsCount: {
          $size: "$totalBookings",
        },
      },
    },
    {
      $addFields: {
        canceledBookingsCount: {
          $size: {
            $filter: {
              input: "$totalBookings",
              as: "booking",
              cond: { $eq: ["$$booking.status", "cancelled"] },
            },
          },
        },
      },
    },
    {
      $addFields: {
        staffCount: {
          $size: "$totalStaff",
        },
      },
    },
    {
      $project: {
        staffCount: 1,
        canceledBookingsCount: 1,
        totalBookingsCount: 1,
        totalRevenue: 1,
        name: 1,
        isActive: 1,
      },
    },
  ]);
  if (services.length > 0) {
    let service = services[0];
    serviceDetails = {
      totalRevenue: service.totalRevenue,
      totalBookingsCount: service.totalBookingsCount,
      canceledBookingsCount: service.canceledBookingsCount,
      staffCount: service.staffCount,
      name: service.name,
      isActive: service.isActive,
    };
  }

  return res.status(200).json({
    status: "success",
    service: serviceDetails,
  });
}

async function updateService(req: Request, res: Response) {
  const { id, markActive } = req.body;
  console.log(req.body);
  if (!id) {
    return res.status(401).json({
      success: false,
      message: "room is required to uddate service",
    });
  }

  if (typeof markActive !== "boolean") {
    return res.status(401).json({
      success: false,
      message: "status of service should be boolean",
    });
  }

  const updateService = await Service.findByIdAndUpdate(
    id,
    { isActive: markActive },
    { new: true },
  );

  if (updateService) {
  } else {
  }

  // If updating name, check for duplicates

  const service = await Service.findOneAndUpdate(
    { _id: id },
    { $set: { isActive: markActive } },
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

async function getServiceDetails(req: Request, res: Response) {
  const { id } = req.query;
  const hotelId = req.user?.hotelId;

  if (!id) {
    return res.status(400).json({
      message: "serviceid is required ",
    });
  }
  const service = Service.aggregate([
    {
      $match: { _id: new mongoose.Types.ObjectId(id.toString()) },
    },
    {
      $lookup: {
        from: "serviceitems",
        foreignField: "",
        localField: "",
        as: "serviceItem",
      },
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$totalamount" },
      },
    },
  ]);
  return res.status(200).json({
    status: "success",
    service,
  });
}

export const createServiceHandler = asyncHandler(createService);
export const getServicesHandler = asyncHandler(getServices);
export const getServiceByIdHandler = asyncHandler(getServiceById);
export const updateServiceHandler = asyncHandler(updateService);
export const deleteServiceHandler = asyncHandler(deleteService);
export const getBookingDetails = asyncHandler(getServiceDetails);

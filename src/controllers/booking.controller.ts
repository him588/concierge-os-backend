import { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler";
import { Booking, BookingStatus } from "../models/booking.model";
import { ServiceItem } from "../models/service-item.model";
import { StaffServiceMapping } from "../models/staff-service-mapping.model";
import { Staff } from "../models/staff.model";
import {
  createBookingSchema,
  updateBookingSchema,
} from "../validators/booking.validator";
import { Service } from "../models/service.model";

/**
 * Helper function to automatically assign staff to a booking
 * Based on service and availability
 */
async function assignStaffToBooking(serviceId: string, hotelId: string) {
  // Find all active staff mappings for this service
  const mappings = await StaffServiceMapping.find({
    serviceId,
    hotelId,
    isActive: true,
  }).populate({
    path: "staffId",
    match: { isAvailable: true, isActive: true },
  });

  // Filter out mappings where staff is not available
  const availableMappings = mappings.filter(
    (mapping: any) => mapping.staffId !== null,
  );

  if (availableMappings.length === 0) {
    return null; // No available staff
  }

  // Simple round-robin or first available assignment
  // In production, you might want more sophisticated logic
  const selectedMapping = availableMappings[0];
  return selectedMapping.staffId._id;
}

async function createBooking(req: Request, res: Response) {
  const hotelId = req.user?.hotelId || req.body.hotelId;

  if (!hotelId) {
    return res.status(401).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  // For guest bookings, guestId comes from body
  // For authenticated users, could come from req.user
  const bookingData = {
    ...req.body,
    hotelId,
  };

  createBookingSchema.parse(bookingData);

  // Verify service item exists and is available
  const serviceItem = await ServiceItem.findOne({
    _id: bookingData.serviceItemId,
    hotelId,
    isAvailable: true,
  }).populate({ path: "serviceId" });

  if (!serviceItem) {
    return res.status(404).json({
      success: false,
      message: "Service item not found or unavailable",
    });
  }

  // Get price at time of booking
  const price = serviceItem.price;
  const totalAmount = price * bookingData.quantity;

  // Auto-assign staff based on service
  const assignedStaffId = await assignStaffToBooking(
    serviceItem.serviceId._id.toString(),
    hotelId,
  );

  // Parse scheduledAt if provided
  let scheduledAt: Date | undefined;
  if (bookingData.scheduledAt && bookingData.scheduledAt.trim() !== "") {
    scheduledAt = new Date(bookingData.scheduledAt);
    if (isNaN(scheduledAt.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid scheduledAt date format",
      });
    }
  }

  const booking = await Booking.create({
    ...bookingData,
    serviceId: serviceItem.serviceId._id,
    price,
    totalAmount,
    assignedStaffId: assignedStaffId || undefined,
    status: assignedStaffId ? BookingStatus.CONFIRMED : BookingStatus.PENDING,
    scheduledAt,
  });

  const populatedBooking = await Booking.findById(booking._id)
    .populate({ path: "serviceItemId", select: "name price" })
    .populate({ path: "serviceId", select: "name" })
    .populate({ path: "assignedStaffId", select: "name" })
    .populate({ path: "guestId", select: "name email" });

  return res.status(201).json({
    success: true,
    message: assignedStaffId
      ? "Booking created and staff assigned successfully"
      : "Booking created. Staff will be assigned when available.",
    data: populatedBooking,
  });
}

async function getBookings(req: Request, res: Response) {
  const hotelId = req.user?.hotelId;
  const { status, guestId, staffId, serviceId } = req.query;

  if (!hotelId) {
    return res.status(401).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  const filter: any = { hotelId };

  if (status) {
    filter.status = status;
  }

  if (guestId) {
    filter.guestId = guestId;
  }

  if (staffId) {
    filter.assignedStaffId = staffId;
  }

  if (serviceId) {
    filter.serviceId = serviceId;
  }

  const bookings = await Booking.find(filter)
    .populate({ path: "serviceItemId", select: "name price" })
    .populate({ path: "serviceId", select: "name" })
    .populate({ path: "assignedStaffId", select: "name email" })
    .populate({ path: "guestId", select: "name email" })
    .populate({ path: "roomId", select: "roomNumber floor" })
    .sort({ createdAt: -1 })
    .select("-__v");

  return res.status(200).json({
    success: true,
    message: "Bookings fetched successfully",
    data: bookings,
  });
}

async function getBookingById(req: Request, res: Response) {
  const { id } = req.params;
  const hotelId = req.user?.hotelId;

  if (!hotelId) {
    return res.status(401).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  const booking = await Booking.findOne({ _id: id, hotelId })
    .populate({ path: "serviceItemId", select: "name price" })
    .populate({ path: "serviceId", select: "name description" })
    .populate({ path: "assignedStaffId", select: "name email phone" })
    .populate({ path: "guestId", select: "name email" })
    .populate({ path: "roomId", select: "roomNumber floor" });

  if (!booking) {
    return res.status(404).json({
      success: false,
      message: "Booking not found",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Booking fetched successfully",
    data: booking,
  });
}

async function updateBooking(req: Request, res: Response) {
  const { id } = req.params;
  const hotelId = req.user?.hotelId;

  if (!hotelId) {
    return res.status(401).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  const updateData = updateBookingSchema.parse(req.body);

  // Parse scheduledAt if provided
  if (updateData.scheduledAt) {
    if (updateData.scheduledAt.trim() === "") {
      updateData.scheduledAt = undefined;
    } else {
      const parsedDate = new Date(updateData.scheduledAt);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid scheduledAt date format",
        });
      }
      updateData.scheduledAt = parsedDate.toISOString();
    }
  }

  // If status is being updated to completed, set completedAt
  if (updateData.status === BookingStatus.COMPLETED) {
    (updateData as any).completedAt = new Date();
  }

  // If assignedStaffId is being updated, verify the staff exists
  if (updateData.assignedStaffId) {
    const staff = await Staff.findOne({
      _id: updateData.assignedStaffId,
      hotelId,
      isActive: true,
    });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff not found or inactive",
      });
    }
  }

  const booking = await Booking.findOneAndUpdate(
    { _id: id, hotelId },
    { $set: updateData },
    { new: true, runValidators: true },
  )
    .populate({ path: "serviceItemId", select: "name price" })
    .populate({ path: "serviceId", select: "name" })
    .populate({ path: "assignedStaffId", select: "name email" })
    .populate({ path: "guestId", select: "name email" });

  if (!booking) {
    return res.status(404).json({
      success: false,
      message: "Booking not found",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Booking updated successfully",
    data: booking,
  });
}

// Guest endpoint: Browse services and items
async function browseServices(req: Request, res: Response) {
  const { hotelId } = req.query;

  if (!hotelId) {
    return res.status(400).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  // Get all active services with their items
  const services = await Service.find({
    hotelId,
    isActive: true,
  }).sort({ name: 1 });

  const servicesWithItems = await Promise.all(
    services.map(async (service) => {
      const items = await ServiceItem.find({
        serviceId: service._id,
        isAvailable: true,
      })
        .sort({ name: 1 })
        .select("name description price isFree");

      return {
        ...service.toObject(),
        items,
      };
    }),
  );

  return res.status(200).json({
    success: true,
    message: "Services fetched successfully",
    data: servicesWithItems,
  });
}

export const createBookingHandler = asyncHandler(createBooking);
export const getBookingsHandler = asyncHandler(getBookings);
export const getBookingByIdHandler = asyncHandler(getBookingById);
export const updateBookingHandler = asyncHandler(updateBooking);
export const browseServicesHandler = asyncHandler(browseServices);

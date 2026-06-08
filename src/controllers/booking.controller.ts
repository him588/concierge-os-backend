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
import { RoomBooking, RoomBookingStatus } from "../models/room-booking.model";
import { PopulatedBooking, ServiceBookingPayload } from "../types/type";
import mongoose, { Types } from "mongoose";
import JWTProvider from "../utils/jwt-provider";
import { sendServiceBookingEmail } from "../utils/send-email";
import { WidgetUser } from "../models/widget-user.model";
import razorpay from "../utils/razorpay-config";
import { Property } from "../models/property.model";

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
  const { hotelId, roomBookingId, serviceList } = req.body;
  const guestId = req?.user?.userId;

  if (!hotelId || !roomBookingId || !serviceList || !guestId) {
    return res.status(400).json({
      success: false,
      message: "Hotel ID, Room Booking ID, and Services List are required",
    });
  }

  const [checkIsBookingValid, guest, hotel] = await Promise.all([
    RoomBooking.findOne({
      _id: roomBookingId,
      status: {
        $in: [RoomBookingStatus.CHECKED_IN, RoomBookingStatus.CONFIRMED],
      },
    }),
    WidgetUser.findById(guestId),
    Property.findById(hotelId),
  ]);

  if (!checkIsBookingValid) {
    return res.status(400).json({
      status: false,
      message: "Your Room Booking is not longer valid",
    });
  }

  const results = await Promise.all(
    serviceList.map(async (item: ServiceBookingPayload) => {
      try {
        const [service, existing] = await Promise.all([
          ServiceItem.findById(item.itemId),
          Booking.findOne({
            serviceItemId: item.itemId,
            status: { $in: [BookingStatus.CONFIRMED, BookingStatus.PENDING] },
            roomBookingId: roomBookingId,
          }),
        ]);

        if (!service || existing) {
          return { type: "unprocessed", item };
        }

        const entry: any = {
          hotelId,
          guestId,
          roomId: checkIsBookingValid.roomId.toString(),
          serviceItemId: item.itemId,
          serviceId: item.serviceId,
          price: service.price,
          totalAmount: item.quantity * service.price,
          status: service.isFree
            ? BookingStatus.CONFIRMED
            : BookingStatus.PENDING,
          requestedAt: new Date(),
          roomBookingId: roomBookingId,
          name: item.name,
          isFree: item.isFree,
        };

        if (item.listeningType === "person") {
          entry.person = item.quantity;
        } else {
          entry.quantity = item.quantity;
        }

        const validateEntry = createBookingSchema.safeParse(entry);

        if (!validateEntry.success) {
          console.log("Validation error:", validateEntry.error);
          return { type: "unprocessed", item };
        }

        return { type: "processed", data: entry };
      } catch (error) {
        return { type: "unprocessed", item };
      }
    }),
  );

  const processedServiceQue = results
    .filter((r) => r.type === "processed")
    .map((r) => r.data);

  const unProcessedServiceQue = results
    .filter((r) => r.type === "unprocessed")
    .map((r) => r.item);

  console.log("processed services", processedServiceQue);
  console.log("unprocessed services", unProcessedServiceQue);

  if (processedServiceQue.length > 0) {
    console.log("going towards processed services");
    const createdBookings = await Booking.insertMany(processedServiceQue);

    const paidBookings = await Booking.find({
      _id: { $in: createdBookings.map((b) => b._id) },
      totalAmount: { $gt: 0 },
    }).populate<{ serviceItemId: { name: string } }>("serviceItemId");
    console.log("all the piad bookings", paidBookings);
    if (paidBookings.length > 0) {
      const totalAmount = paidBookings.reduce(
        (sum, b) => sum + b.totalAmount,
        0,
      );

      const [order] = await Promise.all([
        razorpay.orders.create({
          amount: totalAmount * 100,
          currency: "INR",
          receipt: `receipt_${Date.now()}`,
        }),
      ]);

      const paymentToken = JWTProvider.generatePaymentToken({
        guestId: guestId,
        bookingType: "service",
        services: paidBookings.map((b) => ({
          sevicesBookingId: (b._id as any).toString(),
          seviceName: (b.serviceItemId as any)?.name || "Service",
          status: b.status,
        })),
        orderId: order.id,
      });

      console.log("my payment token ", paymentToken);

      if (guest?.email) {
        sendServiceBookingEmail(
          "../templates",
          "service-booking.html",
          process.env.EMAIL_USER!,
          guest.email,
          "Service Booking Pending - Please Complete Your Payment",
          hotel?.name || "Hotel",
          new Date().getFullYear().toString(),
          hotel?.location?.city || "City",
          hotel?.location?.country || "State",
          (createdBookings[0]._id as any).toString(),
          guest?.name || "Guest",
          checkIsBookingValid.roomId.toString(),
          paidBookings.map((b) => ({
            name: (b.serviceItemId as any)?.name || "Service",
            quantity: b.quantity ?? b.person ?? 1,
            amount: b.totalAmount,
          })),
          totalAmount.toString(),
          `${process.env.CLIENT_URL}/payment/${paymentToken}`,
          "15 minutes",
        );
      }
    }
  }

  return res.status(200).json({
    success: true,
    message: `Booking processed successfully. ${processedServiceQue.length} out of ${
      processedServiceQue.length + unProcessedServiceQue.length
    } services were booked.`,
    proccessedItem: processedServiceQue,
    unproccessedItem: unProcessedServiceQue,
  });
}

async function getBookings(req: Request, res: Response) {
  const hotelId = req.user?.hotelId;
  const { status, guestId, staffId, serviceId, pageSize, offset } = req.query;

  if (!pageSize || !offset) {
    return res.status(400).json({ message: "Bad request", status: false });
  }

  if (!hotelId) {
    return res.status(401).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  const filter: any = { hotelId };

  if (status && status !== "all") {
    if (Object.values(BookingStatus).includes(status as BookingStatus)) {
      filter.status = status;
    } else {
      return res.status(400).json({
        status: false,
        message: `Status should be of type ${BookingStatus}`,
      });
    }
  }

  if (guestId) filter.guestId = guestId;
  if (staffId) filter.assignedStaffId = staffId;
  if (serviceId) filter.serviceId = serviceId;

  const [bookings, totalBookings] = await Promise.all([
    Booking.find(filter)
      .populate({ path: "serviceItemId", select: "name price" })
      .populate({ path: "serviceId", select: "name" })
      .populate({ path: "assignedStaffId", select: "name email" })
      .populate({ path: "guestId", select: "name email" })
      .populate({ path: "roomId", select: "roomNumber floor" })
      .sort({ createdAt: -1 })
      .limit(+pageSize)
      .skip(+offset)
      .select("-__v")
      .lean() as unknown as Promise<PopulatedBooking[]>,
    Booking.countDocuments(filter),
  ]);

  const flattenedBookings = bookings.map((booking) => ({
    id: booking._id,
    status: booking.status,
    quantity: booking.quantity,
    createdAt: booking.createdAt,
    serviceId: booking.serviceId?._id ?? null,
    serviceName: booking.serviceId?.name ?? null,
    serviceItemId: booking.serviceItemId?._id ?? null,
    serviceItemName: booking.serviceItemId?.name ?? null,
    serviceItemPrice: booking.serviceItemId?.price ?? null,
    guestId: booking.guestId?._id ?? null,
    guestName: booking.guestId?.name ?? null,
    guestEmail: booking.guestId?.email ?? null,
    staffId: booking.assignedStaffId?._id ?? null,
    staffName: booking.assignedStaffId?.name ?? null,
    staffEmail: booking.assignedStaffId?.email ?? null,
    roomId: booking.roomId?._id ?? null,
    roomNumber: booking.roomId?.roomNumber ?? null,
    roomFloor: booking.roomId?.floor ?? null,
  }));

  return res.status(200).json({
    success: true,
    message: "Bookings fetched successfully",
    totalBookings,
    totalPages: Math.ceil(totalBookings / +pageSize),
    bookings: flattenedBookings,
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

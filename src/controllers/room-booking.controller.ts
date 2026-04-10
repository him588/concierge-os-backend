import { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler";
import { RoomBooking, RoomBookingStatus } from "../models/room-booking.model";
import { Room } from "../models/room.model";
import {
  createRoomBookingSchema,
  updateRoomBookingSchema,
} from "../validators/room-booking.validator";
import { handleZodError } from "../utils/zod-handler";
import { WidgetUser } from "../models/widget-user.model";
import { sendBookingEmail } from "../utils/send-email";
import JWTProvider from "../utils/jwt-provider";
import razorpay from "../utils/razorpay-config";
import mongoose from "mongoose";

/**
 * Check if a room is available for the given date range
 */
async function isRoomAvailable(
  roomId: string,
  checkIn: Date,
  checkOut: Date,
  excludeBookingId?: string,
): Promise<boolean> {
  const filter: any = {
    roomId,
    status: {
      $in: [
        RoomBookingStatus.CONFIRMED,
        RoomBookingStatus.CHECKED_IN,
        RoomBookingStatus.PENDING,
      ],
    },
    $or: [
      // Check-in falls within existing booking
      { checkIn: { $lte: checkIn }, checkOut: { $gt: checkIn } },
      // Check-out falls within existing booking
      { checkIn: { $lt: checkOut }, checkOut: { $gte: checkOut } },
      // Booking completely encompasses existing booking
      { checkIn: { $gte: checkIn }, checkOut: { $lte: checkOut } },
    ],
  };

  if (excludeBookingId) {
    filter._id = { $ne: excludeBookingId };
  }

  const conflictingBooking = await RoomBooking.findOne(filter);
  return !conflictingBooking;
}

async function createRoomBooking(req: Request, res: Response) {
  const hotelId = req.user?.hotelId || req.body.hotelId;
  const { guestName, phone, email, categoryId, checkIn, checkOut, guests } =
    req.body;
  if (!hotelId) {
    return res.status(401).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  const bookingData = {
    hotelId,
    guestName,
    guestPhone: phone,
    guestEmail: email,
    roomTypeId: categoryId,
    checkIn: checkIn,
    checkOut: checkOut,
    numberOfGuests: guests,
    pricePerNight: 0, // will be calculated based on room type
  };

  console.log(bookingData);
  const validatePayload = createRoomBookingSchema.safeParse(bookingData);

  console.log("validated payload:", validatePayload);

  if (!validatePayload.success) {
    return res.status(400).json(handleZodError(validatePayload.error));
  }

  // Parse dates
  const checkInDate = new Date(bookingData.checkIn);
  const checkOutDate = new Date(bookingData.checkOut);

  // Verify room exists and belongs to hotel
  const room = await Room.findOne({
    roomTypeId: bookingData.roomTypeId,
    hotelId,
    status: "available",
  }).populate({ path: "roomTypeId" });

  if (!room) {
    return res.status(404).json({
      success: false,
      message: "Room not found, not available, or in maintenance",
    });
  }

  const roomType = room.roomTypeId as any;

  // Check if number of guests exceeds room capacity
  if (bookingData.numberOfGuests > roomType.maxGuest) {
    return res.status(400).json({
      success: false,
      message: `Room can accommodate maximum ${roomType.maxGuest} guests`,
    });
  }

  // Check room availability for the date range
  const available = await isRoomAvailable(
    (room._id as any).toString() || "",
    checkInDate,
    checkOutDate,
  );

  if (!available) {
    return res.status(409).json({
      success: false,
      message: "Room is not available for the selected dates",
    });
  }
  console.log("Room is available, proceeding to create booking", {
    ...bookingData,
  });
  const roomBooking = await RoomBooking.create({
    ...bookingData,
    roomId: room._id,
    roomTypeId: roomType._id,

    checkIn,
    checkOut,
    pricePerNight: roomType.price,
    status: RoomBookingStatus.CONFIRMED,
  });

  const populatedBooking = await RoomBooking.findById(roomBooking._id)
    .populate({ path: "roomId", select: "roomNumber floor images" })
    .populate({ path: "roomTypeId", select: "type maxGuest price" })
    .populate({ path: "guestId", select: "name email" });

  return res.status(201).json({
    success: true,
    message: "Room booking created successfully",
    data: populatedBooking,
  });
}

async function bookRoomById(req: Request, res: Response) {
  console.log("request body", req.body);

  const hotelId = req.user?.hotelId || req.body.hotelId;
  const { guestName, phone, email, checkIn, checkOut, guests, roomId } =
    req.body;

  if (!hotelId) {
    return res.status(400).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  if (!roomId) {
    return res.status(400).json({
      success: false,
      message: "Room ID is required",
    });
  }

  // Parse dates
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);

  // Verify room exists, belongs to hotel, and is available
  const room = await Room.findOne({
    _id: roomId,
    hotelId,
    status: "available",
  }).populate({ path: "roomTypeId" });

  if (!room) {
    return res.status(404).json({
      success: false,
      message: "Room not found, not available, or in maintenance",
    });
  }

  const roomType = room.roomTypeId as any;

  // Check if number of guests exceeds room capacity
  if (guests > roomType.maxGuest) {
    return res.status(400).json({
      success: false,
      message: `Room can accommodate maximum ${roomType.maxGuest} guests`,
    });
  }

  // Check room availability for the date range
  const available = await isRoomAvailable(roomId, checkInDate, checkOutDate);

  if (!available) {
    return res.status(409).json({
      success: false,
      message: "Room is not available for the selected dates",
    });
  }

  const bookingData = {
    hotelId,
    guestName,
    guestPhone: phone,
    guestEmail: email,
    roomId: `${room._id}`,
    roomTypeId: `${roomType._id}`,
    checkIn,
    checkOut,
    numberOfGuests: guests,
    pricePerNight: roomType.price,
  };

  console.log("booking-data", bookingData);

  console.log("Room is available, proceeding to create booking", bookingData);

  // Validate payload
  const validatePayload = createRoomBookingSchema.safeParse(bookingData);
  console.log(validatePayload);

  if (!validatePayload.success) {
    return res.status(400).json(handleZodError(validatePayload.error));
  }

  const roomBooking = await RoomBooking.create({
    ...bookingData,
    status: RoomBookingStatus.CONFIRMED,
  });

  const populatedBooking = await RoomBooking.findById(roomBooking._id)
    .populate({ path: "roomId", select: "roomNumber floor images" })
    .populate({ path: "roomTypeId", select: "type maxGuest price" })
    .populate({ path: "guestId", select: "name email" });

  return res.status(201).json({
    success: true,
    message: "Room booked successfully",
    data: populatedBooking,
  });
}

async function getRoomBookings(req: Request, res: Response) {
  const hotelId = req.user?.hotelId;
  console.log(req.user);
  const { filter } = req.query;
  console.log(hotelId);
  if (!hotelId) {
    return res.status(401).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  const now = new Date();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const query: any = { hotelId };

  switch (filter) {
    case "today":
      query.checkIn = { $lte: now };
      query.checkOut = { $gte: now };
      break;

    case "upcoming":
      query.checkIn = { $gt: now };
      break;

    case "past":
      query.checkOut = { $lt: now };
      break;

    case "checkinToday":
      query.checkIn = { $gte: startOfDay, $lte: endOfDay };
      break;

    case "checkoutToday":
      query.checkOut = { $gte: startOfDay, $lte: endOfDay };
      break;
  }

  const bookings = await RoomBooking.find(query)
    .populate({ path: "roomId", select: "roomNumber floor images" })
    .populate({ path: "roomTypeId", select: "type maxGuest price" })
    .populate({ path: "guestId", select: "name email" })
    .sort({ checkIn: 1 })
    .select("-__v");

  return res.status(200).json({
    success: true,
    message: "Room bookings fetched successfully",
    data: bookings,
  });
}

async function getRoomBookingById(req: Request, res: Response) {
  const { id, propertyId } = req.query;
  const hotelId = propertyId || req.user?.hotelId;

  if (!hotelId) {
    return res.status(401).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  const booking = await RoomBooking.findOne({ _id: id, hotelId })
    .populate({ path: "roomId", select: "roomNumber floor images status" })
    .populate({ path: "roomTypeId", select: "type maxGuest price tags" })
    .populate({ path: "guestId", select: "name email" });

  if (!booking) {
    return res.status(404).json({
      success: false,
      message: "Room booking not found",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Room booking fetched successfully",
    data: booking,
  });
}

async function updateRoomBooking(req: Request, res: Response) {
  const { id } = req.params;
  const hotelId = req.user?.hotelId;

  if (!hotelId) {
    return res.status(401).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  const updateData = updateRoomBookingSchema.parse(req.body);

  // Parse dates if provided, but keep type as string
  // Don't mutate updateData to Date here due to type constraints.
  // If conversion to Date is needed, do it in a local variable where needed.

  // If dates are being updated, check availability
  if (updateData.checkIn || updateData.checkOut) {
    const existingBooking = await RoomBooking.findById(id);
    if (existingBooking) {
      const checkIn = updateData.checkIn || existingBooking.checkIn;
      const checkOut = updateData.checkOut || existingBooking.checkOut;
      const available = await isRoomAvailable(
        existingBooking.roomId.toString(),
        typeof checkIn === "string" ? new Date(checkIn) : checkIn,
        typeof checkOut === "string" ? new Date(checkOut) : checkOut,
        id,
      );

      if (!available) {
        return res.status(409).json({
          success: false,
          message: "Room is not available for the updated dates",
        });
      }
    }
  }

  // Recalculate if dates or status changed
  const finalUpdateData: any = { ...updateData };
  if (
    finalUpdateData.checkIn ||
    finalUpdateData.checkOut ||
    finalUpdateData.status === RoomBookingStatus.CHECKED_OUT
  ) {
    // Recalculate will happen in pre-save hook
    // But we need to fetch room type price for recalculation
    const existingBooking = await RoomBooking.findById(id);
    if (existingBooking) {
      const checkIn = finalUpdateData.checkIn || existingBooking.checkIn;
      const checkOut = finalUpdateData.checkOut || existingBooking.checkOut;
      const timeDiff = checkOut.getTime() - checkIn.getTime();
      const totalNights = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
      finalUpdateData.totalNights = totalNights > 0 ? totalNights : 1;
      finalUpdateData.totalAmount = totalNights * existingBooking.pricePerNight;
    }
  }

  // If status is changed to checked_out or cancelled, make room available again
  if (
    updateData.status === RoomBookingStatus.CHECKED_OUT ||
    updateData.status === RoomBookingStatus.CANCELLED
  ) {
    const existingBooking = await RoomBooking.findById(id);
    if (existingBooking) {
      await Room.findByIdAndUpdate(existingBooking.roomId, {
        $set: { status: "available" },
      });
    }
  }

  // If status is changed to checked_in, confirm the booking
  if (updateData.status === RoomBookingStatus.CHECKED_IN) {
    finalUpdateData.status = RoomBookingStatus.CHECKED_IN;
  }

  const booking = await RoomBooking.findOneAndUpdate(
    { _id: id, hotelId },
    { $set: finalUpdateData },
    { new: true, runValidators: true },
  )
    .populate({ path: "roomId", select: "roomNumber floor images" })
    .populate({ path: "roomTypeId", select: "type maxGuest price" })
    .populate({ path: "guestId", select: "name email" });

  if (!booking) {
    return res.status(404).json({
      success: false,
      message: "Room booking not found",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Room booking updated successfully",
    data: booking,
  });
}

async function cancelRoomBooking(req: Request, res: Response) {
  const { id } = req.params;
  const hotelId = req.user?.hotelId;

  if (!hotelId) {
    return res.status(401).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  const booking = await RoomBooking.findOneAndUpdate(
    { _id: id, hotelId },
    { $set: { status: RoomBookingStatus.CANCELLED } },
    { new: true },
  );

  if (!booking) {
    return res.status(404).json({
      success: false,
      message: "Room booking not found",
    });
  }

  // Make room available again
  await Room.findByIdAndUpdate(booking.roomId, {
    $set: { status: "available" },
  });

  return res.status(200).json({
    success: true,
    message: "Room booking cancelled successfully",
    data: booking,
  });
}

async function bookRoomByGuestId(req: Request, res: Response) {
  const { roomId, hotelId, checkIn, checkOut, guests, guestId, notes } =
    req.body;
  let orderId = "";

  if (!roomId) {
    return res.status(400).json({
      message: "Room is not available for the id",
    });
  }

  const isAvailable = await isRoomAvailable(roomId, checkIn, checkOut);

  if (!isAvailable) {
    return res.status(400).json({
      message: "Room is not available for selected dates",
    });
  }

  const findRoom = await Room.findById(roomId).populate("roomTypeId hotelId");

  console.log(findRoom);

  if (!findRoom) {
    return res.status(400).json({
      message: "Room not found",
    });
  }

  if (!findRoom.roomTypeId) {
    return res.status(400).json({
      message: "RoomType not linked properly",
    });
  }

  const roomType = findRoom.roomTypeId as any;
  const hotel = findRoom.hotelId as any;

  const bookingPayload = {
    hotelId,
    guestId,
    roomId,
    roomTypeId: roomType._id.toString(),
    checkIn,
    checkOut,
    numberOfGuests: guests,
    pricePerNight: roomType.price,
    notes,
  };

  const validatePayload = createRoomBookingSchema.safeParse(bookingPayload);

  if (!validatePayload.success) {
    return res.status(400).json(handleZodError(validatePayload.error));
  }

  const booking = await RoomBooking.create(bookingPayload);

  // 🔥 Calculate derived values
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);

  const totalNights =
    Math.ceil(
      (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24),
    ) || 1;

  const totalAmount = totalNights * roomType.price;

  // 🔥 Fetch guest email
  const guest = await WidgetUser.findById(guestId);
  const bookingId: string = booking._id ? booking._id.toString() : "";

  if (totalAmount > 0) {
    const options = {
      amount: totalAmount * 100, // Razorpay expects amount in smallest currency unit (paise)
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        description: `Payment for room booking for ${roomType.type} at ${hotel.name}`,
      },
    };
    const order = await razorpay.orders.create(options);
    orderId = order.id;
    console.log("Razorpay order created:", order);
  }

  const paymentToken = JWTProvider.generatePaymentToken({
    guestId: (guest?._id as any)?.toString() || "",
    bookingType: "room",
    rooms: [{ roomBookingId: bookingId }],
    orderId,
  });

  if (guest?.email) {
    sendBookingEmail(
      "../templates", // folder
      "booking.html", // file
      process.env.EMAIL_USER!, // sender
      guest.email, // receiver
      "Booking Pending - Please Complete Your Payment", // subject
      hotel?.name || "Hotel",
      "2024", // year (you can make dynamic)
      hotel?.location.city || "City",
      hotel?.location.country || "State",
      bookingId,
      roomType.type,
      checkIn,
      checkOut,
      totalNights.toString(),
      guests.toString(),
      totalAmount.toString(),
      `${process.env.CLIENT_URL}/payment/${paymentToken}`,
      "15 minutes", // expire time (you can make dynamic)
    );
  }

  return res.status(201).json({
    message: "Booking created successfully",
    bookingId: booking._id,
  });
}

async function getRoomBookingCount(req: Request, res: Response) {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({
      status: false,
      message: "RoomID is required",
    });
  }
  const bookings = await RoomBooking.find({ _id: id });

  const response = await RoomBooking.aggregate([
    { $match: { roomId: new mongoose.Types.ObjectId(id) } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  const allBookings = response.map((booking) => {
    return { type: booking._id, count: booking.count };
  });

  const allCategories = [
    "pending",
    "confirmed",
    "checked_in",
    "checked_out",
    "cancelled",
  ];
  const finalData = allCategories.map((cat) => {
    const found = allBookings.find((b) => b.type === cat);

    return found ? found : { type: cat, count: 0 };
  });

  console.log("response", response);

  console.log(bookings);
  return res.status(200).json({
    status: true,
    bookings: finalData,
  });
}

export const createRoomBookingHandler = asyncHandler(createRoomBooking);
export const getRoomBookingsHandler = asyncHandler(getRoomBookings);
export const getRoomBookingByIdHandler = asyncHandler(getRoomBookingById);
export const updateRoomBookingHandler = asyncHandler(updateRoomBooking);
export const cancelRoomBookingHandler = asyncHandler(cancelRoomBooking);
export const getRoomBookingCountHandler = asyncHandler(getRoomBookingCount);
export const bookRoomThroughId = asyncHandler(bookRoomById);

//  Widget function//

export const bookRoomThroughGuestId = asyncHandler(bookRoomByGuestId);

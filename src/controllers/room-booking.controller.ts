import { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler";
import { RoomBooking, RoomBookingStatus } from "../models/room-booking.model";
import { Room } from "../models/room.model";
import { RoomType } from "../models/room-type.model";
import {
  createRoomBookingSchema,
  updateRoomBookingSchema,
} from "../validators/room-booking.validator";

/**
 * Check if a room is available for the given date range
 */
async function isRoomAvailable(
  roomId: string,
  checkIn: Date,
  checkOut: Date,
  excludeBookingId?: string
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

  if (!hotelId) {
    return res.status(401).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  const bookingData = {
    ...req.body,
    hotelId,
  };

  createRoomBookingSchema.parse(bookingData);

  // Parse dates
  const checkIn = new Date(bookingData.checkIn);
  const checkOut = new Date(bookingData.checkOut);

  // Verify room exists and belongs to hotel
  const room = await Room.findOne({
    _id: bookingData.roomId,
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
    bookingData.roomId,
    checkIn,
    checkOut
  );

  if (!available) {
    return res.status(409).json({
      success: false,
      message: "Room is not available for the selected dates",
    });
  }

  // Calculate total nights
  const timeDiff = checkOut.getTime() - checkIn.getTime();
  const totalNights = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

  const roomBooking = await RoomBooking.create({
    ...bookingData,
    roomTypeId: roomType._id,
    checkIn,
    checkOut,
    pricePerNight: roomType.price,
    totalNights,
    totalAmount: totalNights * roomType.price,
    status: RoomBookingStatus.PENDING,
  });

  // Update room status to booked
  await Room.findByIdAndUpdate(bookingData.roomId, {
    $set: { status: "booked" },
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

async function getRoomBookings(req: Request, res: Response) {
  const hotelId = req.user?.hotelId;
  const { status, guestId, roomId, checkIn, checkOut } = req.query;

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

  if (roomId) {
    filter.roomId = roomId;
  }

  // Date range filter
  if (checkIn || checkOut) {
    filter.$or = [];
    if (checkIn) {
      filter.$or.push({ checkOut: { $gte: new Date(checkIn as string) } });
    }
    if (checkOut) {
      filter.$or.push({ checkIn: { $lte: new Date(checkOut as string) } });
    }
  }

  const bookings = await RoomBooking.find(filter)
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
  const { id } = req.params;
  const hotelId = req.user?.hotelId;

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
        id
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
  if (finalUpdateData.checkIn || finalUpdateData.checkOut || finalUpdateData.status === RoomBookingStatus.CHECKED_OUT) {
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
  if (updateData.status === RoomBookingStatus.CHECKED_OUT || updateData.status === RoomBookingStatus.CANCELLED) {
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
    { new: true, runValidators: true }
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
    { new: true }
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

export const createRoomBookingHandler = asyncHandler(createRoomBooking);
export const getRoomBookingsHandler = asyncHandler(getRoomBookings);
export const getRoomBookingByIdHandler = asyncHandler(getRoomBookingById);
export const updateRoomBookingHandler = asyncHandler(updateRoomBooking);
export const cancelRoomBookingHandler = asyncHandler(cancelRoomBooking);

import { Request, Response } from "express";
import { ZodError } from "zod";
import { asyncHandler } from "../utils/async-handler";
import { roomTypeZodSchema } from "../validators/rooms-type.validator";
import { roomZodSchema } from "../validators/room.validator";
import { RoomType } from "../models/room-type.model";
import { Room } from "../models/room.model";
import { RoomBooking } from "../models/room-booking.model";

async function createRoomType(req: Request, res: Response) {
  const hotelId = req.user?.hotelId;
  const roomtype = { ...req.body, hotelId };

  console.log("create room api called");

  try {
    roomTypeZodSchema.parse(roomtype);

    const roomTypeInfo = await RoomType.countDocuments({
      type: roomtype.type,
      hotelId,
    });

    const roomTypeCount = await RoomType.countDocuments({ hotelId });

    if (roomTypeInfo > 0) {
      return res.status(400).json({
        success: false,
        message: "Duplicate room type are not allowed for same hotel",
      });
    }

    if (roomTypeCount >= 5) {
      return res.status(400).json({
        success: false,
        message: "Only five category are allowed at a time",
      });
    }

    const saveRoomType = await RoomType.create(roomtype);

    return res.status(201).json({
      success: true,
      message: "Type created successfully",
      roomType: saveRoomType,
    });
  } catch (error) {
    console.log(error);
    if (error instanceof ZodError) {
      const parseError = JSON.parse(error.message);
      return res.status(400).json({
        success: false,
        message: parseError[0].message,
      });
    }
  }
}

async function getRoomType(req: Request, res: Response) {
  const hotelId = req.user?.hotelId;

  const roomTypes = await RoomType.find({ hotelId })
    .sort({
      createdAt: -1,
    })
    .select("-createdAt -updatedAt -__v -hotelId");

  return res.status(200).json({
    success: true,
    message: "Room type list fetched",
    roomTypes,
  });
}

async function createRoom(req: Request, res: Response) {
  try {
    const hotelId = req.user?.hotelId;

    if (!hotelId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // multer-s3 files
    const files = req.files as Express.MulterS3.File[];

    const imageUrls = files?.map((file) => file.location) || [];

    const roomData = {
      ...req.body,
      roomTypeId: req.body.categoryId,
      hotelId,
      images: imageUrls,
      isAvailable: req.body.isAvailable === "true", // string → boolean
    };

    // Zod validation
    roomZodSchema.parse(roomData);

    // Duplicate check
    const duplicateRoom = await Room.countDocuments({
      hotelId,
      roomNumber: roomData.roomNumber,
    });

    if (duplicateRoom > 0) {
      return res.status(400).json({
        success: false,
        message: "Room number already exists ",
      });
    }

    // Save to DB
    const savedRoom = await Room.create(roomData);

    return res.status(201).json({
      success: true,
      message: "Room created successfully",
      room: savedRoom,
    });
  } catch (error) {
    console.error(error);

    if (error instanceof ZodError) {
      const parseError = JSON.parse(error.message);
      console.log("parse error", parseError);
      return res.status(400).json({
        success: false,
        message: parseError[0].message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create room",
    });
  }
}

async function getRooms(req: Request, res: Response) {
  const hotelId = req.user?.hotelId;
  const { id } = req.query;

  const rooms = await Room.find({ hotelId })
    .select("roomNumber floor images status _id")
    .populate({ path: "roomTypeId", select: "type maxGuest" })
    .sort({ createdAt: -1 })
    .lean();

  const response = rooms.map((room: any) => ({
    id: room._id.toString(),
    roomNumber: room.roomNumber,
    category: room.roomTypeId?.type ?? "",
    floor: room.floor,
    images: room.images ?? [],
    maxGuest: room.roomTypeId?.maxGuest ?? 0,
    status: room.status,
  }));

  return res.status(200).json({
    success: true,
    message: "Room list fetched successfully",
    rooms: response,
  });
}

async function getRoomStatus(req: Request, res: Response) {
  const hotelId = req.user?.hotelId;
  if (!hotelId) {
    res.status(401).json({ message: "Unauthorized", status: false });
  }
  const rooms = await Room.find({ hotelId }).populate("roomTypeId").lean();
  const roomBooking = await RoomBooking.find({
    hotelId,
    checkOut: { $gte: new Date() },
  });

  const allRooms = rooms.map((room: any) => {
    const booking = roomBooking.find(
      (b: any) => b.roomId.toString() === room._id.toString(),
    );

    if (room.status === "maintenance") {
      return {
        roomNo: room.roomNumber,
        roomType: room.roomTypeId?.type,
        status: "maintenance",
        roomId: room._id,
      };
    }

    if (booking) {
      const checkIn = new Date(booking.checkIn);
      const checkOut = new Date(booking.checkOut);
      const now = new Date();

      if (now >= checkIn && now <= checkOut) {
        return {
          roomNo: room.roomNumber,
          roomType: room.roomTypeId?.type,
          status: "occupied",
          roomId: room._id,
          daysRemaining: Math.ceil(
            (checkOut.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
          ),
        };
      } else if (checkIn > now) {
        return {
          roomNo: room.roomNumber,
          roomType: room.roomTypeId?.type,
          status: "upcoming",
          roomId: room._id,
          daysUntilCheckIn: Math.ceil(
            (checkIn.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
          ),
        };
      }
    }

    return {
      roomNo: room.roomNumber,
      roomType: room.roomTypeId?.type,
      status: "available",
      roomId: room._id,
    };
  });

  console.log(allRooms);
  return res.status(200).json({
    success: true,
    message: "Room status fetched successfully",
    rooms: allRooms.sort((a, b) => a.roomNo - b.roomNo),
  });
}

export const registerRoomType = asyncHandler(createRoomType);
export const fetchRoomType = asyncHandler(getRoomType);
export const listRoom = asyncHandler(createRoom);
export const fetchRoom = asyncHandler(getRooms);
export const fetchRoomStatus = asyncHandler(getRoomStatus);

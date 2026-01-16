import { Request, Response } from "express";
import { ZodError } from "zod";
import { asyncHandler } from "../utils/async-handler";
import { roomTypeZodSchema } from "../validators/rooms-type.validator";
import { roomZodSchema } from "../validators/room.validator";
import { RoomType } from "../models/room-type.model";
import { Room } from "../models/room.model";

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

export const registerRoomType = asyncHandler(createRoomType);
export const fetchRoomType = asyncHandler(getRoomType);
export const listRoom = asyncHandler(createRoom);
export const fetchRoom = asyncHandler(getRooms);

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
        message: "Duplicate entry are not allowed for same hotel",
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

  const roomTypes = await RoomType.find({ hotelId }).sort({
    createdAt: -1,
  });

  return res.status(200).json({
    success: true,
    message: "Room type list fetched",
    roomTypes,
  });
}

async function createRoom(req: Request, res: Response) {
  const hotelId = req.user?.hotelId;
  const roomData = { ...req.body, hotelId };

  try {
    roomZodSchema.parse(roomData);
    const duplicateRoom = await Room.countDocuments({
      hotelId,
      roomNumber: roomData.roomNumber,
    });

    if (duplicateRoom > 0) {
      return res.status(400).json({
        success: false,
        message: "Room number already exists for this hotel",
      });
    }

    const savedRoom = await Room.create(roomData);

    return res.status(201).json({
      success: true,
      message: "Room created successfully",
      room: savedRoom,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      const parseError = JSON.parse(error.message);
      return res.status(400).json({
        success: false,
        message: parseError[0].message,
      });
    }
  }
}

async function getRooms(req: Request, res: Response) {
  const hotelId = req.user?.hotelId;

  const rooms = await Room.find({ hotelId })
    .populate("roomTypeId")
    .sort({ createdAt: -1 });

  return res.status(200).json({
    success: true,
    message: "Room list fetched successfully",
    rooms,
  });
}

export const registerRoomType = asyncHandler(createRoomType);
export const fetchRoomType = asyncHandler(getRoomType);
export const listRoom = asyncHandler(createRoom);
export const fetchRoom = asyncHandler(getRooms);

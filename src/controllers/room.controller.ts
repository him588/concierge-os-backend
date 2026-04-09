import { Request, Response } from "express";
import { ZodError } from "zod";
import { asyncHandler } from "../utils/async-handler";
import {
  roomTypeUpdateZodSchema,
  roomTypeZodSchema,
} from "../validators/rooms-type.validator";
import { roomZodSchema } from "../validators/room.validator";
import { RoomType } from "../models/room-type.model";
import { Room } from "../models/room.model";
import { RoomBooking } from "../models/room-booking.model";
import { handleZodError } from "../utils/zod-handler";
import mongoose, { Mongoose } from "mongoose";

async function createRoomType(req: Request, res: Response) {
  const hotelId = req.user?.hotelId;
  const roomtype = { ...req.body, hotelId, type: req.body.type.toUpperCase() };

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
    .select("-createdAt -updatedAt -__v -hotelId")
    .lean();
  const formattedRoomTypes = roomTypes.map((rt) => ({
    id: rt._id,
    ...rt,
  }));

  return res.status(200).json({
    success: true,
    message: "Room type list fetched",
    roomTypes: formattedRoomTypes,
  });
}

async function createRoom(req: Request, res: Response) {
  try {
    console.log("create room api called");
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

    console.log("room data", roomData);
    console.log("images", imageUrls);

    // Zod validation
    const validatePayload = roomZodSchema.safeParse(roomData);

    if (!validatePayload.success) {
      return res.status(400).json(handleZodError(validatePayload.error));
    }

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
  const { id, categoryId, pageSize = 10, pageNumber = 1 } = req.query;

  const query: any = { hotelId: id ? id : hotelId };

  if (categoryId) {
    query["roomTypeId"] = categoryId;
  }

  const limit = Number(pageSize);
  const page = Number(pageNumber);

  // ✅ total count
  const totalRooms = await Room.countDocuments(query);
  const totalPages = Math.ceil(totalRooms / limit);

  const rooms = await Room.find(query)
    .select("roomNumber floor images status _id")
    .populate({ path: "roomTypeId", select: "type maxGuest" })
    .sort({ createdAt: -1 })
    .skip(limit * (page - 1))
    .limit(limit)
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
    totalRooms,
    totalPages,
    currentPage: page,
    pageSize: limit,
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

async function getRoomTypeDetails(req: Request, res: Response) {
  const { id } = req.params;
  const hotelId = req.user?.hotelId;
  if (!hotelId) {
    res.status(401).json({ message: "Unauthorized", status: false });
  }

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Room type ID is required",
    });
  }

  const roomTypes = await RoomType.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(id) } },
    {
      $lookup: {
        from: "rooms",
        localField: "_id",
        foreignField: "roomTypeId",
        as: "rooms",
      },
    },
    {
      $addFields: {
        roomCount: { $size: "$rooms" },
      },
    },
    {
      $project: {
        type: 1,
        price: 1,
        tags: 1,
        maxGuest: 1,
        roomCount: 1,
        roomTypeId: "$_id",
        _id: 0,
      },
    },
  ]);
  return res.status(200).json({
    success: true,
    message: "Room type details fetched successfully",
    roomType: roomTypes[0],
  });
}

async function getRoomStatusByRoomTypeId(req: Request, res: Response) {
  const { roomTypeId } = req.params;
  const hotelId = req.user?.hotelId;
  if (!hotelId) {
    res.status(401).json({ message: "Unauthorized", status: false });
  }
  if (!roomTypeId) {
    return res.status(400).json({
      success: false,
      message: "Room type ID is required",
    });
  }
  const rooms = await Room.find({ hotelId, roomTypeId: roomTypeId })
    .populate("roomTypeId")
    .lean();
  const roomBooking = await RoomBooking.find({
    hotelId,
    roomTypeId: roomTypeId,
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
        images: room.images,
        floor: room.floor,
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
          images: room.images,
          status: "occupied",
          roomId: room._id,
          floor: room.floor,
          daysRemaining: Math.ceil(
            (checkOut.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
          ),
        };
      } else if (checkIn > now) {
        return {
          roomNo: room.roomNumber,
          roomType: room.roomTypeId?.type,
          status: "upcoming",
          images: room.images,
          roomId: room._id,
          floor: room.floor,
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
      images: room.images,
      floor: room.floor,
    };
  });

  console.log(allRooms);
  return res.status(200).json({
    success: true,
    message: "Room status fetched successfully",
    rooms: allRooms.sort((a, b) => a.roomNo - b.roomNo),
  });
}

async function updateRoomType(req: Request, res: Response) {
  const { id, type, price, maxGuest } = req.body;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Room type id is required",
    });
  }

  const validatePayload = roomTypeUpdateZodSchema.safeParse({
    type,
    price,
    maxGuest,
  });

  if (!validatePayload.success) {
    return res.status(400).json(handleZodError(validatePayload.error));
  }

  const existingRoomType = await RoomType.findOne({
    _id: { $ne: id },
    type: type,
    hotelId: req.user?.hotelId,
  });

  if (existingRoomType) {
    return res.status(400).json({
      success: false,
      message: "Room type with this name already exists",
    });
  }

  const updateRoomType = await RoomType.findByIdAndUpdate(
    id,
    {
      type: type.toUpperCase(),
      price,
      maxGuest,
    },
    { new: true },
  );

  return res.status(200).json({
    success: true,
    message: "Room type updated successfully",
    roomType: updateRoomType,
  });
}

async function getRoomDetails(req: Request, res: Response) {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Room ID is required",
    });
  }

  const room = await Room.findOne({ _id: id })
    .populate({ path: "roomTypeId", select: "type price tags maxGuest" })
    .lean();
  return res.status(200).json({
    success: true,
    message: "Room details fetched successfully",
    room: room,
  });
}

//  Widget apis

async function fetchRoomTypeWithCounts(req: Request, res: Response) {
  const { hotelId } = req.query;
  console.log("hotelId", hotelId);
  if (!hotelId) {
    return res.status(400).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  const roomType = await RoomType.aggregate([
    { $match: { hotelId: new mongoose.Types.ObjectId(hotelId.toString()) } },
    {
      $lookup: {
        from: "rooms",
        localField: "_id",
        foreignField: "roomTypeId",
        as: "rooms",
      },
    },
    {
      $addFields: {
        roomCount: { $size: "$rooms" },
      },
    },
    { $project: { type: 1, roomCount: 1, roomTypeId: "$_id", _id: 0 } },
  ]);

  const roomtypes = roomType.filter((data) => data.roomCount > 0);

  return res.status(200).json({
    success: true,
    message: "Room types with counts fetched successfully",
    roomTypes: roomtypes,
  });
}

async function fetchRooms(req: Request, res: Response) {
  const { hotelId, roomTypeId } = req.query as {
    hotelId?: string;
    roomTypeId?: string;
  };

  const match: any = {};

  if (hotelId) {
    match.hotelId = new mongoose.Types.ObjectId(hotelId);
  }

  if (roomTypeId) {
    match.roomTypeId = new mongoose.Types.ObjectId(roomTypeId);
  }

  console.log(match);

  const rooms = await Room.aggregate([
    {
      $match: match, // 🔥 dynamic filter
    },
    {
      $lookup: {
        from: "roomtypes",
        localField: "roomTypeId",
        foreignField: "_id",
        as: "roomType",
      },
    },
    {
      $unwind: "$roomType",
    },
    {
      $project: {
        _id: 0,
        id: { $toString: "$_id" },

        roomNumber: "$roomNumber",
        category: "$roomType.type",
        price: "$roomType.price",
        floor: "$floor",

        image: {
          $ifNull: [
            { $arrayElemAt: ["$images", 0] },
            "https://via.placeholder.com/300",
          ],
        },

        amenities: "$roomType.tags",
        maxGuests: "$roomType.maxGuest",

        description: {
          $concat: [
            "$roomType.type",
            " room with ",
            { $toString: "$roomType.maxGuest" },
            " guests capacity",
          ],
        },
      },
    },
  ]);

  return res.status(200).json({
    success: true,
    message: "Rooms fetched successfully",
    count: rooms.length,
    rooms,
  });
}

export const registerRoomType = asyncHandler(createRoomType);
export const fetchRoomType = asyncHandler(getRoomType);
export const listRoom = asyncHandler(createRoom);
export const fetchRoom = asyncHandler(getRooms);
export const fetchRoomStatus = asyncHandler(getRoomStatus);
export const fetchRoomTypeDetails = asyncHandler(getRoomTypeDetails);
export const getRoomStatusById = asyncHandler(getRoomStatusByRoomTypeId);
export const updateRoomTypeDetails = asyncHandler(updateRoomType);
export const fetchRoomDetails = asyncHandler(getRoomDetails);

export const fetchRoomsForWidget = asyncHandler(fetchRooms);
export const fetchRoomTypeCounts = asyncHandler(fetchRoomTypeWithCounts);

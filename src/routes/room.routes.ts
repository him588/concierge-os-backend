import { Router } from "express";
import {
  fetchRoom,
  fetchRoomStatus,
  fetchRoomType,
  listRoom,
  registerRoomType,
  fetchRoomTypeCounts,
  fetchRoomsForWidget,
  fetchRoomTypeDetails,
  getRoomStatusById,
} from "../controllers/room.controller";
import { isHotelOwner } from "../middlewares/isHotelOwner";
import { upload } from "../middlewares/upload-file";
import { authenticateWidgetUser } from "../middlewares/widget-user";

export const roomRoute = Router();

roomRoute.post("/create-type", isHotelOwner, registerRoomType);
roomRoute.get("/get-type", fetchRoomType);
roomRoute.post(
  "/create-room",
  isHotelOwner,
  upload.array("images", 6),
  listRoom,
);
roomRoute.get("/get-rooms", fetchRoom);
roomRoute.get("/get-room-status", fetchRoomStatus);
roomRoute.get("/get-room-status/room-type/:roomTypeId", getRoomStatusById);
roomRoute.get("/get-room-type/:id", fetchRoomTypeDetails);

//  Widget //
roomRoute.get("/get-room-types", fetchRoomTypeCounts);
roomRoute.get(
  "/get-rooms-for-widget",
  authenticateWidgetUser,
  fetchRoomsForWidget,
);

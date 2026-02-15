import { Router } from "express";
import {
  fetchRoom,
  fetchRoomStatus,
  fetchRoomType,
  listRoom,
  registerRoomType,
} from "../controllers/room.controller";
import { isHotelOwner } from "../middlewares/isHotelOwner";
import { upload } from "../middlewares/upload-file";

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

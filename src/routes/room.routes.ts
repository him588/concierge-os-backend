import { Router } from "express";
import {
  fetchRoom,
  fetchRoomType,
  listRoom,
  registerRoomType,
} from "../controllers/room.controller";
import { isHotelOwner } from "../middlewares/isHotelOwner";

export const roomRoute = Router();

roomRoute.post("/create-type", isHotelOwner, registerRoomType);
roomRoute.get("/get-type", fetchRoomType);
roomRoute.post("/create-room", listRoom);
roomRoute.get("/get-rooms", fetchRoom);

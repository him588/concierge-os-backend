import { Router } from "express";
import {
  fetchRoom,
  fetchRoomType,
  listRoom,
  registerRoomType,
} from "../controllers/room.controller";

export const roomRoute = Router();

roomRoute.post("/create-type", registerRoomType);
roomRoute.get("/get-type", fetchRoomType);
roomRoute.post("/create-room", listRoom);
roomRoute.get("/get-rooms", fetchRoom);

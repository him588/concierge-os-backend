import express from "express";
import {
  createRoomBookingHandler,
  getRoomBookingsHandler,
  getRoomBookingByIdHandler,
  updateRoomBookingHandler,
  cancelRoomBookingHandler,
  bookRoomThroughId,
} from "../controllers/room-booking.controller";
import { authenticateUser } from "../middlewares/authenticate-user";
import { isHotelOwner } from "../middlewares/isHotelOwner";

export const roomBookingRoute = express.Router();

// Room booking creation - can be used by guests or authenticated users
roomBookingRoute.post("/book-room", bookRoomThroughId);

// Admin/Owner routes - require authentication
roomBookingRoute.use(authenticateUser);
roomBookingRoute.use(isHotelOwner);

roomBookingRoute.post("/", createRoomBookingHandler);
roomBookingRoute.get("/", getRoomBookingsHandler);
roomBookingRoute.get("/:id", getRoomBookingByIdHandler);
roomBookingRoute.put("/:id", updateRoomBookingHandler);
roomBookingRoute.delete("/:id", cancelRoomBookingHandler);

import express from "express";
import {
  createRoomBookingHandler,
  getRoomBookingsHandler,
  getRoomBookingByIdHandler,
  updateRoomBookingHandler,
  cancelRoomBookingHandler,
  bookRoomThroughGuestId,
  getRoomBookingCountHandler,
  bookRoomThroughId,
} from "../controllers/room-booking.controller";
import { authenticateUser } from "../middlewares/authenticate-user";
import { isHotelOwner } from "../middlewares/isHotelOwner";

export const roomBookingRoute = express.Router();

// Room booking creation - can be used by guests or authenticated users
roomBookingRoute.post("/book-room", bookRoomThroughGuestId);

// Admin/Owner routes - require authentication
roomBookingRoute.use(authenticateUser);
roomBookingRoute.use(isHotelOwner);

roomBookingRoute.get("/get-booking-count/:id", getRoomBookingCountHandler);
roomBookingRoute.post("/", createRoomBookingHandler);
roomBookingRoute.get("/", getRoomBookingsHandler);
roomBookingRoute.get("/:id", getRoomBookingByIdHandler);
roomBookingRoute.put("/:id", updateRoomBookingHandler);
roomBookingRoute.delete("/:id", cancelRoomBookingHandler);
roomBookingRoute.post("/book-room/:id", bookRoomThroughId);

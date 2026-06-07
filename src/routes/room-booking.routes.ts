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
  getUpcomingBookingsHandler,
  getBookingsHandler,
  getDynamicRoomBookingsHandler,
} from "../controllers/room-booking.controller";

export const roomBookingRoute = express.Router();

// Room booking creation - can be used by guests or authenticated users
roomBookingRoute.post("/book-room", bookRoomThroughGuestId);
roomBookingRoute.get("/get-bookings/upcoming", getUpcomingBookingsHandler);
roomBookingRoute.get("/get-bookings", getBookingsHandler);
roomBookingRoute.get("/dynamic-bookings", getDynamicRoomBookingsHandler);

roomBookingRoute.get("/get-booking-count/:id", getRoomBookingCountHandler);
roomBookingRoute.post("/", createRoomBookingHandler);
roomBookingRoute.get("/", getRoomBookingsHandler);
roomBookingRoute.get("/:id", getRoomBookingByIdHandler);
roomBookingRoute.put("/:id", updateRoomBookingHandler);
roomBookingRoute.delete("/:id", cancelRoomBookingHandler);
roomBookingRoute.post("/book-room/:id", bookRoomThroughId);

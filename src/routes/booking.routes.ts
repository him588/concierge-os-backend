import express from "express";
import {
  createBookingHandler,
  getBookingsHandler,
  getBookingByIdHandler,
  updateBookingHandler,
  browseServicesHandler,
} from "../controllers/booking.controller";
import { authenticateUser } from "../middlewares/authenticate-user";
import { isHotelOwner } from "../middlewares/isHotelOwner";

export const bookingRoute = express.Router();

// Guest endpoint - no authentication required for browsing
bookingRoute.get("/browse", browseServicesHandler);

// Booking creation - can be used by guests or authenticated users
bookingRoute.post("/", createBookingHandler);

// Admin/Owner routes - require authentication
bookingRoute.use(authenticateUser);
bookingRoute.use(isHotelOwner);

bookingRoute.get("/", getBookingsHandler);
bookingRoute.get("/:id", getBookingByIdHandler);
bookingRoute.put("/:id", updateBookingHandler);

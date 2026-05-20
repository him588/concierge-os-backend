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
import { authenticateWidgetUser } from "../middlewares/widget-user";

export const bookingRoute = express.Router();

// Guest endpoint - no authentication required for browsing
bookingRoute.get("/browse", browseServicesHandler);

// Booking creation - can be used by guests or authenticated users
bookingRoute.post("/", authenticateWidgetUser, createBookingHandler);

// Admin/Owner routes - require authentication

bookingRoute.get("/", getBookingsHandler);
bookingRoute.get("/:id", getBookingByIdHandler);
bookingRoute.put("/:id", updateBookingHandler);

import express from "express";
import {
  getOverviewDataHandler,
  getBookingDataHandler,
  getServicesDataHandler,
  getTopBookingsHandler,
} from "../controllers/overview.controller";

export const overviewRoute = express.Router();

overviewRoute.get("/", getOverviewDataHandler);
overviewRoute.get("/room-bookings", getBookingDataHandler);
overviewRoute.get("/service-bookings", getServicesDataHandler);
overviewRoute.get("/latest-bookings", getTopBookingsHandler);

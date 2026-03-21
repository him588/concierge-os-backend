import express from "express";
import {
  getOverviewDataHandler,
  getBookingDataHandler,
} from "../controllers/overview.controller";

export const overviewRoute = express.Router();

overviewRoute.get("/", getOverviewDataHandler);
overviewRoute.get("/aggregate", getBookingDataHandler);

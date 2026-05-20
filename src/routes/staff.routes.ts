import express from "express";
import {
  createStaffHandler,
  getStaffHandler,
  deleteStaffHandler,
  fetchStaffListHandler,
} from "../controllers/staff.controller";
import { authenticateUser } from "../middlewares/authenticate-user";
import { isHotelOwner } from "../middlewares/isHotelOwner";

export const staffRoute = express.Router();

// All routes require authentication and hotel owner role
staffRoute.use(authenticateUser);
staffRoute.use(isHotelOwner);

staffRoute.post("/", createStaffHandler);
staffRoute.get("/", getStaffHandler);
staffRoute.get("/staff-list", fetchStaffListHandler);

staffRoute.delete("/:id", deleteStaffHandler);

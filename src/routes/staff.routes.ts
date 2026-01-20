import express from "express";
import {
  createStaffHandler,
  getStaffHandler,
  getStaffByIdHandler,
  updateStaffHandler,
  deleteStaffHandler,
} from "../controllers/staff.controller";
import { authenticateUser } from "../middlewares/authenticate-user";
import { isHotelOwner } from "../middlewares/isHotelOwner";

export const staffRoute = express.Router();

// All routes require authentication and hotel owner role
staffRoute.use(authenticateUser);
staffRoute.use(isHotelOwner);

staffRoute.post("/", createStaffHandler);
staffRoute.get("/", getStaffHandler);
staffRoute.get("/:id", getStaffByIdHandler);
staffRoute.put("/:id", updateStaffHandler);
staffRoute.delete("/:id", deleteStaffHandler);

import express from "express";
import {
  createStaffServiceMappingHandler,
  getStaffServiceMappingsHandler,
  updateStaffServiceMappingHandler,
  deleteStaffServiceMappingHandler,
} from "../controllers/staff-service-mapping.controller";
import { authenticateUser } from "../middlewares/authenticate-user";
import { isHotelOwner } from "../middlewares/isHotelOwner";

export const staffServiceMappingRoute = express.Router();

// All routes require authentication and hotel owner role
staffServiceMappingRoute.use(authenticateUser);
staffServiceMappingRoute.use(isHotelOwner);

staffServiceMappingRoute.post("/", createStaffServiceMappingHandler);
staffServiceMappingRoute.get("/", getStaffServiceMappingsHandler);
staffServiceMappingRoute.put("/:id", updateStaffServiceMappingHandler);
staffServiceMappingRoute.delete("/:id", deleteStaffServiceMappingHandler);

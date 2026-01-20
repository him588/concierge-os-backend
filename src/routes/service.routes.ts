import express from "express";
import {
  createServiceHandler,
  getServicesHandler,
  getServiceByIdHandler,
  updateServiceHandler,
  deleteServiceHandler,
} from "../controllers/service.controller";
import { authenticateUser } from "../middlewares/authenticate-user";
import { isHotelOwner } from "../middlewares/isHotelOwner";

export const serviceRoute = express.Router();

// All routes require authentication and hotel owner role
serviceRoute.use(authenticateUser);
serviceRoute.use(isHotelOwner);

serviceRoute.post("/", createServiceHandler);
serviceRoute.get("/", getServicesHandler);
serviceRoute.get("/:id", getServiceByIdHandler);
serviceRoute.put("/:id", updateServiceHandler);
serviceRoute.delete("/:id", deleteServiceHandler);

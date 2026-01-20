import express from "express";
import {
  createServiceItemHandler,
  getServiceItemsHandler,
  getServiceItemByIdHandler,
  updateServiceItemHandler,
  deleteServiceItemHandler,
} from "../controllers/service-item.controller";
import { authenticateUser } from "../middlewares/authenticate-user";
import { isHotelOwner } from "../middlewares/isHotelOwner";

export const serviceItemRoute = express.Router();

// All routes require authentication and hotel owner role
serviceItemRoute.use(authenticateUser);
serviceItemRoute.use(isHotelOwner);

serviceItemRoute.post("/", createServiceItemHandler);
serviceItemRoute.get("/", getServiceItemsHandler);
serviceItemRoute.get("/:id", getServiceItemByIdHandler);
serviceItemRoute.put("/:id", updateServiceItemHandler);
serviceItemRoute.delete("/:id", deleteServiceItemHandler);

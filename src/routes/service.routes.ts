import express from "express";
import {
  createServiceHandler,
  getServicesHandler,
  getServiceByIdHandler,
  updateServiceHandler,
  deleteServiceHandler,
} from "../controllers/service.controller";

export const serviceRoute = express.Router();

serviceRoute.post("/", createServiceHandler);
serviceRoute.get("/", getServicesHandler);
serviceRoute.get("/:id", getServiceByIdHandler);
serviceRoute.put("/:id", updateServiceHandler);
serviceRoute.delete("/:id", deleteServiceHandler);

import express from "express";
import {
  getPropertyHandler,
  registerUserHandler,
} from "../controllers/property.controller";
import { authenticateUser } from "../middlewares/authenticate-user";

export const propertyRoute = express.Router();

propertyRoute.post("/register-property", authenticateUser, registerUserHandler);
propertyRoute.get("/property-details/:id", getPropertyHandler);
propertyRoute.get("/properties", () => {});
propertyRoute.post("/update-property", () => {});
propertyRoute.delete("/delete", () => {});

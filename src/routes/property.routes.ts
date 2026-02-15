import express from "express";
import {
  getPropertyHandler,
  registerUserHandler,
} from "../controllers/property.controller";
import { authenticateUser } from "../middlewares/authenticate-user";
import { upload } from "../middlewares/upload-file";

export const propertyRoute = express.Router();

propertyRoute.post(
  "/register-property",
  authenticateUser,
  upload.array("images", 5),
  registerUserHandler,
);
propertyRoute.get("/property-details/:id", getPropertyHandler);
propertyRoute.get("/properties", () => {});
propertyRoute.post("/update-property", () => {});
propertyRoute.delete("/delete", () => {});

import express from "express";
import { registerUserHandler } from "../controllers/property.controller";
import { authenticateUser } from "../middlewares/authenticate-user";
import { upload } from "../middlewares/upload-file";

export const propertyRoute = express.Router();

propertyRoute.post(
  "/register-property",
  upload.array("images", 5),
  registerUserHandler
);
propertyRoute.get("/property-details", () => {});
propertyRoute.get("/properties", () => {});
propertyRoute.post("/update-property", () => {});
propertyRoute.delete("/delete", () => {});

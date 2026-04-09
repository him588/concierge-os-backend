import express, { Request, Response } from "express";
import jwt from "../utils/jwt-provider";
import { RoomBooking } from "../models/room-booking.model";
import { asyncHandler } from "../utils/async-handler";
import {
  getPaymentDetailsHandler,
  verifyPaymentHandler,
} from "../controllers/payment.controller";
export const paymentRoute = express.Router();

paymentRoute.get("/:id", getPaymentDetailsHandler);
paymentRoute.post(
  "/razorpay",
  express.raw({ type: "application/json" }),
  verifyPaymentHandler,
);

import express, { Request, Response } from "express";
import jwt from "../utils/jwt-provider";
import { RoomBooking } from "../models/room-booking.model";
import { asyncHandler } from "../utils/async-handler";

async function fetchPaymentDetails(req: Request, res: Response) {
  const { id } = req.params;
  const isPaymentValid = jwt.verifyPaymentToken(id);
  console.log("Payment Token Valid:", isPaymentValid);
  if (isPaymentValid) {
    const decodeToken = jwt.decodeToken(id);
    if (!decodeToken)
      return res
        .status(400)
        .json({ message: "Invalid payment token", status: false });
    const bookingId = decodeToken.rooms[0].roomBookingId;
    if (!bookingId)
      return res.status(400).json({
        message: "Invalid payment token - missing booking ID",
        status: false,
      });
    const bookingDetails = await RoomBooking.find({ _id: bookingId })
      .populate({
        path: "roomTypeId",
        select: "type price capacity", // only these fields
      })
      .populate({
        path: "roomId",
        select: "roomNumber", // only these fields
      })
      .populate({
        path: "guestId",
        select: "name email", // only these fields
      })
      .select("-__v -createdAt -updatedAt"); // exclude these fields
    if (!bookingDetails)
      return res.status(404).json({
        message: "Booking not found for the provided token",
        status: false,
      });
    console.log("Decoded Payment Token:", decodeToken);

    return res.status(200).json({
      message: "Payment details fetched successfully",
      status: true,
      paymentDetails: {
        ...bookingDetails[0].toObject(),
        orderId: decodeToken.orderId,
        orderKey: process.env.RazorpayKeyId,
      },
    });
  } else {
    res
      .status(400)
      .json({ message: "Invalid or expired payment token", status: false });
  }
}

export const getPaymentDetailsHandler = asyncHandler(fetchPaymentDetails);

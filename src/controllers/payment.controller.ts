import express, { Request, Response } from "express";
import jwt from "../utils/jwt-provider";
import { RoomBooking, RoomBookingStatus } from "../models/room-booking.model";
import { asyncHandler } from "../utils/async-handler";
import crypto from "crypto";
import { sendConfirmedBookingEmail } from "../utils/send-email";

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

export async function verifyPayment(req: Request, res: Response) {
  const signature = req.headers["x-razorpay-signature"] as string;
  console.log("Received webhook with signature:", signature);
  console.log("Webhook secret from env:", process.env.WEBHOOK_SECRET);
  // 1. Verify signature
  const expectedSignature = crypto
    .createHmac("sha256", process.env.WEBHOOK_SECRET!)
    .update(req.body)
    .digest("hex");

  if (signature !== expectedSignature) {
    console.log("❌ Invalid webhook signature");
    return res.status(400).json({ error: "Invalid signature" });
  }

  const event = JSON.parse(req.body.toString());
  console.log("✅ Webhook event received:", event.event);

  switch (event.event) {
    case "payment.captured": {
      const payment = event.payload.payment.entity;
      const orderId = payment.order_id;
      const paymentId = payment.id;
      if (payment && payment.notes && payment.notes.bookingId) {
        const confirmBooking = await RoomBooking.findByIdAndUpdate(
          payment.notes.bookingId,
          { $set: { status: RoomBookingStatus.CONFIRMED } },
          { new: true },
        );

        const bookingDetails = await RoomBooking.findOne({
          _id: confirmBooking?._id,
        })
          .populate({
            path: "roomTypeId",
            select: "type price capacity",
          })
          .populate({
            path: "roomId",
            select: "roomNumber floor",
          })
          .populate({
            path: "guestId",
            select: "name email",
          })
          .populate({
            path: "hotelId",
            select: "name location createdAt",
          })
          .select("-__v")
          .lean();

        if (bookingDetails) {
          // Calculate total nights
          const checkInDate = new Date(bookingDetails.checkIn);
          const checkOutDate = new Date(bookingDetails.checkOut);
          const totalNights = Math.ceil(
            (checkOutDate.getTime() - checkInDate.getTime()) /
              (1000 * 60 * 60 * 24),
          );

          // Format dates
          const checkInFormatted = checkInDate.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
          });
          const checkOutFormatted = checkOutDate.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
          });

          // Get hotel creation year
          const hotelYear = new Date((bookingDetails.hotelId as any).createdAt)
            .getFullYear()
            .toString();

          sendConfirmedBookingEmail(
            "../templates",
            "booking-confirm.html",
            process.env.EMAIL_USER!,
            (bookingDetails.guestId as any).email,
            `Booking Confirmed - ${(bookingDetails.hotelId as any).name}`,
            (bookingDetails.hotelId as any).name,
            hotelYear,
            (bookingDetails.hotelId as any).location.city,
            (bookingDetails.hotelId as any).location.country,
            (bookingDetails._id as any).toString(),
            (bookingDetails.guestId as any).name,
            (bookingDetails.guestId as any).email,
            (bookingDetails.roomTypeId as any).type,
            (bookingDetails.roomId as any).roomNumber,
            (bookingDetails.roomId as any).floor.toString(),
            checkInFormatted,
            checkOutFormatted,
            totalNights.toString(),
            bookingDetails.numberOfGuests.toString(),
            bookingDetails.totalAmount.toString(),
            "concierge@hotel.com",
            "+91-8447162049",
          );

          console.log(
            "✅ Confirmation email sent to:",
            (bookingDetails.guestId as any).email,
          );
        }
      }

      console.log("Payment captured for order:", orderId);
      console.log("Payment captured for payment ID:", payment);

      break;
    }

    case "payment.failed": {
      const payment = event.payload.payment.entity;
      const orderId = payment.order_id;

      break;
    }
  }

  res.json({ received: true });
}

export const getPaymentDetailsHandler = asyncHandler(fetchPaymentDetails);
export const verifyPaymentHandler = asyncHandler(verifyPayment);

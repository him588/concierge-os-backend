import mongoose, { Document, Schema } from "mongoose";

export type RoomBookingStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "checked_in"
  | "checked_out";

export interface IRoomBooking extends Document {
  hotelId: mongoose.Types.ObjectId;
  roomId?: mongoose.Types.ObjectId;
  guestUserId?: mongoose.Types.ObjectId;
  guestName: string;
  guestContact?: Record<string, any>;
  fromDate: Date;
  toDate: Date;
  status: RoomBookingStatus;
  paymentTransactionId?: mongoose.Types.ObjectId;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const RoomBookingSchema = new Schema<IRoomBooking>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: "Hotel", required: true },
    roomId: { type: Schema.Types.ObjectId, ref: "Room" },
    guestUserId: { type: Schema.Types.ObjectId, ref: "User" },
    guestName: { type: String, required: true },
    guestContact: { type: Schema.Types.Mixed },
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "checked_in", "checked_out"],
      default: "pending",
    },
    paymentTransactionId: {
      type: Schema.Types.ObjectId,
      ref: "PaymentTransaction",
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

RoomBookingSchema.index({ hotelId: 1, status: 1, fromDate: 1 });

export const RoomBooking = mongoose.model<IRoomBooking>(
  "RoomBooking",
  RoomBookingSchema
);

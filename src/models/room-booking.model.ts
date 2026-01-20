import mongoose, { Schema, model, Document, Types } from "mongoose";

export enum RoomBookingStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  CHECKED_IN = "checked_in",
  CHECKED_OUT = "checked_out",
  CANCELLED = "cancelled",
}

export interface IRoomBooking extends Document {
  hotelId: Types.ObjectId;
  guestId: Types.ObjectId; // Reference to User with role "guest"
  roomId: Types.ObjectId; // Booked room
  roomTypeId: Types.ObjectId; // Denormalized for quick queries
  checkIn: Date; // Check-in date
  checkOut: Date; // Check-out date
  numberOfGuests: number;
  pricePerNight: number; // Price at time of booking (for historical accuracy)
  totalNights: number; // Calculated from checkIn and checkOut
  totalAmount: number; // totalNights * pricePerNight
  status: RoomBookingStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const roomBookingSchema = new Schema<IRoomBooking>(
  {
    hotelId: {
      type: Schema.Types.ObjectId,
      ref: "Property",
      required: true,
      index: true,
    },
    guestId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    roomId: {
      type: Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      index: true,
    },
    roomTypeId: {
      type: Schema.Types.ObjectId,
      ref: "RoomType",
      required: true,
      index: true,
    },
    checkIn: {
      type: Date,
      required: true,
      index: true,
    },
    checkOut: {
      type: Date,
      required: true,
      index: true,
    },
    numberOfGuests: {
      type: Number,
      required: true,
      min: 1,
    },
    pricePerNight: {
      type: Number,
      required: true,
      min: 0,
    },
    totalNights: {
      type: Number,
      required: true,
      min: 1,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: Object.values(RoomBookingStatus),
      default: RoomBookingStatus.PENDING,
      index: true,
    },
    notes: {
      type: String,
    },
  },
  { timestamps: true }
);

// Pre-save hook to calculate totalNights and totalAmount
roomBookingSchema.pre("save", function (next) {
  if (this.checkIn && this.checkOut) {
    const timeDiff = this.checkOut.getTime() - this.checkIn.getTime();
    const nights = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    this.totalNights = nights > 0 ? nights : 1;
    this.totalAmount = this.totalNights * this.pricePerNight;
  }
  next();
});

// Indexes for common queries
roomBookingSchema.index({ hotelId: 1, status: 1 });
roomBookingSchema.index({ guestId: 1, status: 1 });
roomBookingSchema.index({ roomId: 1, checkIn: 1, checkOut: 1 });
roomBookingSchema.index({ checkIn: 1, checkOut: 1 });

export const RoomBooking = model<IRoomBooking>("RoomBooking", roomBookingSchema);

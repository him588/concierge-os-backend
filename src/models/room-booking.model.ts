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
  guestId: Types.ObjectId;
  roomId: Types.ObjectId;
  roomTypeId: Types.ObjectId;
  checkIn: Date;
  checkOut: Date;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  numberOfGuests: number;
  pricePerNight: number;
  totalNights: number;
  totalAmount: number;
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
      ref: "WidgetUser",
      required: false,
      index: true,
    },
    guestName: {
      type: String,
    },
    guestPhone: {
      type: String,
    },
    guestEmail: {
      type: String,
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
  { timestamps: true },
);

roomBookingSchema.set("toJSON", {
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
  },
});

// Pre-save hook to calculate totalNights and totalAmount
roomBookingSchema.pre("validate", function (next) {
  if (this.checkIn && this.checkOut) {
    const timeDiff = this.checkOut.getTime() - this.checkIn.getTime();
    const nights = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    this.totalNights = nights > 0 ? nights : 1;
    this.totalAmount = this.totalNights * this.pricePerNight;
  }
  if (!this.guestId) {
    if (!this.guestName || this.guestName.trim() === "") {
      this.invalidate(
        "guestName",
        "Guest name is required when guestId is not provided",
      );
    }
    if (!this.guestEmail || this.guestEmail.trim() === "") {
      this.invalidate(
        "guestEmail",
        "Guest email is required when guestId is not provided",
      );
    }
    if (!this.guestPhone || this.guestPhone.trim() === "") {
      this.invalidate(
        "guestPhone",
        "Guest phone is required when guestId is not provided",
      );
    }
  }

  next();
});

// Indexes for common queries
roomBookingSchema.index({ hotelId: 1, status: 1 });
roomBookingSchema.index({ guestId: 1, status: 1 });
roomBookingSchema.index({ roomId: 1, checkIn: 1, checkOut: 1 });
roomBookingSchema.index({ checkIn: 1, checkOut: 1 });

export const RoomBooking = model<IRoomBooking>(
  "RoomBooking",
  roomBookingSchema,
);

import mongoose, { Schema, model, Document, Types } from "mongoose";

export enum BookingStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export interface IBooking extends Document {
  hotelId: Types.ObjectId;
  guestId: Types.ObjectId; // Reference to User with role "guest"
  roomId?: Types.ObjectId; // Optional room booking
  serviceItemId: Types.ObjectId; // Always at item level, never service level
  serviceId: Types.ObjectId; // Denormalized for quick queries
  quantity: number;
  price: number; // Price at time of booking (for historical accuracy)
  totalAmount: number; // quantity * price
  assignedStaffId?: Types.ObjectId; // Auto-assigned staff
  status: BookingStatus;
  requestedAt: Date; // When guest requested
  scheduledAt?: Date; // Optional scheduled time
  completedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema<IBooking>(
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
      required: true,
      index: true,
    },
    roomId: {
      type: Schema.Types.ObjectId,
      ref: "Room",
      index: true,
    },
    serviceItemId: {
      type: Schema.Types.ObjectId,
      ref: "ServiceItem",
      required: true,
      index: true,
    },
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: "Service",
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    assignedStaffId: {
      type: Schema.Types.ObjectId,
      ref: "Staff",
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(BookingStatus),
      default: BookingStatus.PENDING,
      index: true,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    scheduledAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    notes: {
      type: String,
    },
  },
  { timestamps: true },
);

// Indexes for common queries
bookingSchema.index({ hotelId: 1, status: 1 });
bookingSchema.index({ guestId: 1, status: 1 });
bookingSchema.index({ assignedStaffId: 1, status: 1 });
bookingSchema.index({ serviceId: 1, status: 1 });

export const Booking = model<IBooking>("Booking", bookingSchema);

import mongoose, { Document, Schema } from "mongoose";

export type ServiceBookingStatus =
  | "pending_staff_confirmation"
  | "assigned"
  | "confirmed"
  | "rejected"
  | "cancelled"
  | "completed"
  | "pending_payment";

export interface IServiceBooking extends Document {
  hotelId: mongoose.Types.ObjectId;
  serviceId: mongoose.Types.ObjectId;
  aiSessionId?: string;
  guestUserId?: mongoose.Types.ObjectId;
  guestName: string;
  guestContact?: { phone?: string; email?: string };
  date: Date;
  timeSlot: string;
  status: ServiceBookingStatus;
  assignedStaffId?: mongoose.Types.ObjectId | null;
  idempotencyKey?: string;
  metadata?: Record<string, any>;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceBookingSchema = new Schema<IServiceBooking>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: "Hotel", required: true },
    serviceId: { type: Schema.Types.ObjectId, ref: "Service", required: true },
    aiSessionId: String,
    guestUserId: { type: Schema.Types.ObjectId, ref: "User" },
    guestName: { type: String, required: true },
    guestContact: { type: Schema.Types.Mixed },
    date: { type: Date, required: true },
    timeSlot: { type: String, required: true },
    status: {
      type: String,
      enum: [
        "pending_staff_confirmation",
        "assigned",
        "confirmed",
        "rejected",
        "cancelled",
        "completed",
        "pending_payment",
      ],
      default: "pending_staff_confirmation",
    },
    assignedStaffId: {
      type: Schema.Types.ObjectId,
      ref: "Staff",
      default: null,
    },
    idempotencyKey: { type: String, index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    version: { type: Number, default: 1 },
  },
  { timestamps: true }
);

ServiceBookingSchema.index({ hotelId: 1, status: 1 });
ServiceBookingSchema.index({ assignedStaffId: 1 });

export const ServiceBooking = mongoose.model<IServiceBooking>(
  "ServiceBooking",
  ServiceBookingSchema
);

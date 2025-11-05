import mongoose, { Document, Schema } from "mongoose";

export type NotificationStatus = "sent" | "delivered" | "failed";
export type NotificationChannel =
  | "email"
  | "sms"
  | "whatsapp"
  | "dashboard"
  | "push";

export interface INotificationLog extends Document {
  hotelId?: mongoose.Types.ObjectId;
  staffId?: mongoose.Types.ObjectId;
  bookingId?: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  channel: NotificationChannel;
  payload?: Record<string, any>;
  status: NotificationStatus;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationLogSchema = new Schema<INotificationLog>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: "Hotel" },
    staffId: { type: Schema.Types.ObjectId, ref: "Staff" },
    bookingId: { type: Schema.Types.ObjectId, ref: "ServiceBooking" },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    channel: {
      type: String,
      enum: ["email", "sms", "whatsapp", "dashboard", "push"],
      required: true,
    },
    payload: { type: Schema.Types.Mixed },
    status: {
      type: String,
      enum: ["sent", "delivered", "failed"],
      default: "sent",
    },
    errorMessage: String,
  },
  { timestamps: true }
);

NotificationLogSchema.index({ bookingId: 1 });
NotificationLogSchema.index({ staffId: 1 });
NotificationLogSchema.index({ status: 1 });

export const NotificationLog = mongoose.model<INotificationLog>(
  "NotificationLog",
  NotificationLogSchema
);

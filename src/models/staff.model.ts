import mongoose, { Document, Schema } from "mongoose";

export type NotificationChannel =
  | "dashboard"
  | "email"
  | "sms"
  | "whatsapp"
  | "push";

export interface IStaff extends Document {
  hotelId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  name: string;
  role: string; // e.g., 'spa','housekeeping','driver','reception'
  contactEmail?: string;
  contactPhone?: string;
  notificationChannel: NotificationChannel;
  isActive: boolean;
  availableSlots?: any[]; // freeform (date/time blocks)
  createdAt: Date;
  updatedAt: Date;
}

const StaffSchema = new Schema<IStaff>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: "Hotel", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    name: { type: String, required: true },
    role: { type: String, required: true },
    contactEmail: String,
    contactPhone: String,
    notificationChannel: {
      type: String,
      enum: ["dashboard", "email", "sms", "whatsapp", "push"],
      default: "dashboard",
    },
    isActive: { type: Boolean, default: true },
    availableSlots: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
);

StaffSchema.index({ hotelId: 1, role: 1, isActive: 1 });

export const Staff = mongoose.model<IStaff>("Staff", StaffSchema);

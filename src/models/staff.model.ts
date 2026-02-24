import mongoose, { Schema, model, Document, Types } from "mongoose";

export interface IStaff extends Document {
  name: string;
  email?: string;
  phone?: string;
  hotelId: Types.ObjectId;
  isAvailable: boolean; // Simple availability flag
  isActive: boolean; // Soft delete/disable flag
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

const staffSchema = new Schema<IStaff>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      sparse: true,
      lowercase: true,
    },
    phone: {
      type: String,
      sparse: true,
    },
    password: {
      type: String,
      required: true,
      trim: true,
    },
    hotelId: {
      type: Schema.Types.ObjectId,
      ref: "Property",
      required: true,
      index: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// Index for quick availability queries
staffSchema.index({ hotelId: 1, isAvailable: 1, isActive: 1 });

export const Staff = model<IStaff>("Staff", staffSchema);

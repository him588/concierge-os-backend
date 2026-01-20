import mongoose, { Schema, model, Document, Types } from "mongoose";

export interface IService extends Document {
  name: string;
  description?: string;
  color: string;
  hotelId: Types.ObjectId; // Multiple hotels can have same service names
  isActive: boolean; // Soft delete/disable flag
  createdAt: Date;
  updatedAt: Date;
}

const serviceSchema = new Schema<IService>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    hotelId: {
      type: Schema.Types.ObjectId,
      ref: "Property",
      required: true,
      index: true,
    },
    color: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// Unique service name per hotel
serviceSchema.index({ hotelId: 1, name: 1 }, { unique: true });

export const Service = model<IService>("Service", serviceSchema);

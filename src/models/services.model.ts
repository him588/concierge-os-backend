import mongoose, { Document, Schema } from "mongoose";

export interface IService extends Document {
  hotelId: mongoose.Types.ObjectId;
  name: string; // 'spa', 'airport_pickup', etc.
  description?: string;
  durationMinutes?: number;
  priceCents?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceSchema = new Schema<IService>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: "Hotel", required: true },
    name: { type: String, required: true },
    description: String,
    durationMinutes: Number,
    priceCents: Number,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ServiceSchema.index({ hotelId: 1, name: 1 }, { unique: false });

export const Service = mongoose.model<IService>("Service", ServiceSchema);

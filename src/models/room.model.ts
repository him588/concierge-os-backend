import mongoose, { Document, Schema } from "mongoose";

export interface IRoom extends Document {
  hotelId: mongoose.Types.ObjectId;
  category: string; // single/deluxe/suite
  number?: string; // room number (optional for inventory)
  priceCents?: number;
  description?: string;
  amenities?: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RoomSchema = new Schema<IRoom>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: "Hotel", required: true },
    category: { type: String, required: true },
    number: String,
    priceCents: Number,
    description: String,
    amenities: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

RoomSchema.index({ hotelId: 1, category: 1 });

export const Room = mongoose.model<IRoom>("Room", RoomSchema);

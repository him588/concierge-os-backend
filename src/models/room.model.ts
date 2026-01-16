import mongoose, { Schema, model, Document } from "mongoose";

export interface IRoom extends Document {
  roomTypeId: mongoose.Types.ObjectId;
  hotelId: mongoose.Types.ObjectId;
  roomNumber: string;
  isAvailable: boolean;
  floor: string;
  status: "available" | "booked" | "maintenance";
  images: string[];
  createdAt: Date;
  updatedAt: Date;
}

const roomSchema = new Schema<IRoom>(
  {
    roomTypeId: {
      type: Schema.Types.ObjectId,
      ref: "RoomType",
      required: true,
    },
    hotelId: {
      type: Schema.Types.ObjectId,
      ref: "property",
      required: true,
    },
    roomNumber: {
      type: String,
      required: true,
    },
    floor: {
      type: String,
      required: true,
    },
    images: [String],
    status: {
      type: String,
      enum: ["available", "booked", "maintenance"],
      default: "available",
    },
  },
  {
    timestamps: true,
  }
);

export const Room = model<IRoom>("Room", roomSchema);

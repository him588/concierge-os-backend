import mongoose, { Document, Schema } from "mongoose";

export interface IHotel extends Document {
  name: string;
  slug?: string;
  ownerUserId?: mongoose.Types.ObjectId;
  logoUrl?: string;
  themeColor?: string;
  createdAt: Date;
  updatedAt: Date;
}

const HotelSchema = new Schema<IHotel>(
  {
    name: { type: String, required: true },
    slug: { type: String, unique: true, sparse: true },
    ownerUserId: { type: Schema.Types.ObjectId, ref: "User" },
    logoUrl: String,
    themeColor: String,
  },
  { timestamps: true }
);

export const Hotel = mongoose.model<IHotel>("Hotel", HotelSchema);

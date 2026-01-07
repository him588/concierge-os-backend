import mongoose, { model, Schema } from "mongoose";

export interface IRoomType extends Document {
  type: String;
  hotelId: mongoose.Types.ObjectId;
  tags: string[];
  price: number;
  maxGuest: number;
  image: string;
  createdAt: Date;
  updatedAt: Date;
}

const roomTypeSchema = new Schema<IRoomType>(
  {
    type: {
      type: String,
      required: true,
    },
    hotelId: {
      type: Schema.Types.ObjectId,
      ref: "property",
      required: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    price: {
      type: Number,
      required: true,
    },
    maxGuest: {
      type: Number,
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const RoomType = model<IRoomType>("RoomType", roomTypeSchema);

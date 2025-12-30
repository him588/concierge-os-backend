import { Schema, model, Document, Types } from "mongoose";

export interface IProperty extends Document {
  name: string;
  tags: string[];
  location: {
    streetAddress: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
  };
  coordinates: {
    latitude: number;
    longitude: number;
  };
  ownedBy: Types.ObjectId;
  services: {
    name: string;
    employees: Types.ObjectId[];
  }[];
  images: string[];
}

const propertySchema = new Schema<IProperty>(
  {
    name: {
      type: String,
      required: true,
    },

    tags: {
      type: [String],
      default: [],
    },

    location: {
      streetAddress: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      country: { type: String, required: true },
      pincode: { type: String, required: true },
    },

    coordinates: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },

    services: [
      {
        name: { type: String, required: true },
        employees: [{ type: Schema.Types.ObjectId, ref: "user" }],
      },
    ],

    ownedBy: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },

    images: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

export const Property = model<IProperty>("Property", propertySchema);

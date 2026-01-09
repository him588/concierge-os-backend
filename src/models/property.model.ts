import { Schema, model, Document, Types } from "mongoose";

export enum PropertyType {
  Hotel = "Hotel",
  Villa = "Villa",
  Apartment = "Apartment",
  Dorm = "Dorm",
}

export interface IProperty extends Document {
  name: string;
  description?: string;
  propertyType: PropertyType;
  price?: number;
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
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    propertyType: {
      type: String,
      enum: Object.values(PropertyType),
      required: true,
    },

    price: {
      type: Number,
      min: 0,
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
      ref: "User",
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

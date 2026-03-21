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
  location: {
    streetAddress: string;
    city: string;
    country: string;
  };
  contacts: {
    phone: {
      type: string;
    };
    email: {
      type: string;
    };
  };

  ownedBy: Types.ObjectId;
  services: {
    name: string;
    employees: Types.ObjectId[];
  }[];
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

    location: {
      streetAddress: { type: String, required: true },
      city: { type: String, required: true },
      country: { type: String, required: true },
    },

    services: [
      {
        name: { type: String, required: true },
        employees: [{ type: Schema.Types.ObjectId, ref: "User" }],
      },
    ],
    contacts: {
      phone: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: true,
      },
    },

    ownedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

export const Property = model<IProperty>("Property", propertySchema);

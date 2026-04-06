import mongoose, { Schema, model, Document, Types } from "mongoose";

export enum ListingType {
  QUANTITY = "quantity", // Food, amenities, consumables
  PERSON = "person", // Spa, fitness classes, consultations
}

export interface IServiceItem extends Document {
  name: string;
  description?: string;
  serviceId: Types.ObjectId;
  price: number;
  isFree: boolean;
  isAutoIncluded: boolean;
  isAvailable: boolean;
  hotelId: Types.ObjectId;
  listingType: ListingType;
  maxQuantityPerBooking?: number; // Optional: limit quantity
  createdAt: Date;
  updatedAt: Date;
}

const serviceItemSchema = new Schema<IServiceItem>(
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
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: "Service",
      required: true,
      index: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    isFree: {
      type: Boolean,
      default: true,
    },
    isAutoIncluded: {
      type: Boolean,
      default: false,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    hotelId: {
      type: Schema.Types.ObjectId,
      ref: "Property",
      required: true,
      index: true,
    },

    // NEW FIELDS
    listingType: {
      type: String,
      enum: Object.values(ListingType),
      default: ListingType.QUANTITY,
      required: true,
    },
    maxQuantityPerBooking: {
      type: Number,
      min: 1,
      default: 10, // Default max
    },
  },
  { timestamps: true },
);

// Pre-save hook to compute isFree from price
serviceItemSchema.pre("save", function (next) {
  this.isFree = this.price === 0;
  next();
});

// Unique item name per service
serviceItemSchema.index({ serviceId: 1, name: 1 }, { unique: true });
// Index for quick hotel queries
serviceItemSchema.index({ hotelId: 1, isAvailable: 1 });

export const ServiceItem = model<IServiceItem>(
  "ServiceItem",
  serviceItemSchema,
);

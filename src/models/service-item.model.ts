import mongoose, { Schema, model, Document, Types } from "mongoose";

export interface IServiceItem extends Document {
  name: string;
  description?: string;
  serviceId: Types.ObjectId; // Parent service (Spa, Food, etc.)
  price: number; // 0 for free services, > 0 for paid
  isFree: boolean; // Computed from price, but stored for quick queries
  isAutoIncluded: boolean; // For free services that are auto-included
  isAvailable: boolean; // Availability flag
  hotelId: Types.ObjectId; // Denormalized for quick queries
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

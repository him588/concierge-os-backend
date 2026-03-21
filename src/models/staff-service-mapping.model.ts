import mongoose, { Schema, model, Document, Types } from "mongoose";

// Many-to-many relationship: Staff <-> Service
// This determines which staff can handle which services
export interface IStaffServiceMapping extends Document {
  staffId: Types.ObjectId;
  serviceId: Types.ObjectId;
  hotelId: Types.ObjectId; // Denormalized for quick queries
  isActive: boolean; // Can disable mapping without deleting
  createdAt: Date;
  updatedAt: Date;
}

const staffServiceMappingSchema = new Schema<IStaffServiceMapping>(
  {
    staffId: {
      type: Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
      index: true,
    },
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: "Service",
      required: true,
      index: true,
    },
    hotelId: {
      type: Schema.Types.ObjectId,
      ref: "Property",
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// Unique constraint: one staff can be mapped to one service only once
staffServiceMappingSchema.index({ staffId: 1, serviceId: 1 }, { unique: true });

// Index for querying available staff for a service
staffServiceMappingSchema.index({ serviceId: 1, isActive: 1 });
staffServiceMappingSchema.index({ staffId: 1, isActive: 1 });

export const StaffServiceMapping = model<IStaffServiceMapping>(
  "StaffServiceMapping",
  staffServiceMappingSchema,
);

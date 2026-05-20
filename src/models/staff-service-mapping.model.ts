import mongoose, { Schema, model, Document, Types } from "mongoose";

export interface IStaffServiceMapping extends Document {
  staffId: Types.ObjectId;
  serviceId: Types.ObjectId;
  hotelId: Types.ObjectId;
  isActive: boolean;
  serviceCount: number;
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
    serviceCount: {
      type: Number,
      require: true,
      default: 0,
    },
  },
  { timestamps: true },
);

staffServiceMappingSchema.set("toJSON", {
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
  },
});

staffServiceMappingSchema.index({ staffId: 1, serviceId: 1 });

staffServiceMappingSchema.index({ serviceId: 1, isActive: 1 });
staffServiceMappingSchema.index({ staffId: 1, isActive: 1 });

export const StaffServiceMapping = model<IStaffServiceMapping>(
  "StaffServiceMapping",
  staffServiceMappingSchema,
);

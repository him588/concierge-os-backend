import mongoose, { Document, Schema } from "mongoose";

export interface IAuditLog extends Document {
  hotelId?: mongoose.Types.ObjectId;
  bookingId?: mongoose.Types.ObjectId;
  actorId?: mongoose.Types.ObjectId; // user or staff
  action: string; // created|confirmed|rejected|assigned|payment_update|...
  payload?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: "Hotel" },
    bookingId: { type: Schema.Types.ObjectId },
    actorId: { type: Schema.Types.ObjectId },
    action: { type: String, required: true },
    payload: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

AuditLogSchema.index({ bookingId: 1, action: 1 });
AuditLogSchema.index({ hotelId: 1 });

export const AuditLog = mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);

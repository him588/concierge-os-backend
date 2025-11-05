import mongoose, { Document, Schema } from "mongoose";

export type UserRole = "guest" | "staff" | "owner" | "admin";

export interface IUser extends Document {
  name: string;
  email?: string;
  phone?: string;
  passwordHash?: string;
  role: UserRole;
  hotelId?: mongoose.Types.ObjectId;
  isVerified: boolean;
  lastLogin?: Date;
  preferences?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, unique: true, sparse: true, lowercase: true },
    phone: { type: String, unique: true, sparse: true },
    passwordHash: { type: String },
    role: {
      type: String,
      enum: ["guest", "staff", "owner", "admin"],
      default: "guest",
    },
    hotelId: { type: Schema.Types.ObjectId, ref: "Hotel" },
    isVerified: { type: Boolean, default: false },
    lastLogin: Date,
    preferences: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

UserSchema.index({ hotelId: 1, role: 1 });

export const User = mongoose.model<IUser>("User", UserSchema);

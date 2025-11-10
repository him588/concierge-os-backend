import mongoose, { Document, Schema } from "mongoose";

export type UserRole = "guest" | "staff" | "owner" | "admin";

export interface IUser extends Document {
  name: string;
  email?: string;
  passwordHash?: string;
  role: UserRole;
  hotelId?: mongoose.Types.ObjectId;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  expireAt?: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, unique: true, sparse: true, lowercase: true },
    passwordHash: { type: String },
    role: {
      type: String,
      enum: ["guest", "staff", "owner", "admin"],
      default: "guest",
    },
    hotelId: { type: Schema.Types.ObjectId, ref: "Hotel" },
    isVerified: { type: Boolean, default: false },
    expireAt: { type: Date, default: undefined },
  },
  { timestamps: true }
);

UserSchema.index({ hotelId: 1, role: 1 });

UserSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

UserSchema.pre("save", function (next) {
  if (!this.isVerified && !this.expireAt) {
    this.expireAt = new Date(Date.now() + 15 * 60 * 1000);
  }

  if (this.isVerified && this.expireAt) {
    this.expireAt = undefined;
  }

  next();
});

export const User = mongoose.model<IUser>("User", UserSchema);

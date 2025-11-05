import mongoose, { Document, Schema } from "mongoose";

export type PaymentStatus =
  | "initiated"
  | "processing"
  | "successful"
  | "failed"
  | "refunded";
export type PaymentProvider = "razorpay" | "stripe" | "paypal" | "other";

export interface IPaymentTransaction extends Document {
  bookingId: mongoose.Types.ObjectId; // ServiceBooking or RoomBooking
  hotelId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  amount: number; // smallest currency unit
  currency: string;
  status: PaymentStatus;
  provider: PaymentProvider;
  providerPaymentId?: string;
  providerOrderId?: string;
  paymentMethod?: string;
  receiptUrl?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentTransactionSchema = new Schema<IPaymentTransaction>(
  {
    bookingId: { type: Schema.Types.ObjectId, required: true },
    hotelId: { type: Schema.Types.ObjectId, ref: "Hotel", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    status: {
      type: String,
      enum: ["initiated", "processing", "successful", "failed", "refunded"],
      default: "initiated",
    },
    provider: {
      type: String,
      enum: ["razorpay", "stripe", "paypal", "other"],
      required: true,
    },
    providerPaymentId: String,
    providerOrderId: String,
    paymentMethod: String,
    receiptUrl: String,
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

PaymentTransactionSchema.index({ bookingId: 1 });
PaymentTransactionSchema.index({ providerPaymentId: 1 });

export const PaymentTransaction = mongoose.model<IPaymentTransaction>(
  "PaymentTransaction",
  PaymentTransactionSchema
);

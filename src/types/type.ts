import { Types } from "mongoose";
import { BookingStatus } from "../models/booking.model";

export enum PropertyType {
  Hotel = "Hotel",
  Villa = "Villa",
  Apartment = "Apartment",
  Dorm = "Dorm",
}

export type Timeframe = "week" | "month" | "year";

export type HeatCell = {
  label: string;
  sublabel?: string;
  value: number;
};

export type PaymentPayload = {
  bookingType: "room" | "service";
  guestId: string;
  rooms?: [{ roomBookingId: string }];
  services?: {
    sevicesBookingId?: string;
    seviceName: string;
    status: BookingStatus;
  }[];
  orderId: string;
};

export type ServiceBookingPayload = {
  serviceId: string;
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  isFree: boolean;
  listeningType: "quantity" | "person";
};

export interface BookingCell {
  label: string;
  sublabel?: string;
  bookings: number; // raw count, not a percentage
}

export type PopulatedBooking = {
  _id: Types.ObjectId;
  status: BookingStatus;
  createdAt: Date;
  serviceId: { _id: Types.ObjectId; name: string } | null;
  serviceItemId: { _id: Types.ObjectId; name: string; price: number } | null;
  guestId: { _id: Types.ObjectId; name: string; email: string } | null;
  assignedStaffId: {
    _id: Types.ObjectId;
    name: string;
    email: string;
  } | null;
  roomId: { _id: Types.ObjectId; roomNumber: string; floor: number } | null;
  quantity: number;
};

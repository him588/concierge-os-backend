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
  services?: [{ sevicesBookingId?: string; seviceName: string }];
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

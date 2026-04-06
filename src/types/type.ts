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

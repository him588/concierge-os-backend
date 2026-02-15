import { z } from "zod";

export const roomZodSchema = z.object({
  roomTypeId: z.string("Room type id is required"),
  hotelId: z.string("Hotel id is required"),
  roomNumber: z
    .string()
    .min(1, "Room number is required")
    .max(10, "Room number is too long"),
  floor: z.string(),
  images: z.array(z.url()),
  status: z.enum(["available", "maintenance"]),
});

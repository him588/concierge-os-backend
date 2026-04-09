import { z } from "zod";

export const roomTypeZodSchema = z.object({
  type: z.string().min(3, "Type should not less than 3 char "),
  hotelId: z.string("Hotel id is required to create room type"),
  tags: z.array(z.string()).default([]),
  price: z.number().positive("Price must be greater than 0"),
  maxGuest: z.number().positive().min(1, "At least one guest required"),
  color: z.string(),
  isShared: z.boolean(),
});

export const roomTypeUpdateZodSchema = z.object({
  type: z.string().min(3, "Type should not less than 3 char "),
  price: z.number().positive("Price must be greater than 0"),
  maxGuest: z.number().positive().min(1, "At least one guest required"),
});

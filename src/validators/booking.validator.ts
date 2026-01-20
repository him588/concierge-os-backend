import { z } from "zod";
import { objectIdSchema } from "./property.validator";
import { BookingStatus } from "../models/booking.model";

export const createBookingSchema = z.object({
  hotelId: objectIdSchema,
  guestId: objectIdSchema,
  roomId: objectIdSchema.optional(),
  serviceItemId: objectIdSchema, // Always book at item level
  quantity: z.number().int().positive("Quantity must be at least 1").default(1),
  scheduledAt: z.string().optional(),
  notes: z.string().optional(),
});

export const updateBookingSchema = z.object({
  status: z.nativeEnum(BookingStatus).optional(),
  assignedStaffId: objectIdSchema.optional(),
  scheduledAt: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;

import { z } from "zod";
import { objectIdSchema } from "./property.validator";
import { RoomBookingStatus } from "../models/room-booking.model";

export const createRoomBookingSchema = z.object({
  hotelId: objectIdSchema,
  guestId: objectIdSchema,
  roomId: objectIdSchema,
  checkIn: z.string().refine(
    (date) => {
      const parsedDate = new Date(date);
      return !isNaN(parsedDate.getTime()) && parsedDate >= new Date();
    },
    { message: "Check-in date must be a valid future date" }
  ),
  checkOut: z.string().refine(
    (date) => {
      const parsedDate = new Date(date);
      return !isNaN(parsedDate.getTime());
    },
    { message: "Check-out date must be a valid date" }
  ),
  numberOfGuests: z.number().int().positive("Number of guests must be at least 1"),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  const checkIn = new Date(data.checkIn);
  const checkOut = new Date(data.checkOut);

  if (checkOut <= checkIn) {
    ctx.addIssue({
      path: ["checkOut"],
      message: "Check-out date must be after check-in date",
      code: z.ZodIssueCode.custom,
    });
  }
});

export const updateRoomBookingSchema = z.object({
  status: z.nativeEnum(RoomBookingStatus).optional(),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  numberOfGuests: z.number().int().positive().optional(),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  // Validate dates if both are provided
  if (data.checkIn && data.checkOut) {
    const checkIn = new Date(data.checkIn);
    const checkOut = new Date(data.checkOut);

    if (checkOut <= checkIn) {
      ctx.addIssue({
        path: ["checkOut"],
        message: "Check-out date must be after check-in date",
        code: z.ZodIssueCode.custom,
      });
    }
  }
});

export type CreateRoomBookingInput = z.infer<typeof createRoomBookingSchema>;
export type UpdateRoomBookingInput = z.infer<typeof updateRoomBookingSchema>;

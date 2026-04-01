import { z } from "zod";
import { objectIdSchema } from "./property.validator";
import { RoomBookingStatus } from "../models/room-booking.model";

export const createRoomBookingSchema = z
  .object({
    hotelId: objectIdSchema,

    // ✅ optional (walk-in booking)
    guestId: objectIdSchema.optional(),

    roomId: objectIdSchema,
    roomTypeId: objectIdSchema, // ✅ added

    checkIn: z.string().refine(
      (date) => {
        const parsed = new Date(date);
        return !isNaN(parsed.getTime()) && parsed >= new Date();
      },
      { message: "Check-in must be a valid future date" },
    ),

    checkOut: z.string().refine(
      (date) => {
        const parsed = new Date(date);
        return !isNaN(parsed.getTime()) && parsed >= new Date();
      },
      { message: "Check-out must be a valid future date" },
    ),

    numberOfGuests: z
      .number()
      .int()
      .positive("Number of guests must be at least 1"),

    pricePerNight: z.number().min(0, "Price must be >= 0"), // ✅ added

    notes: z.string().trim().optional(),
  })

  // ✅ cross-field validation
  .superRefine((data, ctx) => {
    const checkIn = new Date(data.checkIn);
    const checkOut = new Date(data.checkOut);

    if (checkOut <= checkIn) {
      ctx.addIssue({
        path: ["checkOut"],
        message: "Check-out must be after check-in",
        code: z.ZodIssueCode.custom,
      });
    }

    // ✅ ensure either guestId or manual booking (future-proof)
    if (!data.guestId) {
      // optional: allow, or enforce later if needed
      // ctx.addIssue({...})
    }
  });

export const updateRoomBookingSchema = z
  .object({
    status: z.nativeEnum(RoomBookingStatus).optional(),
    checkIn: z.string().optional(),
    checkOut: z.string().optional(),
    numberOfGuests: z.number().int().positive().optional(),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
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

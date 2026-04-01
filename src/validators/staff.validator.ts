import { z } from "zod";
import { objectIdSchema } from "./property.validator";

export const createStaffSchema = z.object({
  name: z.string().min(1, "Staff name is required").trim(),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  phone: z.string().optional(),
  hotelId: objectIdSchema,
  isAvailable: z.boolean().default(true),
  password: z.string().min(6, "Atleast 6 cahr is required for password").trim(),
});

export const updateStaffSchema = z.object({
  name: z.string().min(1, "Staff name is required").trim().optional(),
  email: z.email("Invalid email format").optional().or(z.literal("")),
  phone: z.string().optional(),
  isAvailable: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;

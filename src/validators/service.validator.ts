import { z } from "zod";
import { objectIdSchema } from "./property.validator";

export const createServiceSchema = z.object({
  name: z.string().min(1, "Service name is required").trim(),
  description: z.string().min(3,"Description must be at least 3 characters long"),
  color: z.string(),
  hotelId: objectIdSchema,
  isActive: z.boolean().default(true),
});

export const updateServiceSchema = z.object({
  name: z.string().min(1, "Service name is required").trim().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;

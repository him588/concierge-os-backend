import { z } from "zod";
import { objectIdSchema } from "./property.validator";

export const createServiceSchema = z.object({
  name: z.string().min(1, "Service name is required").trim(),
  description: z.string().optional(),
  color: z.string(),
  hotelId: objectIdSchema,
});

export const updateServiceSchema = z.object({
  name: z.string().min(1, "Service name is required").trim().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;

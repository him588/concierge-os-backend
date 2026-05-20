import { z } from "zod";
import { objectIdSchema } from "./property.validator";

export const createStaffServiceMappingSchema = z.object({
  staffId: objectIdSchema,
  serviceId: objectIdSchema,
  hotelId: objectIdSchema,
  isActive: z.boolean().default(true),
});

export const updateStaffServiceMappingSchema = z.object({
  isActive: z.boolean().optional(),
});

export type CreateStaffServiceMappingInput = z.infer<
  typeof createStaffServiceMappingSchema
>;
export type UpdateStaffServiceMappingInput = z.infer<
  typeof updateStaffServiceMappingSchema
>;

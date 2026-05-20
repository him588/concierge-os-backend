import { z } from "zod";
import { objectIdSchema } from "./property.validator";
import { ListingType } from "../models/service-item.model";

export const createServiceItemSchema = z.object({
  name: z.string().min(1, "Service item name is required").trim(),
  description: z.string().optional(),
  serviceId: objectIdSchema,
  price: z.number().min(0, "Price must be non-negative").default(0),
  isAutoIncluded: z.boolean().default(false),
  listingType: z.enum(ListingType),
  isAvailable: z.boolean().default(true),
  hotelId: objectIdSchema,
});

export const updateServiceItemSchema = z
  .object({
    name: z.string().min(1, "Service item name is required").trim().optional(),
    description: z.string().optional(),
    price: z.number().min(0, "Price must be non-negative").optional(),
    isAutoIncluded: z.boolean().optional(),
    isAvailable: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    // Validate isAutoIncluded if price is provided
    if (
      data.price !== undefined &&
      data.price > 0 &&
      data.isAutoIncluded === true
    ) {
      ctx.addIssue({
        path: ["isAutoIncluded"],
        message: "Only free services (price = 0) can be auto-included",
        code: z.ZodIssueCode.custom,
      });
    }
  });

export type CreateServiceItemInput = z.infer<typeof createServiceItemSchema>;
export type UpdateServiceItemInput = z.infer<typeof updateServiceItemSchema>;

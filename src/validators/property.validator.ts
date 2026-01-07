import { z } from "zod";

export const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB ObjectId");

const serviceSchema = z.object({
  name: z.string().min(1, "Service name is required"),
  employees: z.array(objectIdSchema).default([]),
});

const locationSchema = z.object({
  streetAddress: z.string().min(1, "Street address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  country: z.string().min(1, "Country is required"),
  pincode: z.string().min(1, "Pincode is required"),
});

const coordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const PropertyTypeEnum = z.enum(["Hotel", "Villa", "Apartment", "Dorm"]);

export const propertyZodSchema = z
  .object({
    name: z.string().min(1, "Property name is required"),

    description: z.string().optional(),

    propertyType: PropertyTypeEnum,

    price: z.number().positive().optional(),

    tags: z.array(z.string()).default([]),

    location: locationSchema,

    coordinates: coordinatesSchema,

    services: z.array(serviceSchema).default([]),

    ownedBy: objectIdSchema,

    images: z.array(z.string().url()).min(3).max(5),
  })
  .superRefine((data, ctx) => {
    // 🔐 Conditional price validation
    if (
      (data.propertyType === "Villa" || data.propertyType === "Apartment") &&
      (!data.price || data.price <= 0)
    ) {
      ctx.addIssue({
        path: ["price"],
        message: "Price is required for Villa and Apartment",
        code: z.ZodIssueCode.custom,
      });
    }
  });

export type PropertyInput = z.infer<typeof propertyZodSchema>;

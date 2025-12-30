import { z } from "zod";

export const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB ObjectId");

const serviceSchema = z.object({
  name: z.string().min(1, "Service name is required"),
  employees: z.array(objectIdSchema).default([]),
});

const locationSchema = z.object({
  streetAddress: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  country: z.string().min(1),
  pincode: z.string().min(1),
});

const coordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const propertyZodSchema = z.object({
  name: z.string().min(1, "Property name is required"),

  tags: z.array(z.string()).default([]),

  location: locationSchema,

  coordinates: coordinatesSchema,

  services: z.array(serviceSchema).default([]),

  ownedBy: objectIdSchema,

  images: z.array(z.string().url()).default([]),
});

export type PropertyInput = z.infer<typeof propertyZodSchema>;

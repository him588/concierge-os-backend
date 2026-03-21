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
  country: z.string().min(1, "Country is required"),
});

const contactSchema = z.object({
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email("Invalid email address").min(1, "Email is required"),
});

export const PropertyTypeEnum = z.enum(["Hotel", "Villa", "Apartment", "Dorm"]);

export const propertyZodSchema = z.object({
  name: z.string().min(1, "Property name is required"),

  description: z.string().optional(),

  propertyType: PropertyTypeEnum,

  tags: z.array(z.string()).default([]),

  location: locationSchema,

  services: z.array(serviceSchema).default([]),
  contacts: contactSchema,

  ownedBy: objectIdSchema,
});

export type PropertyInput = z.infer<typeof propertyZodSchema>;

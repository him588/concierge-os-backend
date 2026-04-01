import { z } from "zod";

export const registerWidgetUserSchema = z.object({
  name: z.string().min(1, "Name is required").trim(),
  email: z.email("Invalid email format").trim(),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters long")
    .trim(),
});

export type RegisterWidgetUserInput = z.infer<typeof registerWidgetUserSchema>;

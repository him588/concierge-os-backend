import { object, z } from "zod";

export function handleZodError(error: z.ZodError) {
  const flat = z.flattenError(error);
  const errors: Record<string, string> = {};

  Object.keys(flat.fieldErrors).map((key) => {
    if (!errors[key as keyof typeof errors]) {
      errors[key] = flat.fieldErrors[key as keyof typeof flat.fieldErrors][0];
    }
    console.log("key", key);
  });

  return {
    status: false,
    message: "Invalid input",
    errors: errors,
  };
}

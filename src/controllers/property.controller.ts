import { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler";
import { propertyZodSchema } from "../validators/property.vaidator";
import { Property } from "../models/property.model";

async function registerProperty(req: Request, res: Response) {
  if (!req.user?.userId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  const files = req.files as Express.MulterS3.File[];
  const images: string[] = [];

  if (files?.length) {
    for (const file of files) {
      if (file.location) images.push(file.location);
    }
  }

  let parsedUserDetails;
  try {
    parsedUserDetails = JSON.parse(req.body.userDetails);
  } catch {
    return res.status(400).json({
      success: false,
      message: "Invalid userDetails JSON",
    });
  }

  const propertyData = {
    ...parsedUserDetails,
    images,
    ownedBy: req.user.userId,
  };

  console.log("property data", propertyData);

  propertyZodSchema.parse(propertyData);

  const property = await Property.create(propertyData);

  return res.status(201).json({
    success: true,
    message: "Property created successfully",
    data: property,
  });
}

export const registerUserHandler = asyncHandler(registerProperty);

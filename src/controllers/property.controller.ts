import { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler";
import { propertyZodSchema } from "../validators/property.validator";
import { Property } from "../models/property.model";
import JWTProvider from "../utils/jwt-provider";
import { User } from "../models/user.model";

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

  const populateProperty = await property.populate({
    path: "ownedBy",
    select: "_id name role email",
  });

  const ownedByUser = populateProperty.ownedBy as any;
  const jwtPayload = {
    userId: ownedByUser._id as string,
    email: ownedByUser.email as string,
    role: ownedByUser.role as string,
    hotelId: populateProperty._id as string,
  };

  const accessToken = JWTProvider.generateAccessToken(jwtPayload);
  const refreshToken = JWTProvider.generateRefreshToken(jwtPayload);

  await User.updateOne(
    { _id: ownedByUser._id },
    { refreshToken: refreshToken },
  );

  console.log("jwt payload", jwtPayload);

  return res.status(201).json({
    success: true,
    message: "Property created successfully",
    data: property,
    accessToken,
    refreshToken,
  });
}

async function getProperty(req: Request, res: Response) {
  // console.log(req);
  const { id } = req.params;

  console.log("req recieved", id);

  if (!id) {
    return res.status(400).json({
      status: false,
      message: "Hotel id is reqiured to fetch user details",
    });
  }

  const property = await Property.findOne({ _id: id }).select("name  ownedBy");
  console.log(property);
  return res.status(200).json({
    status: true,
    message: "property details fetched successfully",
    property,
  });
  // return res.status(200).json({
  //   status: true,
  //   message: "user details fetched success fully",
  //   property,
  // });
}

export const registerUserHandler = asyncHandler(registerProperty);
export const getPropertyHandler = asyncHandler(getProperty);

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
  const details = req.body.propertyDetails;

  const propertyData = {
    ownedBy: req.user.userId,
    name: details.name,
    description: details.description,
    propertyType: details.propType,
    location: {
      streetAddress: details.address,
      city: details.city,
      country: details.country,
    },
    contacts: {
      phone: details.phone,
      email: details.email,
    },
  };

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

  res.cookie("refreshToken", refreshToken, {
    secure: false,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: true,
  });

  return res.status(201).json({
    success: true,
    message: "Property created successfully",
    data: property,
    accessToken,
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

  const property = await Property.findOne({ _id: id });
  if (!property) {
    return res.status(400).json({
      status: false,
      message: "Hotel id is reqiured to fetch user details",
    });
  }

  return res.status(200).json({
    status: true,
    message: "property details fetched successfully",
    property,
  });
}

export const registerUserHandler = asyncHandler(registerProperty);
export const getPropertyHandler = asyncHandler(getProperty);

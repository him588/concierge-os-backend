import { Request, Response, NextFunction } from "express";
import { UserPayload } from "../types/express";
import JWTProvider from "../utils/jwt-provider";
import { Property } from "../models/property.model";

export async function authenticateUser(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  console.log("request goes for hotel owner");
  const { headers } = req;
  const token = headers.authorization;
  if (token?.includes("Bearer")) {
    try {
      const userDetails = JWTProvider.verifyAccessToken(
        token.split(" ")[1],
      ) as UserPayload;
      console.log("user details from token", userDetails);
      const property = await Property.findOne({ ownedBy: userDetails.userId });

      console.log("property details", property);

      if (!userDetails) return;
      const { userId, email, role } = userDetails;
      req.user = {
        userId,
        email,
        role,
        hotelId: property?._id?.toString(),
      };
      next();
    } catch (error) {
      console.log("Error while user middleware", error);
      return res.status(401).json({
        message: "Token is invalid or expired",
        status: false,
      });
    }
  } else {
    return res.status(401).json({
      message: "Token is missing",
      status: false,
    });
  }
}

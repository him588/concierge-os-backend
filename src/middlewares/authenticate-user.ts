import { Request, Response, NextFunction } from "express";
import { UserPayload } from "../types/express";
import JWTProvider from "../utils/jwt-provider";
import { Property } from "../models/property.model";

export async function authenticateUser(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { headers } = req;
  console.log(headers);
  const token = headers.authorization;
  console.log("is token available", token);
  if (token?.includes("Bearer")) {
    try {
      const userDetails = JWTProvider.verifyAccessToken(
        token.split(" ")[1]
      ) as UserPayload;

      const property = await Property.findOne({ ownedBy: userDetails.userId });

      if (!userDetails) return;
      const { userId, email, name } = userDetails;
      req.user = {
        userId,
        email,
        name,
        hotelId: property?._id?.toString(),
      };
      next();
    } catch (error) {
      console.log("Error while user middleware", error);
      return res.status(403).json({
        message: "Unauthrize to perform action",
        status: false,
      });
    }
  } else {
    return res.status(403).json({
      message: "Unauthrize to perform action",
      status: false,
    });
  }
}

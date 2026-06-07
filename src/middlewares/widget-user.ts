import { Request, Response, NextFunction } from "express";
import JWTProvider from "../utils/jwt-provider";
import { UserPayload } from "../types/express";

export async function authenticateWidgetUser(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { headers } = req;
  const token = headers.authorization;
  if (token?.includes("Bearer")) {
    try {
      const userDetails = JWTProvider.verifyAccessToken(
        token.split(" ")[1],
      ) as UserPayload;
      console.log("user details from token", userDetails);

      if (!userDetails) return;
      const { userId, email, role } = userDetails;
      req.user = {
        userId,
        email,
        role,
      };
      console.log("Passed middle ware test");
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

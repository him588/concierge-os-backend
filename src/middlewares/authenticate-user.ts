import { Request, Response, NextFunction } from "express";
import jsonwebtoken from "jsonwebtoken";
import { UserPayload } from "../types/type";

export function authenticateUser(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { headers } = req;
  const token = headers.authorization;
  console.log("is token available", token);
  if (token?.includes("Bearer")) {
    try {
      const userDetails = jsonwebtoken.verify(
        token.split(" ")[1],
        process.env.AccessTokenSecret || ""
      ) as UserPayload;
      console.log(userDetails);
      if (!userDetails) return;
      const { userId, email, name } = userDetails;
      console.log("user id", userId);
      req.user = {
        userId,
        email,
        name,
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

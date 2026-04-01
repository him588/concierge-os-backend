import { Request, Response, NextFunction } from "express";

export const isHotelOwner = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (user.role !== "owner") {
      return res.status(403).json({
        message: "Only hotel owners can add rooms",
      });
    }
    console.log("User is hotel owner, proceeding to next middleware");
    next();
  } catch (error) {
    next(error);
  }
};

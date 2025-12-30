import { NextFunction } from "express";

function verifyUser(req: Request, res: Response, next: NextFunction) {
  const header = req.headers;
  console.log(header);
  next();
}

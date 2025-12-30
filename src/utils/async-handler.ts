import { Request, Response, NextFunction } from "express";

type asyncFn = (req: Request, res: Response) => Promise<any>;

export const asyncHandler =
  (fn: asyncFn) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res)).catch(next);
  };

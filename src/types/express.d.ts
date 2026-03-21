export interface UserPayload {
  userId: string;
  role?: string;
  email: string;
  hotelId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

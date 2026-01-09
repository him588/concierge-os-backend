export interface UserPayload {
  userId: string;
  role?: string;
  email: string;
  hotelId?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

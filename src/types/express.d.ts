export interface UserPayload {
  userId: string;
  email: string;
  name: string;
  hotelId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

import jwt, { JwtPayload, Secret, SignOptions } from "jsonwebtoken";
import { UserPayload } from "../types/express";
import { PaymentPayload } from "../types/type";

class JWTProvider {
  private static ACCESS_SECRET = process.env.AccessTokenSecret!;
  private static REFRESH_SECRET = process.env.RefreshTokenSecret!;
  private static PAYMENT_SECRET = process.env.PaymentJwtSecret!;

  private static ACCESS_EXPIRES_IN = "15m" as const;
  private static REFRESH_EXPIRES_IN = "7d" as const;
  private static PAYMENT_EXPIRES_IN = "1h" as const;

  // Generate Access Token
  static generateAccessToken(
    payload: UserPayload,
    time?: "15m" | "1h" | "1d" | "15d",
  ): string {
    const options: SignOptions = {
      expiresIn: time || this.ACCESS_EXPIRES_IN,
    };
    return jwt.sign(payload, this.ACCESS_SECRET as Secret, options);
  }

  //  Generate Refresh Token
  static generateRefreshToken(payload: UserPayload): string {
    const options: SignOptions = {
      expiresIn: this.REFRESH_EXPIRES_IN,
    };
    return jwt.sign(payload, this.REFRESH_SECRET as Secret, options);
  }

  static generatePaymentToken(payload: PaymentPayload) {
    return jwt.sign(payload, this.PAYMENT_SECRET as Secret, {
      expiresIn: this.PAYMENT_EXPIRES_IN,
    });
  }

  //  Verify Access Token
  static verifyAccessToken(token: string): JwtPayload {
    return jwt.verify(token, this.ACCESS_SECRET) as JwtPayload;
  }

  static isTokenExpired(token: string): boolean {
    const decodedToken = jwt.decode(token);
    if (!decodedToken || typeof decodedToken === "string") return false;

    if (decodedToken.exp && Date.now() > decodedToken.exp * 1000) {
      return true;
    } else {
      return false;
    }
  }

  //  Verify Refresh Token
  static verifyRefreshToken(token: string): JwtPayload {
    return jwt.verify(token, this.REFRESH_SECRET) as JwtPayload;
  }

  static verifyPaymentToken(token: string): PaymentPayload {
    return jwt.verify(token, this.PAYMENT_SECRET) as PaymentPayload;
  }

  //  Decode token without verification (optional utility)
  static decodeToken(token: string): JwtPayload | null {
    return jwt.decode(token) as JwtPayload | null;
  }
}

export default JWTProvider;

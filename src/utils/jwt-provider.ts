import jwt, { JwtPayload, Secret, SignOptions } from "jsonwebtoken";
import { UserPayload } from "../types/express";

class JWTProvider {
  private static ACCESS_SECRET = process.env.AccessTokenSecret!;
  private static REFRESH_SECRET = process.env.RefreshTokenSecret!;

  private static ACCESS_EXPIRES_IN = "15m" as const;
  private static REFRESH_EXPIRES_IN = "7d" as const;

  // Generate Access Token
  static generateAccessToken(payload: UserPayload): string {
    const options: SignOptions = {
      expiresIn: this.ACCESS_EXPIRES_IN,
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

  //  Verify Access Token
  static verifyAccessToken(token: string): JwtPayload {
    return jwt.verify(token, this.ACCESS_SECRET) as JwtPayload;
  }

  //  Verify Refresh Token
  static verifyRefreshToken(token: string): JwtPayload {
    return jwt.verify(token, this.REFRESH_SECRET) as JwtPayload;
  }

  //  Decode token without verification (optional utility)
  static decodeToken(token: string): JwtPayload | null {
    return jwt.decode(token) as JwtPayload | null;
  }
}

export default JWTProvider;

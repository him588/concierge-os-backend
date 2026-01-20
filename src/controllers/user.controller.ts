import { Request, Response } from "express";
import { User } from "../models/user.model";
import bcrypt from "bcrypt";
import { generateOtp4 } from "../helper/helper";
import { sendOtpEmail } from "../utils/send-email";
import client from "../utils/redis-client";
import jwt from "jsonwebtoken";
import JWTProvider from "../utils/jwt-provider";
import { UserPayload } from "../types/express";
import { asyncHandler } from "../utils/async-handler";
import { Property } from "../models/property.model";

export async function RegisterUser(req: Request, res: Response) {
  const { name, email, password } = req.body;
  console.log("request", req.body);
  if (!name || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }
  const isUserExist = await User.findOne({ email, role: "owner" });
  if (isUserExist) {
    return res
      .status(409)
      .json({ message: "User already exist for this email" });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const newUser = new User({ name, email, passwordHash, role: "owner" });
  await newUser.save();
  const otp = generateOtp4();

  await client.set(`OTP${newUser._id}`, otp, {
    NX: true,
    EX: 300,
  });

  sendOtpEmail(
    "../templates",
    "otp.html",
    "hk93931212@gmail.com",
    email,
    name,
    name,
    otp[0],
    otp[1],
    otp[2],
    otp[3],
    "5",
  );
  return res
    .status(201)
    .json({ message: "user created successfully", otp, newUser });
}

export async function VerifyUser(req: Request, res: Response) {
  const { userId, otp, email } = req.body;
  console.log("all the otp", userId, otp, email);
  const isExist = await User.findById(userId);
  const dbOtp = await client.get(`OTP${userId}`);
  console.log("otp from db", dbOtp);
  if (!dbOtp) {
    return res.status(409).json({ message: "something went wrong" });
  }
  if (isExist) {
    if (dbOtp === otp) {
      const accessToken = JWTProvider.generateAccessToken({ userId, email });
      const refreshToken = JWTProvider.generateRefreshToken({ userId, email });

      await User.findByIdAndUpdate(userId, {
        $set: { isVerified: true, refreshToken },
        $unset: { expireAt: "" },
      });
      await client.del(`OTP${userId}`);

      return res.status(200).json({ accessToken, refreshToken });
    } else {
      return res.status(403).json({ message: "Wrong otp" });
    }
  } else {
    return res.status(404).json({ message: "user not found" });
  }
}

export async function LoginUser(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email, role: "owner" });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.isVerified || !user.passwordHash) {
      return res
        .status(403)
        .json({ message: "User not verified. Please verify your account." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid password" });
    }

    const accessToken = JWTProvider.generateAccessToken({
      userId: user._id as string,
      email,
      role: user.role,
    });

    const refreshToken = JWTProvider.generateRefreshToken({
      userId: user._id as string,
      email,
      role: user.role,
    });

    await User.findByIdAndUpdate(user._id, { $set: { refreshToken } });

    return res.status(200).json({
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function ResendOtp(req: Request, res: Response) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email, role: "owner" });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "User is already verified" });
    }

    const otp = generateOtp4();

    await client.set(`OTP${user._id}`, otp, {
      EX: 300, // expires in 5 minutes
    });

    // 6️⃣ Send OTP via email
    sendOtpEmail(
      "../templates",
      "otp.html",
      "hk93931212@gmail.com", // sender email (could be replaced by a constant)
      email,
      user.name,
      user.name,
      otp[0],
      otp[1],
      otp[2],
      otp[3],
      "5",
    );

    return res.status(200).json({
      message: "OTP resent successfully",
    });
  } catch (error) {
    console.error("ResendOtp error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function googleAuth(req: Request, res: Response) {
  try {
    const { code } = req.body;
    console.log(code);
    if (!code || typeof code !== "string") {
      return res.status(400).json({ error: "invalid google access token" });
    }

    // 🔹 Fetch Google user info
    const resp = await fetch(
      `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${encodeURIComponent(
        code,
      )}`,
    );

    if (!resp.ok) {
      return res.status(502).json({ error: "google fetch failed" });
    }

    const data = await resp.json();
    const email = data.email;
    const name = data.name || data.given_name || "User";

    if (!email) {
      return res.status(400).json({ error: "no email from google" });
    }

    let user = await User.findOne({ email, role: "owner" });

    if (!user) {
      user = await User.create({
        name,
        email,
        role: "owner",
        isVerified: true,
      });
    }

    console.log(user);
    const property = await Property.findOne({ ownedBy: user._id });

    console.log("property", property);

    const accessToken = JWTProvider.generateAccessToken({
      userId: user._id as string,
      role: user.role,
      email: email,
      hotelId: property ? (property._id as string) : null,
    });

    const refreshToken = JWTProvider.generateRefreshToken({
      userId: user._id as string,
      role: user.role as string,
      email: user.email as string,
      hotelId: property ? (property._id as string) : null,
    });

    user.refreshToken = refreshToken;
    await user.save();

    return res.status(user.isNew ? 201 : 200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        hotelId: property ? (property._id as string) : null,
      },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error("Google auth error:", err);
    return res.status(500).json({ error: "server error" });
  }
}

export async function refreshAccessToken(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body;
    console.log(refreshToken);
    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token is required" });
    }

    // 1️⃣ Verify refresh token
    jwt.verify(
      refreshToken,
      process.env.RefreshTokenSecret || "",
      async (err: any, decoded: any) => {
        if (err) {
          return res.status(401).json({ message: "Invalid refresh token" });
        }

        const { userId, email, role } = decoded;

        // 2️⃣ Check DB if this refresh token matches
        const user = await User.findById(userId);

        if (!user || user.refreshToken !== refreshToken) {
          return res.status(403).json({ message: "Token mismatch" });
        }
        const property = await Property.findOne({ ownedBy: user._id });

        // 3️⃣ Generate new Access Token
        const jwtPayload = {
          userId: user._id as string,
          role: user.role,
          email: user.email as string,
          hotelId: property ? (property._id as string) : null,
        };

        const accessToken = JWTProvider.generateAccessToken(jwtPayload);

        return res.status(200).json({
          message: "Token refreshed successfully",
          accessToken,
        });
      },
    );
  } catch (error) {
    console.error("Refresh token error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function userDetails(req: Request, res: Response) {
  const { userId } = req.user as UserPayload;
  const user = await User.findById(userId).select("-password");
  const property = await Property.findOne({ ownedBy: userId });
  const userDetails = {
    name: user?.name,
    email: user?.email,
    role: user?.role,
    userId: user?._id,
    hotelId: property ? property?._id : null,
  };
  return res.status(200).json({ user: userDetails });
}

export const getUserDetails = asyncHandler(userDetails);

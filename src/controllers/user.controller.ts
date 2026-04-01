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
import { registerWidgetUserSchema } from "../validators/widget.validator";
import { handleZodError } from "../utils/zod-handler";
import { WidgetUser } from "../models/widget-user.model";

export async function RegisterUser(req: Request, res: Response) {
  const { name, email, password } = req.body;
  console.log("request", req.body);
  if (!name || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }
  const isUserExist = await User.findOne({ email, role: "owner" });
  if (isUserExist) {
    return res.status(409).json({
      message: isUserExist.isVerified
        ? "User already exist for this email"
        : "Verify the user for this email",
    });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const otp = generateOtp4();

  const newUser = new User({ name, email, passwordHash, role: "owner", otp });
  await newUser.save();
  const userRes = {
    name: newUser.name,
    email: newUser.email,
    role: newUser.role,
    userId: newUser._id,
  };

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
    .json({ message: "user created successfully", otp, user: userRes });
}

export async function VerifyUser(req: Request, res: Response) {
  const { userId, otp } = req.body;
  if (!userId || !otp) {
    return res.status(400).json({
      status: false,
      message: "UserId and Otp is required for verify user",
    });
  }
  const isExist = await User.findById(userId);
  if (!isExist?.otp) {
    return res.status(409).json({ message: "something went wrong" });
  }
  if (isExist) {
    if (isExist.otp === +otp) {
      const accessToken = JWTProvider.generateAccessToken({
        userId,
        email: isExist.email!,
        hotelId: isExist.hotelId ? isExist.hotelId.toString() : "",
      });
      const refreshToken = JWTProvider.generateRefreshToken({
        userId,
        email: isExist.email!,
        hotelId: isExist.hotelId ? isExist.hotelId.toString() : "",
      });

      await User.findByIdAndUpdate(userId, {
        $set: { isVerified: true, refreshToken },
        $unset: { expireAt: "", otp: "" },
      });

      res.cookie("refreshToken", refreshToken, {
        secure: false,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: true,
      });

      return res.status(200).json({ accessToken });
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
      return res.status(401).json({ message: "Invalid Email or Password" });
    }

    const property = await Property.findOne({ ownedBy: user._id });

    const jwtPayload = {
      userId: user._id as string,
      role: user.role,
      email: user.email as string,
      hotelId: property ? (property._id as string) : "",
    };

    const accessToken = JWTProvider.generateAccessToken(jwtPayload);

    const refreshToken = JWTProvider.generateRefreshToken(jwtPayload);

    await User.findByIdAndUpdate(user._id, { $set: { refreshToken } });

    res.cookie("refreshToken", refreshToken, {
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: true,
    });

    return res.status(200).json({
      accessToken,
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
      hotelId: property ? (property._id as string) : "",
    });

    const refreshToken = JWTProvider.generateRefreshToken({
      userId: user._id as string,
      role: user.role as string,
      email: user.email as string,
      hotelId: property ? (property._id as string) : "",
    });

    user.refreshToken = refreshToken;
    await user.save();

    res.cookie("refreshToken", refreshToken, {
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: true,
    });

    return res.status(user.isNew ? 201 : 200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        hotelId: property ? (property._id as string) : null,
      },
      accessToken,
    });
  } catch (err) {
    console.error("Google auth error:", err);
    return res.status(500).json({ error: "server error" });
  }
}

export async function refreshAccessToken(req: Request, res: Response) {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token is required" });
    }
    if (JWTProvider.isTokenExpired(refreshToken)) {
      return res.status(401).json({ message: "Session Expired" });
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
        const property = await Property.findOne({ ownedBy: userId });

        // 3️⃣ Generate new Access Token
        const jwtPayload = {
          userId: user._id as string,
          role: user.role,
          email: user.email as string,
          hotelId: property ? (property._id as string) : "",
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
    propertyId: property ? property?._id : "",
    propertyName: property ? property?.name : "",
  };
  return res.status(200).json({ user: userDetails });
}

async function registerWidgetUser(req: Request, res: Response) {
  console.log("request", req.body);
  const { name, email, password } = req.body;

  console.log("password", password);

  const validatePayload = registerWidgetUserSchema.safeParse({
    name,
    email,
    password,
  });

  if (!validatePayload.success) {
    return res.status(400).json(handleZodError(validatePayload.error));
  }

  const isUserExist = await WidgetUser.findOne({ email });

  if (isUserExist) {
    return res.status(400).json({ message: "User already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const newUser = new WidgetUser({ name, email, password: passwordHash });

  const generatedToken = JWTProvider.generateAccessToken(
    {
      userId: newUser._id as string,
      email: newUser.email as string,
      role: "widget-user",
    },
    "15d",
  );
  await newUser.save();

  return res.status(201).json({
    success: true,
    message: "Widget user registered successfully",
    accessToken: generatedToken,
  });
}

async function loginWidgetUser(req: Request, res: Response) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const user = await WidgetUser.findOne({ email });

  if (!user) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  const generatedToken = JWTProvider.generateAccessToken(
    {
      userId: user._id as string,
      email: user.email as string,
      role: "widget-user",
    },
    "15d",
  );

  return res.status(200).json({
    success: true,
    message: "Widget user logged in successfully",
    accessToken: generatedToken,
  });
}

async function logoutWidgetUser(req: Request, res: Response) {
  return res.status(200).json({
    success: true,
    message: "Widget user logged out successfully",
  });
}

export const getUserDetails = asyncHandler(userDetails);
export const registerWidgetUserHandler = asyncHandler(registerWidgetUser);
export const loginWidgetUserHandler = asyncHandler(loginWidgetUser);
export const logoutWidgetUserHandler = asyncHandler(logoutWidgetUser);

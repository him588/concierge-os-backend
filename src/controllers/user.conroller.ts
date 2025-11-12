import { Request, Response } from "express";
import { User } from "../models/user.model";
import bcrypt from "bcrypt";
import { generateOtp4 } from "../helper/helper";
import { sendOtpEmail } from "../utils/send-email";
import client from "../utils/redis-client";
import jwt from "jsonwebtoken";

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
    "5"
  );
  return res
    .status(201)
    .json({ message: "user created successfully", otp, newUser });
}

export async function VerifyUser(req: Request, res: Response) {
  const { userId, otp, email } = req.body;
  console.log("all the otp", otp);
  const isExist = await User.findById(userId);
  const dbOtp = await client.get(`OTP${userId}`);
  console.log("otp from db", dbOtp);
  if (!dbOtp) {
    return res.status(409).json({ message: "something went wrong" });
  }
  if (isExist) {
    if (dbOtp === otp) {
      await User.findByIdAndUpdate(userId, {
        $set: { isVerified: true },
        $unset: { expireAt: "" },
      });
      await client.del(`OTP${userId}`);
      const accessToken = jwt.sign(
        { userId, email },
        process.env.AccessTokenSecret || "",
        { expiresIn: "5m" }
      );
      const refreshToken = jwt.sign(
        { userId, email },
        process.env.RefreshTokenSecret || "",
        { expiresIn: "1d" }
      );
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

    const accessToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.AccessTokenSecret || "",
      { expiresIn: "5m" }
    );

    const refreshToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.RefreshTokenSecret || "",
      { expiresIn: "1d" }
    );

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
      "5"
    );

    // 7️⃣ Send success response
    return res.status(200).json({
      message: "OTP resent successfully",
      otp, // ⚠️ remove this in production (only for testing)
    });
  } catch (error) {
    console.error("ResendOtp error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function googleAuth(req: Request, res: Response) {
  try {
    const { code } = req.body;
    if (!code || typeof code !== "string")
      return res.status(400).json({ error: "invalid code" });

    const resp = await fetch(
      `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${encodeURIComponent(
        code
      )}`
    );
    if (!resp.ok) return res.status(502).json({ error: "google fetch failed" });

    const data = await resp.json();
    const email = data.email;
    const name = data.name || data.given_name || "User";
    if (!email) return res.status(400).json({ error: "no email from google" });

    const user = await User.findOne({ email, role: "owner" });
    const userId = user?._id;

    if (!user) {
      const newUser = new User({
        name,
        email,
        role: "owner",
        isVerified: true,
      });
      newUser.save();
      const newUserId = newUser._id;
      const accessToken = jwt.sign(
        { newUserId, email },
        process.env.AccessTokenSecret || "",
        { expiresIn: "5m" }
      );
      const refreshToken = jwt.sign(
        { newUserId, email },
        process.env.RefreshTokenSecret || "",
        { expiresIn: "1d" }
      );

      return res.status(201).json({
        user: { id: newUserId, name, email },
        accessToken,
        refreshToken,
      });
    }

    const accessToken = jwt.sign(
      { userId, email },
      process.env.AccessTokenSecret || "",
      { expiresIn: "5m" }
    );
    const refreshToken = jwt.sign(
      { userId, email },
      process.env.RefreshTokenSecret || "",
      { expiresIn: "1d" }
    );

    return res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      refreshToken,
      accessToken,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
}

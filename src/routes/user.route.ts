import express from "express";
import {
  LoginUser,
  RegisterUser,
  ResendOtp,
  VerifyUser,
} from "../controllers/user.conroller";

const authRouter = express.Router();

authRouter.post("/signup", RegisterUser);
authRouter.post("/verify", VerifyUser);
authRouter.post("/login", LoginUser);
authRouter.post("/resen-otp", ResendOtp);

export default authRouter;

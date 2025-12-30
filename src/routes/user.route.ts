import express from "express";
import {
  googleAuth,
  LoginUser,
  refreshAccessToken,
  RegisterUser,
  ResendOtp,
  VerifyUser,
} from "../controllers/user.controller";

const authRouter = express.Router();

authRouter.post("/signup", RegisterUser);
authRouter.post("/verify", VerifyUser);
authRouter.post("/login", LoginUser);
authRouter.post("/resend-otp", ResendOtp);
authRouter.post("/google-auth", googleAuth);
authRouter.post("/refresh-accesstoken", refreshAccessToken);

export default authRouter;

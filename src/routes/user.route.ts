import express from "express";
import {
  googleAuth,
  LoginUser,
  refreshAccessToken,
  RegisterUser,
  ResendOtp,
  VerifyUser,
  getUserDetails,
  registerWidgetUserHandler,
  loginWidgetUserHandler,
  logoutWidgetUserHandler,
} from "../controllers/user.controller";
import { authenticateUser } from "../middlewares/authenticate-user";

const authRouter = express.Router();

authRouter.post("/signup", RegisterUser);
authRouter.post("/verify", VerifyUser);
authRouter.post("/login", LoginUser);
authRouter.post("/resend-otp", ResendOtp);
authRouter.post("/google-auth", googleAuth);
authRouter.post("/refresh-accesstoken", refreshAccessToken);
authRouter.get("/userDetails", authenticateUser, getUserDetails);
authRouter.post("/registerWidgetUser", registerWidgetUserHandler);
authRouter.post("/loginWidgetUser", loginWidgetUserHandler);
authRouter.post("/logoutWidgetUser", logoutWidgetUserHandler);

export default authRouter;

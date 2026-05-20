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
  getWidgetUserHandler,
} from "../controllers/user.controller";
import { authenticateUser } from "../middlewares/authenticate-user";
import { authenticateWidgetUser } from "../middlewares/widget-user";

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

authRouter.get("/widget-user", authenticateWidgetUser, getWidgetUserHandler);

export default authRouter;

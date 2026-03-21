import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import multer from "multer";

import authRouter from "./routes/user.route";
import { propertyRoute } from "./routes/property.routes";
import { authenticateUser } from "./middlewares/authenticate-user";
import { roomRoute } from "./routes/room.routes";
import { serviceRoute } from "./routes/service.routes";
import { serviceItemRoute } from "./routes/service-item.routes";
import { staffRoute } from "./routes/staff.routes";
import { staffServiceMappingRoute } from "./routes/staff-service-mapping.routes";
import { bookingRoute } from "./routes/booking.routes";
import { roomBookingRoute } from "./routes/room-booking.routes";
import { overviewRoute } from "./routes/overview.routes";

const app = express();

/* Middlewares */
app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
    credentials: true,
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(helmet());
app.use(morgan("dev"));
app.use(compression());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again later.",
});

const upload = multer();

app.use(limiter);

/* Routes */
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/property", propertyRoute);
app.use("/api/v1/room", authenticateUser, roomRoute);

// Dynamic Services & Staff Management Routes
app.use("/api/v1/services", serviceRoute);
app.use("/api/v1/service-items", serviceItemRoute);
app.use("/api/v1/staff", staffRoute);
app.use("/api/v1/staff-service-mappings", staffServiceMappingRoute);
app.use("/api/v1/bookings", bookingRoute);
app.use("/api/v1/room-bookings", roomBookingRoute);
app.use("/api/v1/overview", overviewRoute);

/* 404 Handler */
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found" });
});

/* Error Handler */
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Error:", err.message);
  res.status(500).json({
    message: "Internal Server Error",
    error: err.message,
  });
});

export default app;

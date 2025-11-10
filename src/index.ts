import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import authRouter from "./routes/user.route";
import { connectDb } from "./database/database";
import { connectRedis } from "./utils/redis-client";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
    credentials: true,
  })
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
app.use(limiter);

app.use("/api/v1/auth", authRouter);

app.use((req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Error:", err.stack);
  res
    .status(500)
    .json({ message: "Internal Server Error", error: err.message });
});

app.listen(port, async () => {
  await connectDb(process.env.MongodbURI || "");
  await connectRedis();
  console.log(`Server running on http://localhost:${port}`);
});

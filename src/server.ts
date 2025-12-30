import dotenv from "dotenv";
import app from "./app";
import { connectDb } from "./database/database";
import { connectRedis } from "./utils/redis-client";

dotenv.config();

const port = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDb(process.env.MongodbURI || "");
    // await connectRedis();

    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

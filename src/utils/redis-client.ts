// import { configDotenv } from "dotenv";
import { createClient } from "redis";

// configDotenv();
const client = createClient({
  username: "default",
  password: process.env.RedisPassword,
  socket: {
    host: "redis-13594.crce179.ap-south-1-1.ec2.redns.redis-cloud.com",
    port: 13594,
  },
});

client.on("error", (err) => {
  console.error("Redis Client Error:", err);
});

export const connectRedis = async () => {
  try {
    await client.connect();
    console.log("Redis connected successfully!");
  } catch (error) {
    console.error("Failed to connect Redis:", error);
    process.exit(1);
  }
};

export default client;

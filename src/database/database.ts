import mongoose from "mongoose";

export async function connectDb(url: string) {
  try {
    await mongoose.connect(url);
  } catch (error) {
    console.log("Error while connecting database", error);
  }
}

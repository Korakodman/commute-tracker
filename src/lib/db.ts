import mongoose from "mongoose";

export async function connectDB() {
  const MONGODB_URL = process.env.MONGODB_URL;

  if (!MONGODB_URL) {
    throw new Error("Please define MONGODB_URL in .env.local");
  }

  if (mongoose.connection.readyState === 1) {
    return;
  }

  await mongoose.connect(MONGODB_URL);
}
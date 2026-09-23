import mongoose from "mongoose";

const MONGODB_URL = process.env.MONGODB_URL

if(!MONGODB_URL){
    throw new Error("please define MONGODB_URL in .env.local")
}

export async function connectDB() {
    await mongoose.connect(MONGODB_URL)
}
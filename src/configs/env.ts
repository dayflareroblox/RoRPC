import dotenv from "dotenv";
dotenv.config();

export const ENV = {
  PORT: process.env.PORT || 3000,
  ROBLOX_API_KEY: process.env.ROBLOX_API_KEY!,
  UNIVERSE_ID: process.env.UNIVERSE_ID!,
};
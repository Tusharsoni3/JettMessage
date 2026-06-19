import jwt from "jsonwebtoken";
import generateTokenAndSetCookie from "../config/authConfig.js";
import bcrypt from "bcryptjs";
import {db} from "../db/index.js";
import { users } from "../db/schema.js";

export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies.jwt;
    if (!token) {
      return res.status(401).json({ message: "Unauthorized: No token provided" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.id) {
      return res.status(401).json({ message: "Unauthorized: Token is invalid" });
    }
    req.user = decoded;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
}


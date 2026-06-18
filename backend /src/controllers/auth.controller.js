//import { pg } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import bcrypt from "bcryptjs";
import generateTokenAndSetCookie from "../config/authConfig.js";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";

export const register = async (req, res) => {
  try {
    const { email, keyA, publicKey, encryptedBackupBundle } = req.body;
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existingUser) {
      return res.status(400).json({ message: "Email is already registered" });
    }
    const authHash = await bcrypt.hash(keyA, 10);

    const [newUser] = await db
      .insert(users)
      .values({
        email,
        password: authHash,
        publicKey,
        backupCiphertext: encryptedBackupBundle.ciphertext,
        backupIv: encryptedBackupBundle.iv,
      })
      .returning();
    generateTokenAndSetCookie(res, newUser._id);
    return res
      .status(201)
      .json({ message: "User registered successfully", userId: newUser.id });
  } catch (error) {
    console.error("register error:", error);
    return res
      .status(500)
      .json({ message: "Something went wrong while registering" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, keyA } = req.body;
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }
    const isPasswordValid = await bcrypt.compare(keyA, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid email or password" });
    }
    generateTokenAndSetCookie(res, user._id);
    return res.status(200).json({
      success: true,
      message: "Login successful",
      userId: user.id,
      encryptedBackupBundle: {
        ciphertext: user.backupCiphertext,
        iv: user.backupIv,
      },
    });
  } catch (error) {
    console.error("login error:", error);
    return res
      .status(500)
      .json({ message: "Something went wrong while logging in" });
  }
};

//import { pg } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import bcrypt from "bcryptjs";
import generateTokenAndSetCookie from "../config/authConfig.js";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";

const createDiceBearAvatarUrl = () => {
  const seed = randomUUID();
  return `https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=${encodeURIComponent(seed)}`;
};

export const register = async (req, res) => {
  try {
    const { name, email, keyA, publicKey, encryptedBackupBundle } = req.body;
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existingUser) {
      return res.status(400).json({ message: "Email is already registered" });
    }
    const authHash = await bcrypt.hash(keyA, 10);
    const avatarUrl = createDiceBearAvatarUrl();

    const [newUser] = await db
      .insert(users)
      .values({
        name,
        email,
        avatarUrl,
        password: authHash,
        publicKey,
        backupCiphertext: encryptedBackupBundle.ciphertext,
        backupIv: encryptedBackupBundle.iv,
      })
      .returning();
    generateTokenAndSetCookie(res, newUser.id);
    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        avatarUrl: newUser.avatarUrl,
        publicKey: newUser.publicKey,
      },
    });
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
    generateTokenAndSetCookie(res, user.id);
    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        publicKey: user.publicKey,
      },
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

export const getMe = async (req, res) => {
  try {
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
        publicKey: users.publicKey,
      })
      .from(users)
      .where(eq(users.id, req.user.id))
      .limit(1);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("getMe error:", error);
    return res
      .status(500)
      .json({ message: "Something went wrong while fetching user" });
  }
};

export const logout = async (req, res) => {
  try {
    res.clearCookie("jwt", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
    return res
      .status(200)
      .json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    console.error("logout error:", error);
    return res
      .status(500)
      .json({ message: "Something went wrong while logging out" });
  }
};

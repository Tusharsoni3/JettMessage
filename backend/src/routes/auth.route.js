import { authMiddleware } from "../middleware/auth.middleware.js";
import {
  register,
  login,
  logout,
  getMe,
} from "../controllers/auth.controller.js";
import {
  registerSchema,
  loginSchema,
  validate,
} from "../validator/validator.js";
import Router from "express";

const authRouter = Router();

authRouter.post("/register", validate(registerSchema), register);
authRouter.post("/login", validate(loginSchema), login);
authRouter.get("/me", authMiddleware, getMe);
authRouter.post("/logout", logout);

export default authRouter;

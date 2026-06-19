import Router from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { searchUsers } from "../controllers/user.controller.js";

const userRouter = Router();

userRouter.get("/search", authMiddleware, searchUsers);

export default userRouter;

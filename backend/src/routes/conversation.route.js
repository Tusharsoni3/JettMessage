import Router from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import {
  createOrGetConversation,
  listConversations,
} from "../controllers/conversation.controller.js";
import { conversationSchema, validate } from "../validator/validator.js";

const conversationRouter = Router();

conversationRouter.get("/", authMiddleware, listConversations);
conversationRouter.post(
  "/",
  authMiddleware,
  validate(conversationSchema),
  createOrGetConversation,
);

export default conversationRouter;

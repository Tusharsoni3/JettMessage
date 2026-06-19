import Router from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { createMessage, getMessages } from "../controllers/message.controller.js";
import { messageSchema, validate } from "../validator/validator.js";

const messageRouter = Router();

messageRouter.post("/", authMiddleware, validate(messageSchema), createMessage);
messageRouter.get("/:conversationId", authMiddleware, getMessages);

export default messageRouter;

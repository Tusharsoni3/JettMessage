import express from "express";
import { createServer } from "node:http";
import cors from "cors";
import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import authRouter from "./routes/auth.route.js";
import userRouter from "./routes/user.route.js";
import conversationRouter from "./routes/conversation.route.js";
import messageRouter from "./routes/message.route.js";
import cookieParser from "cookie-parser";
import { initSocket } from "./socket/index.js";

dotenv.config();
const port = process.env.PORT || 3000;

const app = express();
const server = createServer(app);
initSocket(server);

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  }),
);

app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/conversations", conversationRouter);
app.use("/api/messages", messageRouter);

server.listen(port, () => {
  console.log(`server is running at port ${port}`);
});

export default app;

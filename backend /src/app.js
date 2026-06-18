import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import  authRouter  from "./routes/auth.route.js";
import cookieParser from "cookie-parser";



dotenv.config();
const port = process.env.PORT || 3000;

const app = express();

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

app.listen(process.env.PORT, () => {
  console.log("server is running at port 3000");
});

export default app;

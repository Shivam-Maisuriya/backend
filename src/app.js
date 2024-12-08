import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: "16kb" }));// to enable json parsing
app.use(express.urlencoded({ extended: true, limit: "16kb" })); // to enable url encoded parsing
app.use(express.static("public")); // to serve static files from the public folder
app.use(cookieParser()); // to parse cookies

// routes import 
import userRouter from "./routes/user.routes.js"

// routes declaration 
app.use("/api/v1/users", userRouter)


export { app };

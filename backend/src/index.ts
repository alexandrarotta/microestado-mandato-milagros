import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import { register, login, logout } from "./routes/auth.js";
import { getConfig } from "./routes/config.js";
import { getSave, putSave } from "./routes/save.js";
import { postTelemetry } from "./routes/telemetry.js";
import { authMiddleware } from "./middleware/auth.js";
import { getMe, updateMe } from "./routes/me.js";
import { createCountry, getCountry } from "./routes/country.js";
import { continueToLevel2, resetGame, rescueGame } from "./routes/game.js";
import { getProfile, updateProfile } from "./routes/profile.js";
import { runElection } from "./routes/elections.js";
import {
  chooseLevel2Event,
  enactLevel2DecreeRoute,
  getLevel2Decrees,
  getLevel2Events
} from "./routes/level2.js";
import { buyTokens } from "./routes/tokens.js";

dotenv.config();

const app = express();

app.use(express.json({ limit: "2mb" }));
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
    credentials: true
  })
);

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false
});

app.post("/api/auth/register", authLimiter, register);
app.post("/api/auth/login", authLimiter, login);
app.post("/api/logout", logout);

app.get("/api/config", getConfig);

app.get("/api/save", authMiddleware, getSave);
app.put("/api/save", authMiddleware, putSave);
app.get("/api/me", authMiddleware, getMe);
app.put("/api/me", authMiddleware, updateMe);
app.get("/api/profile", authMiddleware, getProfile);
app.patch("/api/profile", authMiddleware, updateProfile);
app.get("/api/country", authMiddleware, getCountry);
app.post("/api/country", authMiddleware, createCountry);
app.post("/api/game/reset", authMiddleware, resetGame);
app.post("/api/game/rescue", authMiddleware, rescueGame);
app.post("/api/game/continue-to-level2", authMiddleware, continueToLevel2);
app.post("/api/elections/run", authMiddleware, runElection);
app.get("/api/level2/events", authMiddleware, getLevel2Events);
app.post("/api/level2/events/choose", authMiddleware, chooseLevel2Event);
app.get("/api/level2/decrees", authMiddleware, getLevel2Decrees);
app.post("/api/level2/decrees/enact", authMiddleware, enactLevel2DecreeRoute);
app.post("/api/tokens/buy", authMiddleware, buyTokens);

app.post("/api/telemetry", postTelemetry);

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});

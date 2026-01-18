import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import db from "../db.js";
import { loginSchema, registerSchema } from "../validation/schemas.js";

const SALT_ROUNDS = 12;

export function register(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input" });
  }

  const { email, password } = parsed.data;
  const existing = db
    .prepare("SELECT id FROM users WHERE email = ?")
    .get(email);
  if (existing) {
    return res.status(409).json({ error: "Email already registered" });
  }

  const passwordHash = bcrypt.hashSync(password, SALT_ROUNDS);
  const now = new Date().toISOString();
  const displayName = email.split("@")[0];

  const result = db
    .prepare(
      `
        INSERT INTO users (email, password_hash, display_name, created_at, updated_at, medals_json)
        VALUES (?, ?, ?, ?, ?, ?)
      `
    )
    .run(email, passwordHash, displayName, now, now, "[]");

  const userId = Number(result.lastInsertRowid);
  const token = jwt.sign(
    { userId },
    process.env.JWT_SECRET ?? "",
    { expiresIn: "7d" }
  );

  return res.json({ token });
}

export function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input" });
  }

  const { email, password } = parsed.data;
  const user = db
    .prepare("SELECT id, password_hash FROM users WHERE email = ?")
    .get(email) as { id: number; password_hash: string } | undefined;

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET ?? "", {
    expiresIn: "7d"
  });

  return res.json({ token });
}

export function logout(req: Request, res: Response) {
  return res.status(204).end();
}

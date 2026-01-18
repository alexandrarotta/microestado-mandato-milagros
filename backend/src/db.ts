import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import dotenv from "dotenv";

dotenv.config();

const dbPath = process.env.DB_PATH ?? "./data/app.db";
const resolvedPath = path.isAbsolute(dbPath)
  ? dbPath
  : path.join(process.cwd(), dbPath);

fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });

const db = new Database(resolvedPath);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS saves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    state_json TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    version TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS countries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    country_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS telemetry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    event_name TEXT NOT NULL,
    payload_json TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

const addUserColumn = (name: string, definition: string) => {
  try {
    db.prepare(`ALTER TABLE users ADD COLUMN ${name} ${definition}`).run();
  } catch {
    // Column already exists.
  }
};

const addCountryColumn = (name: string, definition: string) => {
  try {
    db.prepare(`ALTER TABLE countries ADD COLUMN ${name} ${definition}`).run();
  } catch {
    // Column already exists.
  }
};

addUserColumn("display_name", "TEXT");
addUserColumn("leader_name", "TEXT");
addUserColumn("pronouns", "TEXT");
addUserColumn("updated_at", "TEXT");
addUserColumn("medals_json", "TEXT");

addCountryColumn("tourism_index", "REAL");
addCountryColumn("tourism_capacity", "REAL");
addCountryColumn("tourism_pressure", "REAL");

try {
  db.prepare("UPDATE countries SET tourism_index = 20 WHERE tourism_index IS NULL").run();
  db.prepare(
    "UPDATE countries SET tourism_capacity = 20 WHERE tourism_capacity IS NULL"
  ).run();
  db.prepare(
    "UPDATE countries SET tourism_pressure = 5 WHERE tourism_pressure IS NULL"
  ).run();
  db.prepare("UPDATE users SET medals_json = '[]' WHERE medals_json IS NULL").run();
} catch {
  // Ignore if columns are missing during initial setup.
}

export default db;

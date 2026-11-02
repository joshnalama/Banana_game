// SQLite using Node's built-in driver: no database server and no native build.
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(path.join(dataDir, 'banana.db'));
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    email TEXT UNIQUE COLLATE NOCASE,
    password_hash TEXT,
    google_id TEXT UNIQUE,
    avatar TEXT NOT NULL DEFAULT '🧽',
    role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('player', 'admin')),
    is_guest INTEGER NOT NULL DEFAULT 0,
    score INTEGER NOT NULL DEFAULT 0,
    rounds_won INTEGER NOT NULL DEFAULT 0,
    rounds_lost INTEGER NOT NULL DEFAULT 0,
    streak INTEGER NOT NULL DEFAULT 0,
    best_streak INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  -- The solution stays here; it is never sent to the browser until a round is lost.
  CREATE TABLE IF NOT EXISTS rounds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    solution INTEGER NOT NULL,
    hmac_token TEXT,
    hints_used INTEGER NOT NULL DEFAULT 0,
    wrong_attempts INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','won','lost')),
    mode TEXT NOT NULL DEFAULT 'classic',
    started_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE INDEX IF NOT EXISTS idx_rounds_user ON rounds(user_id, status);
  CREATE INDEX IF NOT EXISTS idx_users_score ON users(score DESC);
`);

// Safe migrations for existing databases
try { db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'player'"); } catch {}
try { db.exec("ALTER TABLE users ADD COLUMN is_guest INTEGER NOT NULL DEFAULT 0"); } catch {}
try { db.exec("ALTER TABLE rounds ADD COLUMN hmac_token TEXT"); } catch {}

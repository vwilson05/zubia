import { Database } from "bun:sqlite";
import path from "path";

import fs from "fs";
// Use /data volume on Railway for persistence, local dir for dev
const DB_DIR = fs.existsSync("/data") ? "/data" : import.meta.dir;
const DB_PATH = path.join(DB_DIR, "zubia.db");
console.log(`[DB] Using database at: ${DB_PATH}`);

const db = new Database(DB_PATH, { create: true });

// Enable WAL mode for better concurrent read/write performance
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    commute_address TEXT,
    budget_min INTEGER,
    budget_max INTEGER,
    priorities TEXT DEFAULT '[]',
    bedrooms INTEGER,
    bathrooms INTEGER,
    pet_friendly INTEGER DEFAULT 0,
    parking TEXT,
    laundry TEXT,
    must_haves TEXT DEFAULT '[]',
    nice_to_haves TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS listings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    url TEXT,
    source TEXT DEFAULT 'other',
    address TEXT,
    city TEXT,
    neighborhood TEXT,
    price INTEGER,
    bedrooms INTEGER,
    bathrooms INTEGER,
    sqft INTEGER,
    photos TEXT DEFAULT '[]',
    description TEXT,
    pet_policy TEXT,
    parking TEXT,
    laundry TEXT,
    available_date TEXT,
    landlord_name TEXT,
    landlord_contact TEXT,
    raw_data TEXT DEFAULT '{}',
    score INTEGER,
    score_breakdown TEXT DEFAULT '{}',
    status TEXT DEFAULT 'saved' CHECK(status IN ('saved','applied','toured','rejected','leased')),
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    listing_id INTEGER REFERENCES listings(id),
    user_id INTEGER REFERENCES users(id),
    date_applied TEXT,
    docs_submitted TEXT DEFAULT '[]',
    status TEXT DEFAULT 'inquiry' CHECK(status IN ('inquiry','applied','docs_sent','approved','denied','withdrawn')),
    follow_up_date TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS neighborhood_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    listing_id INTEGER REFERENCES listings(id),
    address TEXT,
    commute_time TEXT,
    commute_distance TEXT,
    walk_score INTEGER,
    transit_score INTEGER,
    crime_summary TEXT,
    parks_nearby TEXT,
    grocery_nearby TEXT,
    schools_nearby TEXT,
    noise_level TEXT,
    ai_summary TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS comparisons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    name TEXT,
    listing_ids TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS email_signups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    source TEXT DEFAULT 'landing',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    token TEXT NOT NULL UNIQUE,
    created_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    listing_id INTEGER REFERENCES listings(id),
    title TEXT NOT NULL,
    description TEXT,
    due_date TEXT,
    priority TEXT DEFAULT 'medium' CHECK(priority IN ('low','medium','high')),
    status TEXT DEFAULT 'todo' CHECK(status IN ('todo','in_progress','done')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

// Migrate: add must_haves and nice_to_haves columns if they don't exist
try {
  db.exec("ALTER TABLE users ADD COLUMN must_haves TEXT DEFAULT '[]'");
} catch (e) {
  // Column already exists
}
try {
  db.exec("ALTER TABLE users ADD COLUMN nice_to_haves TEXT DEFAULT '[]'");
} catch (e) {
  // Column already exists
}
// Migrate: add password_hash column
try {
  db.exec("ALTER TABLE users ADD COLUMN password_hash TEXT");
} catch (e) {
  // Column already exists
}

export default db;

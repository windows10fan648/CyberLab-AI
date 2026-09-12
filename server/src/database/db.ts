import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { databasePath } from '../config.js';

fs.mkdirSync(path.dirname(databasePath), { recursive: true });
export const db = new DatabaseSync(databasePath);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

export function initializeDatabase() {
  db.exec(`CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY, title TEXT NOT NULL, mode TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL REFERENCES conversations(id), role TEXT NOT NULL, content TEXT NOT NULL, mode TEXT NOT NULL, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS lab_sessions (id TEXT PRIMARY KEY, name TEXT NOT NULL, template TEXT NOT NULL, duration_minutes INTEGER NOT NULL, network_mode TEXT NOT NULL, telemetry INTEGER NOT NULL, auto_revert INTEGER NOT NULL, state TEXT NOT NULL, created_at TEXT NOT NULL, started_at TEXT, ends_at TEXT, current_experiment TEXT, telemetry_status TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS experiments (id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES lab_sessions(id), artifact TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL, completed_at TEXT);
  CREATE TABLE IF NOT EXISTS telemetry (id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES lab_sessions(id), payload TEXT NOT NULL, captured_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS tool_invocations (id TEXT PRIMARY KEY, session_id TEXT, tool TEXT NOT NULL, parameters TEXT NOT NULL, result TEXT, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS generated_reports (id TEXT PRIMARY KEY, session_id TEXT, title TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT NOT NULL);`);
  const now = new Date().toISOString();
  if (!db.prepare('SELECT id FROM conversations WHERE id = ?').get('sample-conversation')) {
    db.prepare('INSERT INTO conversations VALUES (?, ?, ?, ?, ?)').run('sample-conversation', 'Welcome to CyberLab', 'normal', now, now);
    db.prepare('INSERT INTO messages VALUES (?, ?, ?, ?, ?, ?)').run('sample-message', 'sample-conversation', 'assistant', 'Welcome to CyberLab AI. I can help interpret defensive telemetry, create detection rules, and guide authorized lab work.', 'normal', now);
  }
}

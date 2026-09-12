import { initializeDatabase } from './db.js';
initializeDatabase();
console.log('Database initialized at', dbPath());

function dbPath() { return process.env.DATABASE_URL ?? './data/cyberlab.sqlite'; }

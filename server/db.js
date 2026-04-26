const { Pool } = require('pg');
const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config();

let db;
let isPostgres = false;

if (process.env.DATABASE_URL) {
  // Use PostgreSQL for Production
  db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  isPostgres = true;
  console.log('Using PostgreSQL database');
} else {
  // Use SQLite for Local Development
  db = new Database(path.join(__dirname, 'trackify.db'));
  isPostgres = false;
  console.log('Using SQLite database');
}

// Initialization Logic
const initDb = async () => {
  const schema = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_data (
      id SERIAL PRIMARY KEY,
      userId INTEGER REFERENCES users(id),
      dataType TEXT NOT NULL,
      content TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const sqliteSchema = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER REFERENCES users(id),
      dataType TEXT NOT NULL,
      content TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  if (isPostgres) {
    await db.query(schema);
  } else {
    db.exec(sqliteSchema);
  }
};

// Wrapper functions to handle both DB types
const query = async (text, params) => {
  if (isPostgres) {
    return db.query(text, params);
  } else {
    // Convert $1, $2 to ? for SQLite
    const sqliteText = text.replace(/\$(\d+)/g, '?');
    const stmt = db.prepare(sqliteText);
    if (text.trim().toLowerCase().startsWith('select')) {
      const rows = stmt.all(...params);
      return { rows };
    } else {
      const info = stmt.run(...params);
      return { rows: [], lastInsertRowid: info.lastInsertRowid };
    }
  }
};

module.exports = { query, initDb, isPostgres };

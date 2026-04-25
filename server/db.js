const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'trackify.db'));

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS user_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    dataType TEXT NOT NULL, -- 'semesters', 'subjects', 'attendance', 'marks', 'settings'
    content TEXT NOT NULL, -- JSON string
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id)
  );
`);

module.exports = db;
